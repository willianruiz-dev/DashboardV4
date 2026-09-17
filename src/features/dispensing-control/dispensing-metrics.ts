import type { Load, PayPadStorage, Tonnage } from "@/features/paypads/schemas";
import type { TransactionStateBucket } from "@/features/transactions/schemas";

/**
 * Cálculo puro de métricas de dispensado (AP/DP/RJ) para un Pay+ y un período.
 * Fuentes (todas endpoints existentes, ver docs/DISPENSING_CONTROL_FEASIBILITY.md):
 * - byState (BFF transacciones, período): lo que el SISTEMA registró.
 * - Último arqueo (tonnage): lo FÍSICO auditado (AP/DP/RJ por denominación).
 * - Storage (inventario del sistema): saldos actuales de los baúles + umbral.
 * - Cargues (loads): último cargue y cantidades cargadas en el período.
 */

export const APPROVED_STATE = "Aprobada";
export const RETURNED_ERROR_STATE = "Aprobada Error Devuelta";
export const CANCELLED_STATE = "Cancelada";

/** Tolerancia del arqueo legacy: el backend alertaba con DpStored <= MinDpQuantity + 10. */
export const LOW_BALANCE_TOLERANCE = 10;

export interface DispensingMetricsInput {
  /** Desglose por estado exacto del período (BFF). Puede ser {} si la búsqueda aún no responde. */
  byState: Readonly<Record<string, TransactionStateBucket>>;
  lastTonnage: Tonnage | null;
  loads: readonly Load[];
  now: Date;
  rangeFrom: Date;
  rangeTo: Date;
  storage: readonly PayPadStorage[];
}

export interface DispensingDenominationRow {
  balance: number;
  balanceValue: string;
  denominationId: number;
  denominationValue: string;
  delivered: number;
  isDispensing: boolean;
  loadedInRange: number;
  low: boolean;
  minDpQuantity: number;
  rejected: number;
}

export interface DispensingMetrics {
  ap: { count: number; total: string };
  apPhysical: { at: string | null; total: string | null };
  cancelled: { count: number; total: string };
  dp: { at: string | null; storageTotal: string; total: string | null };
  lastLoad: { at: string | null; elapsedMs: number | null; total: string | null };
  rj: { count: number; physicalTotal: string | null; total: string };
  rows: DispensingDenominationRow[];
}

function toInt(value: string | number | null | undefined, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : fallback;
  }

  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toMillis(value: string | null | undefined): number {
  if (!value) {
    return Number.NaN;
  }

  const time = new Date(value).getTime();
  return time;
}

function sumDecimalStrings(values: readonly string[]): string {
  let cents = 0n;
  let anyParsed = false;

  for (const value of values) {
    const match = /^(\d+)(?:\.(\d+))?$/u.exec(value.trim());
    if (!match) {
      continue;
    }
    anyParsed = true;
    const fraction = (match[2] ?? "").slice(0, 2).padEnd(2, "0");
    cents += BigInt(match[1] ?? "0") * 100n + BigInt(fraction);
  }

  if (!anyParsed) {
    return "0";
  }

  const integer = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, "0");
  return fraction === "00" ? integer.toString() : `${integer}.${fraction}`;
}

function latestBy<T>(items: readonly T[], key: (item: T) => number): T | null {
  let best: T | null = null;
  let bestKey = Number.NEGATIVE_INFINITY;

  for (const item of items) {
    const value = key(item);
    if (!Number.isNaN(value) && value > bestKey) {
      best = item;
      bestKey = value;
    }
  }

  return best;
}

function detailQuantity(
  details: readonly { idCurrencyDenomination: number | null; quantity: string }[],
  denominationId: number,
): number {
  let total = 0;
  for (const detail of details) {
    if (detail.idCurrencyDenomination === denominationId) {
      total += toInt(detail.quantity);
    }
  }
  return total;
}

