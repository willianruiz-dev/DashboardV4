import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { transactionSchema, type DashboardTransaction } from "@/features/transactions/schemas";
import {
  extractDetailEntries,
  normalizeTransactionDetails,
  type NormalizedTransactionDetail,
} from "@/features/dispensing-control/detail-normalizer";
import { jamScanRequestSchema, type JamScanResponse } from "@/features/dispensing-control/schemas";
import { BackendApiError, requestBackend } from "@/lib/server/backend-client";
import { requireDashboardToken } from "@/lib/server/require-dashboard-token";
import { createApiRouteError } from "@/lib/server/route-error";
import { httpEnvelopeSchema } from "@/schemas/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * BFF de detección de atascos.
 *
 * Problema: el API legado no expone ningún evento de atasco ni un endpoint de
 * "detalle por rango de fechas"; el detalle se pide transacción por transacción
 * (`GET Transaction/{id}/Details`). Además, `GetByDate` devuelve el conjunto
 * completo sin paginación.
 *
 * Solución sin tocar el backend .NET:
 *  1. Se reutiliza `Transaction/GetByDate` (mismo DTO legado que el buscador).
 *  2. Se priorizan las transacciones con más valor probatorio: primero las de
 *     estado con error («Aprobada Error Devuelta», «Cancelada Error Devuelta»),
 *     después las aprobadas con devolución (`returnAmount > 0`) y por último las
 *     más recientes, hasta `maxTransactions`.
 *  3. Los detalles se piden con concurrencia acotada y caché en memoria por
 *     `id` de transacción: un detalle es inmutable, así que un análisis repetido
 *     del mismo período no vuelve a golpear el API.
 *
 * El payload devuelve solo lo que el motor de atascos necesita: estado, importes
 * y por denominación la operación y la cantidad. No se expone nada de sesión.
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

async function getTransactions(paypadId: number, from: string, to: string, token: string): Promise<DashboardTransaction[]> {
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

/** Ejecuta tareas asíncronas con un máximo de peticiones simultáneas. */
async function mapWithConcurrency<TItem, TResult>(
  items: readonly TItem[],
  concurrency: number,
  task: (item: TItem) => Promise<TResult>,
): Promise<TResult[]> {
  const results: TResult[] = [];
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item !== undefined) {
        results[index] = await task(item);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json().catch(() => undefined);
    const scanRequest = jamScanRequestSchema.parse(body);
    const token = await requireDashboardToken();
    const transactions = await getTransactions(scanRequest.paypadId, scanRequest.from, scanRequest.to, token);

    const ordered = [...transactions].sort((left, right) => {
      const priority = evidencePriority(left) - evidencePriority(right);
      return priority !== 0 ? priority : transactionTime(right) - transactionTime(left);
    });
    const selected = ordered.slice(0, scanRequest.maxTransactions);

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
        const result = await getTransactionDetails(transaction.id, token);
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

    // El orden final vuelve a ser cronológico descendente para que la ventana
    // analizada (`scannedFrom`/`scannedTo`) sea legible en la UI.
    scanned.sort((left, right) => new Date(right.dateCreated ?? 0).getTime() - new Date(left.dateCreated ?? 0).getTime());
    const times = scanned.map((transaction) => new Date(transaction.dateCreated ?? "").getTime()).filter((time) => !Number.isNaN(time));
    const response: JamScanResponse = {
      detailsFailures,
      detailsMalformed,
      detailsRequests,
      failureReasons: [...failureReasons],
      generatedAt: new Date().toISOString(),
      maxTransactions: scanRequest.maxTransactions,
      scannedFrom: times.length === 0 ? null : new Date(Math.min(...times)).toISOString(),
      scannedTo: times.length === 0 ? null : new Date(Math.max(...times)).toISOString(),
      transactions: scanned,
      truncated: ordered.length > selected.length,
    };

    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return createApiRouteError(error);
  }
}
