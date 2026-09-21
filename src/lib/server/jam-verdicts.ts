import "server-only";

import { z } from "zod";

import {
  computeJamDiagnostics,
  type JamDiagnostics,
  type JamIncident,
  type JamLevel,
} from "@/features/dispensing-control/dispensing-jams";
import { JAM_SCAN_MAX_TRANSACTIONS } from "@/features/dispensing-control/schemas";
import {
  loadSchema,
  paypadStorageSchema,
  tonnageSchema,
  type Load,
  type PayPadStorage,
  type Tonnage,
} from "@/features/paypads/schemas";
import { sumMoneyStrings } from "@/lib/formatters/money";
import { fetchJamScan } from "@/lib/server/jam-scan";
import { getDenominationCatalog } from "@/lib/server/paypad-currencies";
import type { DashboardTransaction, TransactionStateBucket } from "@/features/transactions/schemas";
import { BackendApiError, requestBackend } from "@/lib/server/backend-client";
import { httpEnvelopeSchema } from "@/schemas/http";

/**
 * Veredicto del inicio = **el mismo motor** que el panel de control de dispensado, ejecutado
 * server-side y cacheado por máquina.
 *
 * Motivo (reporte del operador): el panel decía «Posible atasco en la denominación 500 —
 * probable» y el inicio no lo mostraba. El inicio no puede pedir el detalle de cada pago en
 * cada vuelta del sondeo (30 s), así que en lugar de duplicar la regla se ejecuta el motor
 * real sobre datos que ya se consultan, con dos amortiguadores:
 *
 *  1. **Caché de veredicto por máquina + rango (10 min)**: la conclusión se reutiliza entre
 *     vueltas y pestañas.
 *  2. **Barrido de a una máquina**: el BFF del inicio registra las máquinas de la vuelta y
 *     este módulo analiza la siguiente sin veredicto fresco, en segundo plano y con un
 *     intervalo mínimo (`SWEEP_MIN_INTERVAL_MS`). Nunca bloquea la respuesta del inicio.
 *
 * Los detalles por transacción se comparten con el panel (`jam-scan.ts`, caché de 30 min), así
 * que abrir la máquina después del barrido no vuelve a golpear el API legado.
 */

/** Vigencia del veredicto de una máquina. */
export const JAM_VERDICT_TTL_MS = 10 * 60 * 1000;
/** Intervalo mínimo entre análisis del barrido (deja respirar al API legado). */
const SWEEP_MIN_INTERVAL_MS = 20_000;
/** Tope de detalles por máquina en el barrido (el mismo del panel). */
const SWEEP_MAX_TRANSACTIONS = JAM_SCAN_MAX_TRANSACTIONS;

/** Vigencias de los insumos del motor (los cargues cambian poco; el baúl y el arqueo, más). */
const LOAD_CACHE_TTL_MS = 5 * 60 * 1000;
const STORAGE_CACHE_TTL_MS = 60 * 1000;
const TONNAGE_CACHE_TTL_MS = 60 * 1000;

export interface JamVerdictIncident {
  denominationValue: string | null;
  detail: string;
  evidence: string[];
  level: JamLevel;
  title: string;
}

export interface JamVerdict {
  analyzedAt: string;
  analyzedTransactions: number;
  blind: boolean;
  headline: string;
  incidents: JamVerdictIncident[];
  /** Nivel del incidente principal (el módulo a revisar); `null` = sin incidentes. */
  level: JamLevel | null;
  payouts: number;
  truncated: boolean;
}

interface CacheEntry<TValue> {
  at: number;
  value: TValue;
}

const verdictCache = new Map<string, CacheEntry<JamVerdict>>();
const loadCache = new Map<number, CacheEntry<Load[]>>();
const storageCache = new Map<number, CacheEntry<PayPadStorage[]>>();
const tonnageCache = new Map<number, CacheEntry<Tonnage[]>>();

