import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { RETURNED_ERROR_STATE } from "@/features/dispensing-control/dispensing-jams";
import {
  returnAlertsRequestSchema,
  type ReturnAlertMachine,
} from "@/features/dispensing-control/schemas";
import { getPaypadMachineName } from "@/features/paypads/paypad-display";
import { paypadSchema, type PayPad } from "@/features/paypads/schemas";
import { transactionSchema, type DashboardTransaction } from "@/features/transactions/schemas";
import { sumMoneyStringsLenient } from "@/lib/formatters/money";
import { mapWithConcurrency } from "@/lib/server/concurrency";
import { getPaypadCurrencyProfiles } from "@/lib/server/paypad-currencies";
import { BackendApiError, requestBackend } from "@/lib/server/backend-client";
import { requireDashboardToken } from "@/lib/server/require-dashboard-token";
import { createApiRouteError } from "@/lib/server/route-error";
import { httpEnvelopeSchema } from "@/schemas/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Alimenta la alerta del inicio: transacciones `Aprobada Error Devuelta` del día
 * actual, por máquina.
 *
 * No hay contrato realtime (ni WebSocket ni SignalR) en el backend legado, así que
 * el «tiempo real» se resuelve con sondeo del navegador. Para que el sondeo no
 * golpee el API legado una vez por usuario cada pocos segundos, aquí se resuelve
 * todo server-side con:
 *  1. Caché corta del listado de Pay+ (evita pedirlo en cada vuelta).
 *  2. Caché corta por máquina+rango (ventana de segundos): varios usuarios o varias
 *     vueltas seguidas reutilizan la misma respuesta.
 *  3. Concurrencia acotada contra el upstream.
 */

const CONCURRENCY = 5;
/** Vigencia de la respuesta por máquina: absorbe el sondeo repetido de varios usuarios. */
const MACHINE_CACHE_TTL_MS = 20_000;
/** Vigencia del listado de máquinas. */
const PAYPAD_CACHE_TTL_MS = 60_000;
/**
 * Tope de consultas de baúl por vuelta. La moneda se resuelve únicamente para máquinas con
 * errores (normalmente pocas); si un día hay más, el resto queda sin clasificar en lugar de
 * multiplicar las llamadas al API legado. El cacheo vive en `paypad-currencies.ts`, compartido
 * con la búsqueda de transacciones.
 */
const MAX_STORAGE_LOOKUPS = 10;

interface CacheEntry<TValue> {
  at: number;
  value: TValue;
}

let cachedPaypads: CacheEntry<PayPad[]> | null = null;
const machineCache = new Map<string, CacheEntry<ReturnAlertMachine>>();

function readCache<TValue>(
  cache: Map<string, CacheEntry<TValue>>,
  key: string,
  ttlMs: number,
): TValue | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.at > ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache<TValue>(cache: Map<string, CacheEntry<TValue>>, key: string, value: TValue): void {
  if (cache.size >= 200) {
    const oldest = cache.keys().next();
    if (!oldest.done) {
      cache.delete(oldest.value);
    }
  }
  cache.set(key, { at: Date.now(), value });
}

async function getPaypads(token: string): Promise<PayPad[]> {
  if (cachedPaypads && Date.now() - cachedPaypads.at <= PAYPAD_CACHE_TTL_MS) {
    return cachedPaypads.value;
  }

  try {
    const envelope = await requestBackend(["api", "PayPad"], httpEnvelopeSchema(z.array(paypadSchema)), { token });
    cachedPaypads = { at: Date.now(), value: envelope.response };
    return envelope.response;
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
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

function summarizeMachine(paypad: PayPad, transactions: readonly DashboardTransaction[]): ReturnAlertMachine {
  const errors = transactions.filter((transaction) => (transaction.stateTransaction ?? "").trim() === RETURNED_ERROR_STATE);
  const lastErrorAt = errors.reduce<string | null>((latest, transaction) => {
    const time = new Date(transaction.dateCreated ?? "").getTime();
    if (Number.isNaN(time)) {
      return latest;
    }
    if (latest === null) {
      return transaction.dateCreated ?? null;
    }
    return time > new Date(latest).getTime() ? (transaction.dateCreated ?? latest) : latest;
  }, null);

  const totals = sumMoneyStringsLenient(errors.map((transaction) => transaction.incomeAmount));

  return {
    approvedCount: transactions.filter((transaction) => (transaction.stateTransaction ?? "").trim() === "Aprobada").length,
    currencyLabels: [],
    errorCount: errors.length,
    errorTotal: totals.total,
    errorTotalIncomplete: totals.skipped > 0,
    errorTotalMixedCurrency: false,
    lastErrorAt,
    paypadId: paypad.id,
    paypadName: getPaypadMachineName(paypad) ?? `Pay+ ${paypad.id}`,
    transactions: transactions.length,
  };
}

async function getMachineAlert(paypad: PayPad, from: string, to: string, token: string): Promise<ReturnAlertMachine> {
  const cacheKey = `${paypad.id}|${from}|${to}`;
  const cached = readCache(machineCache, cacheKey, MACHINE_CACHE_TTL_MS);
  if (cached) {
    return cached;
  }

  const transactions = await getTransactions(paypad.id, from, to, token);
  const summary = summarizeMachine(paypad, transactions);
  writeCache(machineCache, cacheKey, summary);
  return summary;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json().catch(() => undefined);
    const query = returnAlertsRequestSchema.parse(body);
    const token = await requireDashboardToken();
    const paypads = await getPaypads(token);
    const selected = query.paypadId === null ? paypads : paypads.filter((paypad) => paypad.id === query.paypadId);

    let partialFailures = 0;
    const machines = await mapWithConcurrency(selected, CONCURRENCY, async (paypad) => {
      try {
        return await getMachineAlert(paypad, query.from, query.to, token);
      } catch {
        // Una máquina ilegible no debe ocultar las alertas de las demás.
        partialFailures += 1;
        return null;
      }
    });

    const alerts = machines
      .filter((machine): machine is ReturnAlertMachine => machine !== null)
      .sort((left, right) => {
        if (right.errorCount !== left.errorCount) {
          return right.errorCount - left.errorCount;
        }
        return new Date(right.lastErrorAt ?? 0).getTime() - new Date(left.lastErrorAt ?? 0).getTime();
      });

    // Moneda de cada máquina: sólo se consulta el baúl de las que acumularon errores, con
    // caché (el sondeo del inicio es cada 30 s). Sin esto, `errorTotal` podía sumar pesos y
    // dólares y presentarse como un importe comparable.
    const withErrors = alerts.filter((alert) => alert.errorCount > 0).slice(0, MAX_STORAGE_LOOKUPS);
    const errorPaypads = withErrors
      .map((alert) => paypads.find((entry) => entry.id === alert.paypadId))
      .filter((paypad): paypad is PayPad => paypad !== undefined);
    const currencyProfiles = await getPaypadCurrencyProfiles(errorPaypads, token, { maxLookups: MAX_STORAGE_LOOKUPS });
    const enriched = alerts.map((alert) => {
      const profile = currencyProfiles.get(alert.paypadId);
      return profile
        ? { ...alert, currencyLabels: profile.labels, errorTotalMixedCurrency: profile.mixed }
        : alert;
    });

    return NextResponse.json(
      {
        from: query.from,
        generatedAt: new Date().toISOString(),
        machines: enriched,
        partialFailures,
        to: query.to,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return createApiRouteError(error);
  }
}
