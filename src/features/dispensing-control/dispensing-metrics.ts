import type { CurrencyDenomination } from "@/features/denominations/schemas";
import type { Load, PayPadStorage, Tonnage } from "@/features/paypads/schemas";
import type { TransactionStateBucket } from "@/features/transactions/schemas";
import { buildDenominationCurrencyIndex, denominationCurrencyText } from "./denomination-currency";
import { DENOMINATION_NOT_IN_USE_REASON, describeDenominationUsage, isDenominationInUse } from "./denomination-usage";

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
  /** Catálogo de denominaciones: aporta la MONEDA de cada baúl (máquinas de cambio divisa). */
  denominations?: readonly CurrencyDenomination[];
  machineCurrency?: { id: number; label: string | null } | null;
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
  /** `idCurrency` del catálogo; `null` = moneda no declarada. */
  currencyId: number | null;
  /** Etiqueta de la moneda (p. ej. «COP», «USD»): sin ella, «100» y «100» se confunden. */
  currencyLabel: string | null;
  denominationId: number;
  /**
   * La denominación pertenece HOY al inventario de la máquina (configurada, con saldo,
   * con cargues o con entregas). Las filas que no cumplen salen del desglose principal.
   */
  inUse: boolean;
  /** Motivo por el que la fila quedó fuera del desglose principal (`null` si está dentro). */
  excludedReason: string | null;
  /** El último arqueo reporta un valor negativo para esta denominación (artefacto legacy). */
  negativeReport: string | null;
  /** `true` si la moneda de la denominación no es la declarada por el Pay+. */
  foreignCurrency: boolean;
  /** Por qué la fila está en uso (señales positivas), para explicar cada baúl mostrado. */
  inUseReasons: string[];
  denominationValue: string;
  delivered: number;
  isDispensing: boolean;
  loadedInRange: number;
  low: boolean;
  minDpQuantity: number;
  rejected: number;
}

/** Total de inventario por moneda: los importes de monedas distintas NO se suman. */
export interface DispensingCurrencyTotal {
  currencyId: number | null;
  label: string | null;
  total: string;
}

export interface DispensingMetrics {
  ap: { count: number; total: string };
  apPhysical: { at: string | null; total: string | null };
  cancelled: { count: number; total: string };
  dp: { at: string | null; storageTotal: string; total: string | null };
  lastLoad: { at: string | null; elapsedMs: number | null; total: string | null };
  rj: { count: number; physicalTotal: string | null; total: string };
  /** Sólo denominaciones en uso hoy (lo que la máquina realmente maneja). */
  rows: DispensingDenominationRow[];
  /** Filas del storage que NO son inventario en uso hoy, con su motivo (no se ocultan: se explican). */
  excludedRows: DispensingDenominationRow[];
  /** Inventario del baúl dispensador separado por moneda (una entrada por moneda en uso). */
  storageTotalsByCurrency: DispensingCurrencyTotal[];
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
  const currencyIndex = buildDenominationCurrencyIndex({
    denominations: input.denominations ?? [],
    machineCurrency: input.machineCurrency ?? null,
    storage,
  });
  const machineCurrencyId = input.machineCurrency?.id ?? null;

  const lastLoad = latestBy(loads, (load) => toMillis(load.dateCreated));
  const lastLoadTime = lastLoad ? toMillis(lastLoad.dateCreated) : Number.NaN;
  const lastLoadInRange = !Number.isNaN(lastLoadTime) && lastLoadTime >= rangeFrom.getTime() && lastLoadTime <= rangeTo.getTime();
  const loadsInRange = loads.filter((load) => {
    const time = toMillis(load.dateCreated);
    return !Number.isNaN(time) && time >= rangeFrom.getTime() && time <= rangeTo.getTime();
  });
  const rangeLoadsTotal = sumDecimalStrings(loadsInRange.map((load) => load.totalLoaded));