function tonnageDetailQuantity(
  tonnage: Tonnage | null,
  denominationId: number,
  pick: (detail: Tonnage["details"][number]) => string,
): number | null {
  if (!tonnage) {
    return null;
  }

  const detail = tonnage.details.find((item) => item.idCurrencyDenomination === denominationId);
  return detail ? toInt(pick(detail)) : null;
}

export function computeDispensingMetrics(input: DispensingMetricsInput): DispensingMetrics {
  const { byState, lastTonnage, loads, now, rangeFrom, rangeTo, storage } = input;

  const lastLoad = latestBy(loads, (load) => toMillis(load.dateCreated));
  const lastLoadTime = lastLoad ? toMillis(lastLoad.dateCreated) : Number.NaN;
  const lastLoadInRange = !Number.isNaN(lastLoadTime) && lastLoadTime >= rangeFrom.getTime() && lastLoadTime <= rangeTo.getTime();
  const loadsInRange = loads.filter((load) => {
    const time = toMillis(load.dateCreated);
    return !Number.isNaN(time) && time >= rangeFrom.getTime() && time <= rangeTo.getTime();
  });
  const rangeLoadsTotal = sumDecimalStrings(loadsInRange.map((load) => load.totalLoaded));

  const rows: DispensingDenominationRow[] = storage
    .map((entry) => {
      const delivered = tonnageDetailQuantity(lastTonnage, entry.idCurrencyDenomination, (detail) => detail.quantityDp);
      const rejected = tonnageDetailQuantity(lastTonnage, entry.idCurrencyDenomination, (detail) => detail.quantityRj);
      const balance = toInt(entry.dpStored);
      const minDpQuantity = toInt(entry.minDpQuantity);

      return {
        balance,
        balanceValue: entry.dpTotal,
        denominationId: entry.idCurrencyDenomination,
        denominationValue: entry.denominationValue,
        // Entregada/rechazada: valor físico del último arqueo; sin arqueo,
        // cae al inventario actual del sistema (referencia).
        delivered: delivered ?? balance,
        isDispensing: entry.isDispensing,
        loadedInRange: detailQuantity(loadsInRange.flatMap((load) => load.details), entry.idCurrencyDenomination),
        low: entry.isDispensing && balance <= minDpQuantity + LOW_BALANCE_TOLERANCE,
        minDpQuantity,
        rejected: rejected ?? toInt(entry.rjStored),
      };
    })
    .sort((left, right) => toInt(right.denominationValue) - toInt(left.denominationValue));

  const storageTotal = sumDecimalStrings(storage.map((entry) => entry.dpTotal));

  return {
    ap: {
      count: byState[APPROVED_STATE]?.count ?? 0,
      total: byState[APPROVED_STATE]?.total ?? "0",
    },
    apPhysical: {
      at: lastTonnage?.dateCreated ?? null,
      total: lastTonnage?.totalAp ?? null,
    },
    cancelled: {
      count: byState[CANCELLED_STATE]?.count ?? 0,
      total: byState[CANCELLED_STATE]?.total ?? "0",
    },
    dp: {
      at: lastTonnage?.dateCreated ?? null,
      storageTotal,
      total: lastTonnage?.totalDp ?? null,
    },
    lastLoad: {
      at: lastLoad?.dateCreated ?? null,
      elapsedMs: lastLoad && !Number.isNaN(lastLoadTime) ? Math.max(0, now.getTime() - lastLoadTime) : null,
      // Referencia del período: si el último cargue está dentro del rango,
      // su valor; si no, la suma de cargues del rango (puede ser "0").
      total: lastLoadInRange ? (lastLoad?.totalLoaded ?? null) : rangeLoadsTotal === "0" ? null : rangeLoadsTotal,
    },
    rj: {
      count: byState[RETURNED_ERROR_STATE]?.count ?? 0,
      physicalTotal: lastTonnage?.totalRj ?? null,
      total: byState[RETURNED_ERROR_STATE]?.total ?? "0",
    },
    rows,
  };
}

export function formatElapsed(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) {
    return "—";
  }

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) {
    return "menos de 1 min";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
  }

  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest === 0 ? `${days} d` : `${days} d ${rest} h`;
}
