import "server-only";

import { z } from "zod";

import {
  computeJamEarlyWarnings,
  type JamEarlyWarningLoad,
  type JamEarlyWarningScreen,
  type JamEarlyWarningStorageRow,
  type JamEarlyWarningTonnage,
} from "@/features/dispensing-control/jam-early-warning";
import { loadHistoryEnvelopeSchema, paypadStorageSchema, tonnageHistoryEnvelopeSchema } from "@/features/paypads/schemas";
import type { DashboardTransaction } from "@/features/transactions/schemas";
import { BackendApiError, requestBackend } from "@/lib/server/backend-client";
import { getDenominationCatalog } from "@/lib/server/paypad-currencies";
import { httpEnvelopeSchema } from "@/schemas/http";

/**
 * Datos del semáforo de atascos del inicio (ver `jam-early-warning.ts`).
 *
 * Coste acotado a propósito, porque el inicio sondea cada 30 s:
 *  - Arqueos (`Tonnage/GetByPaypad`): una petición por máquina **con pagos** y por minuto
 *    (caché de 60 s), con un tope por vuelta.
 *  - Baúl (`PayPad/GetStorage`): sólo para las máquinas que ya dieron sospecha, también
 *    cacheado y con su propio tope.
 *  - Catálogo de denominaciones: compartido y cacheado 10 min; resuelve la moneda de cada
 *    denominación para no comparar importes de monedas distintas (máquinas de cambio divisa).
 *
 * Nada de esto sustituye al análisis completo del control de dispensado: aquí no se pide el
 * detalle de cada transacción (sería una petición por pago en cada vuelta del sondeo).
 */

/** Vigencia de los arqueos consultados por el semáforo. */
const TONNAGE_CACHE_TTL_MS = 60_000;
/** Vigencia del baúl consultado sólo para máquinas sospechosas. */
const STORAGE_CACHE_TTL_MS = 60_000;
/** Vigencia de los cargues (cambian poco: 5 min, igual que en el veredicto del motor). */
const LOAD_CACHE_TTL_MS = 5 * 60 * 1000;
/** Tope de consultas de arqueo por vuelta del sondeo. */
export const MAX_JAM_SCREEN_LOOKUPS = 12;
/** Tope de consultas de baúl (enriquecimiento) por vuelta del sondeo. */
const MAX_JAM_STORAGE_LOOKUPS = 4;
/**
 * Tope de consultas de CARGUES por vuelta. Sólo se piden para máquinas que ya dieron sospecha:
 * sin los cargues, una máquina recargada entre dos arqueos parece «no haber bajado» y genera un
 * falso positivo (caso real reportado: «esa máquina fue cargada hace poco»).
 */
const MAX_JAM_LOAD_LOOKUPS = 4;

interface CacheEntry<TValue> {
  at: number;
  value: TValue;
}

const tonnageCache = new Map<number, CacheEntry<JamEarlyWarningTonnage[]>>();
const loadCache = new Map<number, CacheEntry<JamEarlyWarningLoad[]>>();
const storageCache = new Map<number, CacheEntry<JamEarlyWarningStorageRow[]>>();

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

async function getTonnages(paypadId: number, token: string): Promise<JamEarlyWarningTonnage[]> {
  const cached = readCache(tonnageCache, paypadId, TONNAGE_CACHE_TTL_MS);
  if (cached) {
    return cached;
  }

  try {
    const envelope = await requestBackend(
      ["api", "Tonnage", "GetByPaypad", String(paypadId)],
      tonnageHistoryEnvelopeSchema,
      { token },
    );
    const tonnages: JamEarlyWarningTonnage[] = envelope.response.map((tonnage) => ({
      dateCreated: tonnage.dateCreated ?? null,
      details: tonnage.details.map((detail) => ({
        denominationValue: detail.denominationValue,
        idCurrencyDenomination: detail.idCurrencyDenomination,
        quantityDp: detail.quantityDp,
      })),
    }));
    writeCache(tonnageCache, paypadId, tonnages, 400);
    return tonnages;
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      writeCache(tonnageCache, paypadId, [], 400);
      return [];
    }
    throw error;
  }
}

async function getStorageRows(paypadId: number, token: string): Promise<JamEarlyWarningStorageRow[]> {
  const cached = readCache(storageCache, paypadId, STORAGE_CACHE_TTL_MS);
  if (cached) {
    return cached;
  }

  try {
    const envelope = await requestBackend(
      ["api", "PayPad", "GetStorage", String(paypadId)],
      httpEnvelopeSchema(z.array(paypadStorageSchema).nullish()),
      { token },
    );
    const rows: JamEarlyWarningStorageRow[] = (envelope.response ?? []).map((entry) => ({
      denominationValue: entry.denominationValue,
      dpStored: entry.dpStored,
      idCurrencyDenomination: entry.idCurrencyDenomination,
      isDispensing: entry.isDispensing,
    }));
    writeCache(storageCache, paypadId, rows, 200);
    return rows;
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      writeCache(storageCache, paypadId, [], 200);
      return [];
    }
    throw error;
  }
}

/**
 * Cargues de la máquina (`Load/GetByPaypad`), cacheados 5 min. Se piden SÓLO cuando el semáforo
 * ya dio sospecha: son la diferencia entre «no bajó porque no entregó» y «no bajó porque se
 * recargó», que es exactamente el falso positivo reportado.
 */