function cacheKey(paypadId: number, from: string, to: string): string {
  return `${paypadId}|${from}|${to}`;
}

function readCache<TValue>(cache: Map<number, CacheEntry<TValue>>, key: number, ttlMs: number): TValue | null {
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

function writeCache<TValue>(cache: Map<number, CacheEntry<TValue>>, key: number, value: TValue, limit: number): void {
  if (cache.size >= limit) {
    const oldest = cache.keys().next();
    if (!oldest.done) {
      cache.delete(oldest.value);
    }
  }
  cache.set(key, { at: Date.now(), value });
}

export function readJamVerdict(paypadId: number, from: string, to: string): JamVerdict | null {
  const entry = verdictCache.get(cacheKey(paypadId, from, to));
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.at > JAM_VERDICT_TTL_MS) {
    verdictCache.delete(cacheKey(paypadId, from, to));
    return null;
  }
  return entry.value;
}

async function getRows<TValue>(
  cache: Map<number, CacheEntry<TValue[]>>,
  paypadId: number,
  token: string,
  /** Segmentos del recurso SIN el id: `createServerUrl` codifica cada segmento por separado. */
  pathSegments: readonly string[],
  schema: z.ZodType<TValue[]>,
  ttlMs: number,
  limit: number,
): Promise<TValue[]> {
  const cached = readCache(cache, paypadId, ttlMs);
  if (cached) {
    return cached;
  }

  try {
    const envelope = await requestBackend([...pathSegments, String(paypadId)], httpEnvelopeSchema(schema.nullish()), { token });
    const rows = envelope.response ?? [];
    writeCache(cache, paypadId, rows, limit);
    return rows;
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      writeCache(cache, paypadId, [], limit);
      return [];
    }
    throw error;
  }
}

/**
 * Desglose por estado exacto desde las transacciones del día. El motor lo usa para el conteo e
 * importe de `Aprobada Error Devuelta` (misma cuenta que el buscador: `income − return`).
 */
function buildByState(transactions: readonly DashboardTransaction[]): Record<string, TransactionStateBucket> {
  const buckets = new Map<string, TransactionStateBucket>();
  for (const transaction of transactions) {
    const state = (transaction.stateTransaction ?? "").trim() || "Sin estado";
    const entry = buckets.get(state) ?? { count: 0, total: "0" };
    const net = sumMoneyStrings([transaction.incomeAmount, `-${transaction.returnAmount}`]);
    buckets.set(state, { count: entry.count + 1, total: sumMoneyStrings([entry.total, net]) });
  }
  return Object.fromEntries(buckets);
}

function compactIncident(incident: JamIncident): JamVerdictIncident {
  return {
    denominationValue: incident.denominationValue,
    detail: incident.detail,
    evidence: [...incident.evidence].slice(0, 3),
    level: incident.level,
    title: incident.title,
  };
}

function compactVerdict(diagnostics: JamDiagnostics): JamVerdict {
  const incidents = diagnostics.incidents.map(compactIncident);
  return {
    analyzedAt: new Date().toISOString(),
    analyzedTransactions: diagnostics.scanned.transactions,
    blind: diagnostics.blind,
    headline: diagnostics.headline,
    incidents,
    level: diagnostics.primary?.level ?? incidents[0]?.level ?? null,
    payouts: diagnostics.scanned.payoutsAnalyzed,
    truncated: diagnostics.scanned.truncated,
  };
}

export interface JamVerdictTarget {
  machineCurrencyLabel: string | null;
  paypadCurrencyId: number;
  paypadId: number;
  transactions: readonly DashboardTransaction[];
}

export interface RegisterJamSweepInput {
  from: string;
  targets: readonly JamVerdictTarget[];
  to: string;
  token: string;
}

interface SweepState {
  cursor: number;
  from: string;
  inFlight: boolean;
  lastFinishedAt: number;
  targets: JamVerdictTarget[];
  to: string;
  token: string | null;
}