  const allRows: DispensingDenominationRow[] = storage
    .map((entry) => {
      const deliveredRaw = tonnageDetailQuantity(lastTonnage, entry.idCurrencyDenomination, (detail) => detail.quantityDp);
      const rejectedRaw = tonnageDetailQuantity(lastTonnage, entry.idCurrencyDenomination, (detail) => detail.quantityRj);
      const apRaw = tonnageDetailQuantity(lastTonnage, entry.idCurrencyDenomination, (detail) => detail.quantityAp);
      const balance = toInt(entry.dpStored);
      const minDpQuantity = toInt(entry.minDpQuantity);
      const rejectionStock = toInt(entry.rjStored);
      const acceptedStock = toInt(entry.apStored);
      const loadedInRange = detailQuantity(loadsInRange.flatMap((load) => load.details), entry.idCurrencyDenomination);

      // Un arqueo legacy puede traer cantidades NEGATIVAS (firmadas). Mostrar «entregada
      // −6» como una entrega es incorrecto: se acota a 0 y se declara el valor reportado.
      const negatives: string[] = [];
      if (deliveredRaw !== null && deliveredRaw < 0) {
        negatives.push(`${deliveredRaw} entregada(s)`);
      }
      if (rejectedRaw !== null && rejectedRaw < 0) {
        negatives.push(`${rejectedRaw} rechazada(s)`);
      }
      const negativeReport = negatives.length === 0 ? null : `El último arqueo reporta ${negatives.join(" y ")}: se muestra 0.`;

      const delivered = deliveredRaw === null ? balance : Math.max(0, deliveredRaw);
      const rejected = rejectedRaw === null ? rejectionStock : Math.max(0, rejectedRaw);
      const currency = currencyIndex.get(entry.idCurrencyDenomination);
      const foreignCurrency = machineCurrencyId !== null && currency?.currencyId != null && currency.currencyId !== machineCurrencyId;

      // ¿La máquina usa HOY esta denominación? La misma regla del motor de atascos: la
      // configuración, el saldo (DP/RJ/AP), los cargues del período, las entregas del
      // último arqueo o cualquier detalle del baúl. Una fila heredada —el billete de
      // USD 1 que solo aparece en `PayPad/GetStorage` con todo en cero y un arqueo
      // negativo— no es inventario de la máquina y no debe figurar en el desglose. El
      // dashboard antiguo tampoco la muestra: su «Lista de Denominaciones» filtra el
      // catálogo por la moneda del Pay+ (`idCurrency === paypad.idCurrency`).
      const usageSignals = {
        acceptedLastArqueo: apRaw,
        acceptedStock,
        configured: entry.isDispensing,
        deliveredInPeriod: false,
        deliveredLastArqueo: deliveredRaw,
        dispensingStock: balance,
        failedInPeriod: false,
        loadedInPeriod: loadedInRange,
        minDpQuantity,
        rejectedLastArqueo: rejectedRaw,
        rejectionStock,
      };
      const inUse = isDenominationInUse(usageSignals);
      const inUseReasons = describeDenominationUsage(usageSignals);

      const excludedParts: string[] = [];
      if (!inUse) {
        excludedParts.push(DENOMINATION_NOT_IN_USE_REASON);
        if (negativeReport) {
          excludedParts.push(negativeReport);
        }
        if (foreignCurrency) {
          excludedParts.push(
            `Su moneda (${denominationCurrencyText(currency) ?? "no declarada"}) no es la del Pay+ (${input.machineCurrency?.label ?? "no declarada"}).`,
          );
        }
      }

      return {
        balance,
        balanceValue: entry.dpTotal,
        currencyId: currency?.currencyId ?? null,
        currencyLabel: denominationCurrencyText(currency),
        denominationId: entry.idCurrencyDenomination,
        denominationValue: entry.denominationValue,
        // Entregada/rechazada: valor físico del último arqueo; sin arqueo,
        // cae al inventario actual del sistema (referencia).
        delivered,
        excludedReason: excludedParts.length === 0 ? null : excludedParts.join(" "),
        foreignCurrency,
        inUse,
        inUseReasons,
        isDispensing: entry.isDispensing,
        loadedInRange,
        low: entry.isDispensing && balance <= minDpQuantity + LOW_BALANCE_TOLERANCE,
        minDpQuantity,
        negativeReport,
        rejected,
      };
    })
    // Moneda primero (agrupada) y valor descendente dentro de ella: sin esto, un
    // billete de USD 100 se ordenaba entre los de COP 50.000 y el operador no podía
    // distinguir de qué moneda era cada baúl.
    .sort((left, right) => {
      const leftLabel = left.currencyLabel ?? "";
      const rightLabel = right.currencyLabel ?? "";
      if (leftLabel !== rightLabel) {
        return leftLabel.localeCompare(rightLabel);
      }
      return toInt(right.denominationValue) - toInt(left.denominationValue);
    });

  const rows = allRows.filter((row) => row.inUse);
  const excludedRows = allRows.filter((row) => !row.inUse);

  // El total y el desglose por moneda se calculan SOLO con el inventario en uso: si no,
  // un saldo residual de una moneda que la máquina no maneja aparece como «USD $0».
  const storageTotal = sumDecimalStrings(rows.map((entry) => entry.balanceValue));
  const totalsByCurrency = new Map<string, DispensingCurrencyTotal>();
  for (const row of rows) {
    const key = row.currencyId === null ? "none" : String(row.currencyId);
    const current = totalsByCurrency.get(key) ?? { currencyId: row.currencyId, label: row.currencyLabel, total: "0" };
    current.total = sumDecimalStrings([current.total, row.balanceValue]);
    totalsByCurrency.set(key, current);
  }

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
    excludedRows,
    rows,
    storageTotalsByCurrency: [...totalsByCurrency.values()],
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