async function getLoads(paypadId: number, token: string): Promise<JamEarlyWarningLoad[]> {
  const cached = readCache(loadCache, paypadId, LOAD_CACHE_TTL_MS);
  if (cached) {
    return cached;
  }

  try {
    const envelope = await requestBackend(
      ["api", "Load", "GetByPaypad", String(paypadId)],
      loadHistoryEnvelopeSchema,
      { token },
    );
    const loads: JamEarlyWarningLoad[] = envelope.response.map((load) => ({
      dateCreated: load.dateCreated ?? null,
      details: load.details.map((detail) => ({ denominationValue: detail.denominationValue, quantity: detail.quantity })),
    }));
    writeCache(loadCache, paypadId, loads, 200);
    return loads;
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      writeCache(loadCache, paypadId, [], 200);
      return [];
    }
    throw error;
  }
}

export interface JamScreenBudget {
  remainingLoadLookups: number;
  remainingStorageLookups: number;
  remainingTonnageLookups: number;
}

export function createJamScreenBudget(): JamScreenBudget {
  return {
    remainingLoadLookups: MAX_JAM_LOAD_LOOKUPS,
    remainingStorageLookups: MAX_JAM_STORAGE_LOOKUPS,
    remainingTonnageLookups: MAX_JAM_SCREEN_LOOKUPS,
  };
}

/** ¿La máquina usa más de una moneda? Entonces los importes no son comparables entre sí. */
async function usesMultipleCurrencies(
  paypadCurrencyId: number,
  tonnages: readonly JamEarlyWarningTonnage[],
  token: string,
): Promise<boolean> {
  const catalog = await getDenominationCatalog(token);
  if (catalog.length === 0) {
    return false;
  }
  const currencyById = new Map(catalog.map((entry) => [entry.id, entry.idCurrency]));
  const used = new Set<number>();
  for (const tonnage of tonnages) {
    for (const detail of tonnage.details) {
      const currencyId =
        detail.idCurrencyDenomination === null ? undefined : currencyById.get(detail.idCurrencyDenomination);
      if (currencyId !== undefined) {
        used.add(currencyId);
      }
    }
  }
  return used.size > 1 || (used.size === 1 && !used.has(paypadCurrencyId));
}

export interface ScreenMachineJamsInput {
  budget: JamScreenBudget;
  from: string;
  paypadCurrencyId: number;
  paypadId: number;
  to: string;
  token: string;
  transactions: readonly DashboardTransaction[];
}

/**
 * Semáforo de la máquina. Devuelve `null` cuando no se evaluó (sin pagos con devolución, sin
 * arqueos, tope de consultas alcanzado o error del upstream): el inicio no debe inventar una
 * alerta ni tampoco caerse porque una máquina no responda.
 */
export async function screenMachineJams(input: ScreenMachineJamsInput): Promise<JamEarlyWarningScreen | null> {
  const hasPayout = input.transactions.some(
    (transaction) => Number.parseFloat(transaction.returnAmount) > 0,
  );
  if (!hasPayout || input.budget.remainingTonnageLookups <= 0) {
    return null;
  }

  let tonnages: JamEarlyWarningTonnage[];
  try {
    input.budget.remainingTonnageLookups -= 1;
    tonnages = await getTonnages(input.paypadId, input.token);
  } catch {
    return null;
  }
  if (tonnages.length === 0) {
    return null;
  }

  if (await usesMultipleCurrencies(input.paypadCurrencyId, tonnages, input.token)) {
    return {
      arqueoFrom: null,
      arqueoTo: null,
      loadsKnown: true,
      note: "La máquina opera más de una moneda: los importes del día no son atribuibles a una sola denominación.",
      payouts: 0,
      suppressedByMissingLoads: [],
      warnings: [],
    };
  }

  const base = {
    from: input.from,
    to: input.to,
    tonnages,
    transactions: input.transactions.map((transaction) => ({
      dateCreated: transaction.dateCreated ?? null,
      returnAmount: transaction.returnAmount,
      stateTransaction: transaction.stateTransaction ?? null,
    })),
  };

  // Primera pasada sin baúl ni cargues (una petición menos). Sólo si hay sospecha se consultan
  // los cargues —para descontar lo cargado del movimiento del arqueo— y el baúl (saldo real y si
  // la configuración marca «No dispensa»).
  let screen: JamEarlyWarningScreen;
  try {
    // Sin cargues (`loads: null`) el cálculo no acusa a los módulos que crecieron o se mantuvieron
    // en el arqueo: se usa sólo para decidir si vale la pena pedir los cargues.
    screen = computeJamEarlyWarnings({ ...base, loads: null, storage: null });
  } catch {
    return null;
  }
  if (screen.warnings.length === 0 && screen.suppressedByMissingLoads.length === 0) {
    return screen;
  }

  // Los cargues pueden tumbar la sospecha (la máquina se recargó), así que se piden incluso
  // cuando la primera pasada no llegó a concluir por no poder descartarlos.
  let loads: JamEarlyWarningLoad[] | null = null;
  if (input.budget.remainingLoadLookups > 0) {
    try {
      input.budget.remainingLoadLookups -= 1;
      loads = await getLoads(input.paypadId, input.token);
    } catch {
      loads = null;
    }
  }

  if (input.budget.remainingStorageLookups <= 0) {
    return loads === null ? screen : computeJamEarlyWarnings({ ...base, loads, storage: null });
  }

  try {
    input.budget.remainingStorageLookups -= 1;
    const storage = await getStorageRows(input.paypadId, input.token);
    return computeJamEarlyWarnings({ ...base, loads, storage });
  } catch {
    return loads === null ? screen : computeJamEarlyWarnings({ ...base, loads, storage: null });
  }
}