const sweep: SweepState = {
  cursor: 0,
  from: "",
  inFlight: false,
  lastFinishedAt: 0,
  targets: [],
  to: "",
  token: null,
};

async function computeJamVerdict(target: JamVerdictTarget, from: string, to: string, token: string): Promise<JamVerdict> {
  const [scan, catalog, storage, tonnages, loads] = await Promise.all([
    fetchJamScan({
      from,
      maxTransactions: SWEEP_MAX_TRANSACTIONS,
      paypadId: target.paypadId,
      to,
      token,
      transactions: target.transactions,
    }),
    getDenominationCatalog(token),
    getRows(storageCache, target.paypadId, token, ["api", "PayPad", "GetStorage"], z.array(paypadStorageSchema), STORAGE_CACHE_TTL_MS, 200).catch(() => [] as PayPadStorage[]),
    getRows(tonnageCache, target.paypadId, token, ["api", "Tonnage", "GetByPaypad"], z.array(tonnageSchema), TONNAGE_CACHE_TTL_MS, 400).catch(() => [] as Tonnage[]),
    getRows(loadCache, target.paypadId, token, ["api", "Load", "GetByPaypad"], z.array(loadSchema), LOAD_CACHE_TTL_MS, 200).catch(() => [] as Load[]),
  ]);

  const diagnostics = computeJamDiagnostics({
    byState: buildByState(target.transactions),
    denominations: catalog,
    loads,
    machineCurrency: { id: target.paypadCurrencyId, label: target.machineCurrencyLabel },
    rangeFrom: from,
    rangeTo: to,
    scan,
    storage,
    tonnages,
  });

  return compactVerdict(diagnostics);
}

/**
 * Registra las máquinas de la vuelta del inicio y avanza el barrido **una** máquina en segundo
 * plano. No devuelve promesa: el inicio nunca espera el análisis.
 */
export function advanceJamSweep(input: RegisterJamSweepInput): void {
  sweep.targets = [...input.targets];
  sweep.from = input.from;
  sweep.to = input.to;
  sweep.token = input.token;
  if (sweep.cursor >= sweep.targets.length) {
    sweep.cursor = 0;
  }

  if (
    sweep.inFlight ||
    sweep.targets.length === 0 ||
    sweep.token === null ||
    Date.now() - sweep.lastFinishedAt < SWEEP_MIN_INTERVAL_MS
  ) {
    return;
  }

  // Siguiente máquina sin veredicto fresco (una máquina por vuelta registrada).
  let picked: JamVerdictTarget | null = null;
  for (let step = 0; step < sweep.targets.length; step += 1) {
    const index = (sweep.cursor + step) % sweep.targets.length;
    const candidate = sweep.targets[index] ?? null;
    if (candidate === null) {
      continue;
    }
    if (readJamVerdict(candidate.paypadId, sweep.from, sweep.to) === null) {
      picked = candidate;
      sweep.cursor = (index + 1) % sweep.targets.length;
      break;
    }
  }
  if (picked === null) {
    return;
  }

  const token = sweep.token;
  const { from, to } = sweep;
  sweep.inFlight = true;
  void (async () => {
    try {
      const verdict = await computeJamVerdict(picked, from, to, token);
      // Acotado: una entrada por máquina y rango; el barrido mantiene el rango del día.
      if (verdictCache.size >= 500 && !verdictCache.has(cacheKey(picked.paypadId, from, to))) {
        const oldest = verdictCache.keys().next();
        if (!oldest.done) {
          verdictCache.delete(oldest.value);
        }
      }
      verdictCache.set(cacheKey(picked.paypadId, from, to), { at: Date.now(), value: verdict });
    } catch {
      // El barrido es best-effort: una máquina ilegible no debe romper el inicio.
    } finally {
      sweep.inFlight = false;
      sweep.lastFinishedAt = Date.now();
    }
  })();
}
