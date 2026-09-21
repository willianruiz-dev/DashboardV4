import type { CurrencyDenomination } from "@/features/denominations/schemas";
import type { Load, PayPadStorage, Tonnage } from "@/features/paypads/schemas";
import type { TransactionStateBucket } from "@/features/transactions/schemas";
import { buildDenominationCurrencyIndex, denominationCurrencyText } from "./denomination-currency";
import { DENOMINATION_NOT_IN_USE_REASON, describeDenominationUsage, isDenominationInUse } from "./denomination-usage";

/**
 * Cálculo puro de métricas de dispensado (AP/DP/RJ) para un Pay+ y un período.
 * Fuentes (todas endpoints existentes, ver docs/DISPENSING_CONTROL_FEASIBILITY.md):
 * - byState (BFF transacciones, período): lo que el SISTEMA registró.
 * - Último arqueo = ARQUEO BASE (tonnage): lo FÍSICO auditado (inventario AP/DP/RJ
 *   por denominación al momento del arqueo — un snapshot, NO un movimiento).
 * - Storage (inventario del sistema): saldos ACTUALES de los baúles + umbral.
 * - Cargues (loads): último cargue, cargues del período UI y cargues desde la base.
 *
 * Ecuación de cuadre por denominación (desde el arqueo base hasta hoy):
 *
 *   Salida física DP = Inicial DP (arqueo base) + Cargada (desde la base) − Saldo DP (hoy)
 *
 * La «Entregada» NO es el `quantityDp` del arqueo (ese es el inventario de ese día,
 * ver dashboard viejo `PayPadTonnageForm.js`: el arqueo se arma con el storage actual
 * y `TonnageRepository.CreateAsync` solo recibe `IdPayPad` porque el SP snapshottea).
 * La «Rechazada» NO es el `quantityRj` del arqueo viejo: es el baúl de rechazo ACTUAL
 * (`rjStored`), con su delta contra la base. Sin arqueo base no hay inicial: la salida
 * física queda indeterminada (`null`) en lugar de inventarse con el inventario actual.
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
  /** Último arqueo = base física del cuadre (`null` = la máquina nunca se arqueó). */
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
   * con cargues o con existencias). Las filas que no cumplen salen del desglose principal.
   */
  inUse: boolean;
  /** Motivo por el que la fila quedó fuera del desglose principal (`null` si está dentro). */
  excludedReason: string | null;
  /** El arqueo base reporta un valor negativo para esta denominación (artefacto legacy). */
  negativeReport: string | null;
  /** `true` si la moneda de la denominación no es la declarada por el Pay+. */
  foreignCurrency: boolean;
  /** Por qué la fila está en uso (señales positivas), para explicar cada baúl mostrado. */
  inUseReasons: string[];
  denominationValue: string;
  /**
   * Salida física del dispensador desde el arqueo base
   * (`inicial + cargada − saldo`). `null` = sin arqueo base (no calculable).
   * Un valor NEGATIVO no se acota: el conteo subió (cargue no registrado o descuadre).
   */
  delivered: number | null;
  /** El conteo físico SUBIÓ desde la base (`delivered < 0`): revisar, no es una entrega. */
  shortage: boolean;
  isDispensing: boolean;
  /** Cargues del período UI (Hoy/24h/7d/rango): referencia para AP/RJ, no entra al cuadre. */
  loadedInRange: number;
  /**
   * Cargues desde el arqueo base (los que alimentan la ecuación). Sin base, cae al
   * período UI como referencia y la tabla lo declara.
   */
  loadedSinceBase: number;
  /** Existencias del arqueo base (negativos legacy acotados a 0, ver `negativeReport`). */
  initialDp: number;
  initialRj: number;
  initialAp: number;
  low: boolean;
  minDpQuantity: number;
  /** Baúl de rechazo ACTUAL (`rjStored` de hoy), no el del arqueo viejo. */
  rejected: number;
  /** Valor del baúl de rechazo actual (`rjTotal`). */
  rejectedValue: string;
  /** Movimiento del rechazo desde la base (`actual − base`, con signo). Sin base: `null`. */
  rejectedDelta: number | null;
}

/** Total de inventario por moneda: los importes de monedas distintas NO se suman. */
export interface DispensingCurrencyTotal {
  currencyId: number | null;
  label: string | null;
  total: string;
}

