import "server-only";

import { z } from "zod";

import {
  extractDetailEntries,
  normalizeTransactionDetails,
  type NormalizedTransactionDetail,
} from "@/features/dispensing-control/detail-normalizer";
import type { JamScanResponse } from "@/features/dispensing-control/schemas";
import { transactionSchema, type DashboardTransaction } from "@/features/transactions/schemas";
import { BackendApiError, requestBackend } from "@/lib/server/backend-client";
import { mapWithConcurrency } from "@/lib/server/concurrency";
import { httpEnvelopeSchema } from "@/schemas/http";

/**
 * Lectura acotada de transacciones + detalle por transacción, compartida por:
 *
 *  - el BFF de atascos (`/api/dispensing/jams`), que la sirve al panel;
 *  - el veredicto del inicio (`jam-verdicts.ts`), que corre el mismo motor server-side.
 *
 * El detalle se pide transacción por transacción (`GET Transaction/{id}/Details`), así que se
 * priorizan las transacciones con más valor probatorio (error devuelta → aprobada con devolución
 * → recientes), se limita la concurrencia y se cachea por `id` — un detalle es inmutable.
 */

const DETAIL_CONCURRENCY = 5;
const DETAIL_CACHE_LIMIT = 600;
const DETAIL_CACHE_TTL_MS = 30 * 60 * 1000;

type JamRouteDetail = NormalizedTransactionDetail;

interface CacheEntry {
  at: number;
  details: JamRouteDetail[];
}

/** Caché best-effort en memoria del proceso del BFF (no persistente, sin datos de sesión). */
const detailCache = new Map<number, CacheEntry>();

function readCache(id: number): JamRouteDetail[] | null {
  const entry = detailCache.get(id);
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.at > DETAIL_CACHE_TTL_MS) {
    detailCache.delete(id);
    return null;
  }

  return entry.details;
}

function writeCache(id: number, details: JamRouteDetail[]): void {
  if (detailCache.size >= DETAIL_CACHE_LIMIT) {
    const oldest = detailCache.keys().next();
    if (!oldest.done) {
      detailCache.delete(oldest.value);
    }
  }

  detailCache.set(id, { at: Date.now(), details });
}

interface DetailsResult {
  details: JamRouteDetail[];
  malformed: number;
}

async function getTransactionDetails(transactionId: number, token: string): Promise<DetailsResult> {
  const cached = readCache(transactionId);
  if (cached) {
    return { details: cached, malformed: 0 };
  }

  try {
    const payload: unknown = await requestBackend(["api", "Transaction", String(transactionId), "Details"], z.unknown(), { token });
    const normalized = normalizeTransactionDetails(extractDetailEntries(payload));
    writeCache(transactionId, normalized.details);
    return normalized;
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      // El legacy devuelve 404 cuando la transacción no tiene detalles.
      writeCache(transactionId, []);
      return { details: [], malformed: 0 };
    }
    throw error;
  }
}

/** Motivo sanitizado de un fallo (sin valores financieros, acotado y deduplicado). */
function describeFailure(error: unknown): string {
  if (error instanceof BackendApiError) {
    return `${error.status} · ${error.message}`.replace(/\s+/gu, " ").slice(0, 140);
  }

  if (error instanceof Error) {
    return error.message.replace(/\s+/gu, " ").slice(0, 140);
  }

  return "Error desconocido al consultar el detalle.";
}

export async function getPaypadTransactions(paypadId: number, from: string, to: string, token: string): Promise<DashboardTransaction[]> {
  try {
    const envelope = await requestBackend(["api", "Transaction", "GetByDate"], httpEnvelopeSchema(z.array(transactionSchema)), {
      body: JSON.stringify({ from, id: paypadId, to }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      token,
    });
    return envelope.response;
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

/** Prioridad probatoria: error devuelta → aprobada con devolución → resto (recientes primero). */
function evidencePriority(transaction: DashboardTransaction): number {
  const state = transaction.stateTransaction?.trim() ?? "";
  if (/error/i.test(state)) {
    return 0;
  }

  if (Number.parseInt(transaction.returnAmount, 10) > 0) {
    return 1;
  }

  return 2;
}

function transactionTime(transaction: DashboardTransaction): number {
  const time = new Date(transaction.dateCreated ?? "").getTime();
  return Number.isNaN(time) ? 0 : time;
}

export interface FetchJamScanInput {
  from: string;
  maxTransactions: number;
  paypadId: number;
  to: string;
  token: string;
  /** Transacciones del rango ya consultadas: evita repetir `GetByDate` cuando ya se tienen. */
  transactions?: readonly DashboardTransaction[] | null;
}

/** Payload que consume el motor de atascos (misma forma que el contrato del BFF de atascos). */
export async function fetchJamScan(input: FetchJamScanInput): Promise<JamScanResponse> {
  const transactions =
    input.transactions ?? (await getPaypadTransactions(input.paypadId, input.from, input.to, input.token));

  const ordered = [...transactions].sort((left, right) => {
    const priority = evidencePriority(left) - evidencePriority(right);
    return priority !== 0 ? priority : transactionTime(right) - transactionTime(left);
  });
  const selected = ordered.slice(0, input.maxTransactions);

  let detailsFailures = 0;
  let detailsMalformed = 0;
  let detailsRequests = 0;
  const failureReasons = new Set<string>();
  const scanned = await mapWithConcurrency(selected, DETAIL_CONCURRENCY, async (transaction) => {
    let details: JamRouteDetail[] = [];
    if (readCache(transaction.id) === null) {
      detailsRequests += 1;
    }
    try {
      const result = await getTransactionDetails(transaction.id, input.token);
      details = result.details;
      detailsMalformed += result.malformed;
    } catch (error) {
      // Un detalle ilegible no debe tumbar el diagnóstico: se marca, se registra
      // el motivo sanitizado y se continúa.
      detailsFailures += 1;
      if (failureReasons.size < 3) {
        failureReasons.add(describeFailure(error));
      }
    }

    return {
      dateCreated: transaction.dateCreated ?? null,
      details,
      id: transaction.id,
      incomeAmount: transaction.incomeAmount,
      realAmount: transaction.realAmount,
      returnAmount: transaction.returnAmount,
      stateTransaction: transaction.stateTransaction ?? "",
      totalAmount: transaction.totalAmount,
    };
  });

  // El orden final vuelve a ser cronológico descendente para que la ventana analizada
  // (`scannedFrom`/`scannedTo`) sea legible en la UI.
  scanned.sort((left, right) => new Date(right.dateCreated ?? 0).getTime() - new Date(left.dateCreated ?? 0).getTime());
  const times = scanned.map((transaction) => new Date(transaction.dateCreated ?? "").getTime()).filter((time) => !Number.isNaN(time));

  return {
    detailsFailures,
    detailsMalformed,
    detailsRequests,
    failureReasons: [...failureReasons],
    generatedAt: new Date().toISOString(),
    maxTransactions: input.maxTransactions,
    scannedFrom: times.length === 0 ? null : new Date(Math.min(...times)).toISOString(),
    scannedTo: times.length === 0 ? null : new Date(Math.max(...times)).toISOString(),
    transactions: scanned,
    truncated: selected.length < transactions.length,
  };
}