export interface DispensingMetrics {
  ap: { count: number; total: string };
  apPhysical: { at: string | null; currentTotal: string; total: string | null };
  cancelled: { count: number; total: string };
  dp: { at: string | null; outflowTotal: string | null; storageTotal: string; total: string | null };
  lastLoad: { at: string | null; elapsedMs: number | null; total: string | null };
  /** Ventana del cuadre físico: del arqueo base hasta hoy (o del período UI si no hay base). */
  reconciliation: { baseAt: string | null; hasBase: boolean; loadsSinceBaseCount: number; loadsSinceBaseTotal: string };
  rj: { count: number; currentTotal: string; physicalTotal: string | null; total: string };
  /** Etiquetas de las monedas que la máquina trabaja hoy (p. ej. `["COP","USD"]`). */
  currencyLabels: string[];
  /**
   * `true` si el inventario en uso abarca más de una moneda: los importes agregados
   * (AP/RJ del período y el total del arqueo) suman monedas distintas y no son
   * comparables entre sí. El desglose por moneda sigue disponible.
   */
  multiCurrency: boolean;
  /** Sólo denominaciones en uso hoy (lo que la máquina realmente maneja). */
  rows: DispensingDenominationRow[];
  /** Filas del storage que NO son inventario en uso hoy, con su motivo (no se ocultan: se explican). */
  excludedRows: DispensingDenominationRow[];
  /** Inventario del baúl dispensador separado por moneda (una entrada por moneda en uso). */
  storageTotalsByCurrency: DispensingCurrencyTotal[];
  /** Salida física del dispensador desde la base, por moneda (vacío sin arqueo base). */
  outflowTotalsByCurrency: DispensingCurrencyTotal[];
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

/** Centavos con signo desde un decimal del API (tolerante: `null` si no interpreta). */
function decimalToCents(value: string): bigint | null {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/u.exec(value.trim());
  if (!match) {
    return null;
  }

  const fraction = (match[3] ?? "").slice(0, 2).padEnd(2, "0");
  const cents = BigInt(match[2] ?? "0") * 100n + BigInt(fraction);
  return match[1] === "-" ? -cents : cents;
}

function centsToDecimal(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const integer = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return fraction === "00"
    ? `${negative ? "-" : ""}${integer.toString()}`
    : `${negative ? "-" : ""}${integer.toString()}.${fraction}`;
}

function sumDecimalStrings(values: readonly string[]): string {
  let cents = 0n;
  let anyParsed = false;

  for (const value of values) {
    const parsed = decimalToCents(value);
    if (parsed === null) {
      continue;
    }
    anyParsed = true;
    cents += parsed;
  }

  return anyParsed ? centsToDecimal(cents) : "0";
}

/** Importe de `units` (con signo) × valor de la denominación, en centavos. */
function unitsValueCents(denominationValue: string, units: number): bigint {
  const valueCents = decimalToCents(denominationValue);
  if (valueCents === null) {
    return 0n;
  }

  return valueCents * BigInt(units);
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

interface MovementDetail {
  denominationValue: string;
  idCurrencyDenomination: number | null;
  quantity: string;
}

function detailMatches(detail: MovementDetail, denominationId: number, denominationValue: string): boolean {
  if (detail.idCurrencyDenomination !== null) {
    return detail.idCurrencyDenomination === denominationId;
  }

  // Los arqueos/cargues viejos pueden venir sin id de denominación (el lector V4 lo
  // admite como `null`): el valor visible es el respaldo determinista, igual que en
  // el motor de atascos para los cargues.
  return toInt(detail.denominationValue) === toInt(denominationValue);
}

function detailQuantity(
  details: readonly MovementDetail[],
  denominationId: number,
  denominationValue: string,
): number {
  let total = 0;
  for (const detail of details) {
    if (detailMatches(detail, denominationId, denominationValue)) {
      total += toInt(detail.quantity);
    }
  }
  return total;
}

function tonnageDetailFor(
  tonnage: Tonnage | null,
  denominationId: number,
  denominationValue: string,
): Tonnage["details"][number] | undefined {
  if (!tonnage) {
    return undefined;
  }

  return (
    tonnage.details.find((item) => item.idCurrencyDenomination === denominationId) ??
    tonnage.details.find(
      (item) => item.idCurrencyDenomination === null && toInt(item.denominationValue) === toInt(denominationValue),
    )
  );
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

  // Ventana del cuadre físico: (arqueo base → hoy]. El límite inferior es EXCLUSIVO
  // (un cargue incluido en el snapshot de la base no se vuelve a sumar), igual que la
  // caída física del motor de atascos. Sin base no hay inicial: los cargues caen al
  // período UI como referencia y la salida física queda indeterminada.
  const baseTime = toMillis(lastTonnage?.dateCreated ?? null);
  const hasBase = lastTonnage !== null && !Number.isNaN(baseTime);
  const loadsSinceBase = hasBase
    ? loads.filter((load) => {
        const time = toMillis(load.dateCreated);
        return !Number.isNaN(time) && time > baseTime;
      })
    : loadsInRange;
  const loadsSinceBaseTotal = sumDecimalStrings(loadsSinceBase.map((load) => load.totalLoaded));

  const allRows: DispensingDenominationRow[] = storage
    .map((entry) => {
      const baseDetail = tonnageDetailFor(lastTonnage, entry.idCurrencyDenomination, entry.denominationValue);
      const rawInitialDp = hasBase && baseDetail ? toInt(baseDetail.quantityDp) : 0;
      const rawInitialRj = hasBase && baseDetail ? toInt(baseDetail.quantityRj) : 0;
      const rawInitialAp = hasBase && baseDetail ? toInt(baseDetail.quantityAp) : 0;
      const balance = toInt(entry.dpStored);
      const minDpQuantity = toInt(entry.minDpQuantity);
      const rejectionStock = toInt(entry.rjStored);
      const acceptedStock = toInt(entry.apStored);
      const loadedInRange = detailQuantity(
        loadsInRange.flatMap((load) => load.details),
        entry.idCurrencyDenomination,
        entry.denominationValue,
      );
      const loadedSinceBase = detailQuantity(
        loadsSinceBase.flatMap((load) => load.details),
        entry.idCurrencyDenomination,
        entry.denominationValue,
      );

      // Un arqueo legacy puede traer cantidades NEGATIVAS (firmadas). El inicial se
      // acota a 0 y se declara el valor reportado; la SALIDA física, en cambio, sí
      // admite negativos (el conteo subió: cargue no registrado o descuadre previo).
      const negatives: string[] = [];
      if (hasBase && baseDetail && rawInitialDp < 0) {
        negatives.push(`${rawInitialDp} en dispensador`);
      }
      if (hasBase && baseDetail && rawInitialRj < 0) {
        negatives.push(`${rawInitialRj} en rechazo`);
      }
      if (hasBase && baseDetail && rawInitialAp < 0) {
        negatives.push(`${rawInitialAp} en aceptador`);
      }
      const negativeReport = negatives.length === 0 ? null : `El arqueo base reporta ${negatives.join(", ")}: se toma 0.`;

      const initialDp = Math.max(0, rawInitialDp);
      const initialRj = Math.max(0, rawInitialRj);
      const initialAp = Math.max(0, rawInitialAp);
      const delivered = hasBase ? initialDp + loadedSinceBase - balance : null;
      const rejectedDelta = hasBase ? rejectionStock - initialRj : null;
      const currency = currencyIndex.get(entry.idCurrencyDenomination);
      const foreignCurrency = machineCurrencyId !== null && currency?.currencyId != null && currency.currencyId !== machineCurrencyId;

      // ¿La máquina usa HOY esta denominación? La misma regla del motor de atascos: la
      // configuración, el saldo (DP/RJ/AP), los cargues desde la base o las existencias
      // del arqueo base. Una fila heredada —el billete de USD 1 que solo aparece en
      // `PayPad/GetStorage` con todo en cero y un arqueo negativo— no es inventario de
      // la máquina y no debe figurar en el desglose. El dashboard antiguo tampoco la
      // muestra: su «Lista de Denominaciones» filtra el catálogo por la moneda del Pay+
      // (`idCurrency === paypad.idCurrency`).
      const usageSignals = {
        acceptedLastArqueo: hasBase ? rawInitialAp : null,
        acceptedStock,
        configured: entry.isDispensing,
        deliveredInPeriod: false,
        deliveredLastArqueo: hasBase ? rawInitialDp : null,
        dispensingStock: balance,
        failedInPeriod: false,
        loadedInPeriod: loadedSinceBase,
        minDpQuantity,
        rejectedLastArqueo: hasBase ? rawInitialRj : null,
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
        delivered,
        excludedReason: excludedParts.length === 0 ? null : excludedParts.join(" "),
        foreignCurrency,
        initialAp,
        initialDp,
        initialRj,
        inUse,
        inUseReasons,
        isDispensing: entry.isDispensing,
        loadedInRange,
        loadedSinceBase,
        low: entry.isDispensing && balance <= minDpQuantity + LOW_BALANCE_TOLERANCE,
        minDpQuantity,
        negativeReport,
        rejected: rejectionStock,
        rejectedDelta,
        rejectedValue: entry.rjTotal,
        shortage: delivered !== null && delivered < 0,
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
  const inUseIds = new Set(rows.map((row) => row.denominationId));

  // Los totales se calculan SOLO con el inventario en uso: si no, un saldo residual de
  // una moneda que la máquina no maneja aparece como «USD $0».
  const storageTotal = sumDecimalStrings(rows.map((entry) => entry.balanceValue));
  const totalsByCurrency = new Map<string, DispensingCurrencyTotal>();
  for (const row of rows) {
    const key = row.currencyId === null ? "none" : String(row.currencyId);
    const current = totalsByCurrency.get(key) ?? { currencyId: row.currencyId, label: row.currencyLabel, total: "0" };
    current.total = sumDecimalStrings([current.total, row.balanceValue]);
    totalsByCurrency.set(key, current);
  }

  // Salida física valorizada (unidades × denominación, con signo): sin base no existe.
  let outflowTotal: string | null = null;
  const outflowByCurrency = new Map<string, DispensingCurrencyTotal>();
  if (hasBase) {
    let outflowCents = 0n;
    const centsByCurrency = new Map<string, { currencyId: number | null; cents: bigint; label: string | null }>();
    for (const row of rows) {
      const cents = unitsValueCents(row.denominationValue, row.delivered ?? 0);
      outflowCents += cents;
      const key = row.currencyId === null ? "none" : String(row.currencyId);
      const current = centsByCurrency.get(key) ?? { currencyId: row.currencyId, cents: 0n, label: row.currencyLabel };
      current.cents += cents;
      centsByCurrency.set(key, current);
    }
    outflowTotal = centsToDecimal(outflowCents);
    for (const [key, entry] of centsByCurrency) {
      outflowByCurrency.set(key, { currencyId: entry.currencyId, label: entry.label, total: centsToDecimal(entry.cents) });
    }
  }

  const inUseStorage = storage.filter((entry) => inUseIds.has(entry.idCurrencyDenomination));
  const rejectCurrentTotal = sumDecimalStrings(inUseStorage.map((entry) => entry.rjTotal));
  const acceptorCurrentTotal = sumDecimalStrings(inUseStorage.map((entry) => entry.apTotal));

  return {
    ap: {
      count: byState[APPROVED_STATE]?.count ?? 0,
      total: byState[APPROVED_STATE]?.total ?? "0",
    },
    apPhysical: {
      at: lastTonnage?.dateCreated ?? null,
      currentTotal: acceptorCurrentTotal,
      total: lastTonnage?.totalAp ?? null,
    },
    cancelled: {
      count: byState[CANCELLED_STATE]?.count ?? 0,
      total: byState[CANCELLED_STATE]?.total ?? "0",
    },
    dp: {
      at: lastTonnage?.dateCreated ?? null,
      outflowTotal,
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
    reconciliation: {
      baseAt: lastTonnage?.dateCreated ?? null,
      hasBase,
      loadsSinceBaseCount: loadsSinceBase.length,
      loadsSinceBaseTotal,
    },
    rj: {
      count: byState[RETURNED_ERROR_STATE]?.count ?? 0,
      currentTotal: rejectCurrentTotal,
      physicalTotal: lastTonnage?.totalRj ?? null,
      total: byState[RETURNED_ERROR_STATE]?.total ?? "0",
    },
    excludedRows,
    currencyLabels: [...new Set(rows.map((row) => row.currencyLabel ?? "moneda no declarada"))],
    multiCurrency: new Set(rows.map((row) => row.currencyId)).size > 1,
    outflowTotalsByCurrency: [...outflowByCurrency.values()],
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
