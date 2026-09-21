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
  /**
   * Σ `returnAmount` de las transacciones aprobadas del período (BFF): el cambio que el
   * SISTEMA registró haber devuelto. Verificación independiente del cuadre físico.
   */
  cashDispensedTotal?: string | null;
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
   * Salida física desde el arqueo base (`inicial + cargada − saldo`). Incluye lo que el
   * arqueo declaraba en el baúl ANTES del cargue: se conserva como referencia/auditoría,
   * no como la cifra operativa (ver `deliveredFromLoad`).
   */
  deliveredFromBase: number | null;
  /**
   * `deliveredFromBase` — alias histórico del cuadre desde la base. Un valor NEGATIVO no
   * se acota: el conteo subió (cargue no registrado o descuadre).
   * @deprecated usar `deliveredFromBase` (misma cifra).
   */
  delivered: number | null;  /** El conteo físico SUBIÓ desde la base (`delivered < 0`): revisar, no es una entrega. */
  shortage: boolean;
  isDispensing: boolean;
  /** Cargues del período UI (Hoy/24h/7d/rango): referencia para AP/RJ, no entra al cuadre. */
  loadedInRange: number;
  /**
   * Cargues desde el arqueo base (los que alimentan el cuadre desde la base). Sin base,
   * cae al período UI como referencia y la tabla lo declara.
   */
  loadedSinceBase: number;
  /**
   * Cargues desde el ÚLTIMO CARGUE (incluido él mismo): la base del cuadre que usa la
   * operación («cargué 140, quedan 11»). No depende del arqueo.
   */
  loadedSinceLastLoad: number;
  /**
   * ENTREGADO A CLIENTES, modelo A (el arqueo base como saldo de apertura):
   * `inicial + recibido − virtual hoy − rechazo(Δ positivo)`. Es la cifra principal de la
   * tabla. `null` sin arqueo base.
   */
  deliveredToClients: number | null;
  /**
   * ENTREGADO A CLIENTES, modelo B (baúl llenado desde vacío en el último cargue):
   * `recibido − virtual hoy − rechazo actual`. `null` sin cargues.
   */
  deliveredToClientsFromLoad: number | null;
  /** El baúl de rechazo bajó desde la base: se vació y la separación no es exacta. */
  rejectServiced: boolean;
  /**
   * @deprecated usar `deliveredToClients` (modelo A) o `deliveredToClientsFromLoad` (modelo B).
   */
  deliveredFromLoad: number | null;
  /**
   * Puente entre ambos cuadres: unidades que había en el baúl al momento del último
   * cargue (según el arqueo base + los cargues intermedios). De ahí:
   * `unidadesAlCargar + carguesDesdeElCargue − saldo = salida desde el arqueo`.
   * `null` si el último cargue es anterior al arqueo o no hay base.
   */
  stockAtLastLoad: number | null;
  /**
   * Trazabilidad de la «Cargada»: cada cargue posterior al arqueo base que incluyó esta
   * denominación, con su fecha y cantidad. Un mismo total puede venir de varios cargues
   * (o de uno anterior al período filtrado): sin esto, la columna no es auditable.
   */
  loadsSinceBaseTrace: DispensingLoadTraceEntry[];
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

/** Un cargue que aportó unidades a la columna «Cargada (desde base)». */
export interface DispensingLoadTraceEntry {
  /** Fecha del cargue (ISO del API); `null` si el histórico no la trae. */
  at: string | null;
  quantity: number;
}

/**
 * Verificación del cuadre contra lo que el SISTEMA registró: los modelos físicos posibles
 * (el arqueo base como saldo de apertura, o el baúl llenado desde vacío) contra
 * `Σ returnAmount` de las transacciones aprobadas (el cambio efectivamente devuelto).
 * Es la única medición independiente del inventario que reporta la máquina.
 */
export interface DispensingReconciliationCheck {
  /** Modelo que mejor explica el registro del sistema (tolerancia 1 %). */
  best: "base" | "load" | "ninguno" | null;
  /** Diferencia `modelo − sistema` para cada modelo (con signo; `null` si no es calculable). */
  differences: { base: string | null; load: string | null };
  /** Entregado a clientes desde el arqueo base (modelo A), valorizado por moneda en `dp`. */
  fromBaseTotal: string | null;
  /** Entregado a clientes contando sólo el último cargue (modelo B, baúl desde vacío). */
  fromLoadTotal: string | null;
  /** Σ `returnAmount` de las transacciones aprobadas del período. */
  systemTotal: string | null;
  /** Cuántas transacciones aprobadas respaldan `systemTotal`. */
  transactionCount: number;
}

/**
 * Cuadre interno del arqueo base: la suma valorizada de sus detalles por denominación
 * contra los totales que el propio arqueo declara (los mismos que muestra la tabla
 * «Cargues y arqueos»). Si no coinciden, el punto de partida del cuadre físico es
 * sospechoso y el panel lo dice en lugar de dar por buena la salida calculada.
 */
export interface DispensingBaseSelfCheck {
  /** Totales declarados por el arqueo (`totalAp/totalDp/totalRj`). */
  declared: { ap: string; dp: string; rj: string };
  /** Suma de los detalles del arqueo (unidades × valor de la denominación). */
  details: { ap: string; dp: string; rj: string };
  /** `false` = los detalles no explican los totales declarados. */
  matches: boolean;
}

export interface DispensingMetrics {
  ap: { count: number; total: string };
  apPhysical: { at: string | null; currentTotal: string; total: string | null };
  cancelled: { count: number; total: string };
  /**
   * `outflowTotal` = salida del período del cargue (`Σ (cargada − saldo) × valor`, la
   * cifra operativa). `baseOutflowTotal` = salida desde el arqueo base (referencia).
   * `storageTotal` = inventario actual.
   */
  /**
   * Entregado a clientes. `clientsFromBaseTotal` = modelo A (arqueo base como apertura,
   * cifra principal de la tabla); `clientsFromLoadTotal` = modelo B (baúl desde vacío en
   * el último cargue). `storageTotal` = inventario hoy. `total` = `totalDp` del arqueo.
   */
  dp: {
    at: string | null;
    clientsFromBaseTotal: string | null;
    clientsFromLoadTotal: string | null;
    storageTotal: string;
    total: string | null;
  };
  lastLoad: { at: string | null; elapsedMs: number | null; total: string | null };
  /** Verificación del cuadre físico contra `Σ returnAmount` (lo que el sistema registró). */
  reconciliationCheck: DispensingReconciliationCheck | null;
  /**
   * Ventana del cuadre físico: del arqueo base hasta hoy (o del período UI si no hay
   * base). `baseSelfCheck` valida que el arqueo base cuadre consigo mismo; `null` cuando
   * no es comparable (sin base, sin detalles, cantidades firmadas legacy o varias monedas).
   */
  reconciliation: {
    baseAt: string | null;
    baseSelfCheck: DispensingBaseSelfCheck | null;
    hasBase: boolean;
    loadsSinceBaseCount: number;
    loadsSinceBaseTotal: string;
    /** Cargues desde el último cargue (incluido él): base del cuadre operativo. */
    loadsSinceLastLoadCount: number;
    loadsSinceLastLoadTotal: string;
  };
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
  /** Salida del período del cargue por moneda (`Σ (cargada − saldo) × valor`); vacío sin cargues. */
  loadOutflowTotalsByCurrency: DispensingCurrencyTotal[];
  /** Salida física desde el arqueo base, por moneda (vacío sin arqueo base). */
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

function traceTime(value: string | null): number {
  const time = toMillis(value);
  return Number.isNaN(time) ? 0 : time;
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

  // Ventana del ÚLTIMO CARGUE (INCLUSIVO: el cargue mismo es la base). Es el cuadre que
  // la operación usa a diario — «cargué 140 el 19 y hoy quedan 16 ⇒ entregó 124» — y no
  // depende de ningún arqueo: por eso nunca puede dar más de lo cargado.
  const hasLastLoad = lastLoad !== null && !Number.isNaN(lastLoadTime);
  const loadsSinceLastLoad = hasLastLoad
    ? loads.filter((load) => {
        const time = toMillis(load.dateCreated);
        return !Number.isNaN(time) && time >= lastLoadTime;
      })
    : [];
  const loadsSinceLastLoadTotal = sumDecimalStrings(loadsSinceLastLoad.map((load) => load.totalLoaded));

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
      const loadedSinceLastLoad = detailQuantity(
        loadsSinceLastLoad.flatMap((load) => load.details),
        entry.idCurrencyDenomination,
        entry.denominationValue,
      );
      // Trazabilidad: qué cargues (con fecha) aportaron esta cifra. Ordenada por fecha
      // para que el operador vea si alguno quedó fuera del período filtrado.
      const loadsSinceBaseTrace = loadsSinceBase
        .flatMap((load) =>
          load.details
            .filter((detail) => detailMatches(detail, entry.idCurrencyDenomination, entry.denominationValue) && toInt(detail.quantity) !== 0)
            .map((detail) => ({ at: load.dateCreated ?? null, quantity: toInt(detail.quantity) })),
        )
        .sort((left, right) => traceTime(left.at) - traceTime(right.at));

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
      // Salieron del dispensador desde el arqueo (incluye lo que falló y cayó al rechazo).
      const deliveredFromBase = hasBase ? initialDp + loadedSinceBase - balance : null;
      // ENTREGADO AL CLIENTE (modelo A): lo que salió menos lo que quedó en el rechazo.
      // Sólo se descuenta el CRECIMIENTO del rechazo: si el baúl se vació, ese dinero no
      // pasó por el dispensador y no se puede sumar como entregado (se declara).
      const rejectedDelta = hasBase ? rejectionStock - initialRj : null;
      const rejectGrowth = rejectedDelta === null ? 0 : Math.max(0, rejectedDelta);
      const deliveredToClients = deliveredFromBase === null ? null : deliveredFromBase - rejectGrowth;
      // ENTREGADO AL CLIENTE (modelo B, baúl desde vacío): recibido − virtual − rechazo.
      const deliveredToClientsFromLoad = hasLastLoad ? loadedSinceLastLoad - balance - rejectionStock : null;
      const deliveredFromLoad = deliveredToClientsFromLoad;
      // Puente entre el cuadre del cargue y el del arqueo: lo que el baúl tenía cuando se
      // cargó (arqueo + cargues intermedios, sin poder descontar lo dispensado en medio).
      // Sólo tiene sentido si el último cargue es POSTERIOR al arqueo.
      const stockAtLastLoad =
        hasBase && hasLastLoad && lastLoadTime > baseTime
          ? Math.max(0, initialDp + (loadedSinceBase - loadedSinceLastLoad))
          : null;
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
        delivered: deliveredFromBase,
        deliveredFromBase,
        deliveredFromLoad,
        deliveredToClients,
        deliveredToClientsFromLoad,
        rejectServiced: rejectedDelta !== null && rejectedDelta < 0,
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
        loadedSinceLastLoad,
        loadsSinceBaseTrace,
        low: entry.isDispensing && balance <= minDpQuantity + LOW_BALANCE_TOLERANCE,
        minDpQuantity,
        negativeReport,
        rejected: rejectionStock,
        rejectedDelta,
        rejectedValue: entry.rjTotal,
        shortage: deliveredFromBase !== null && deliveredFromBase < 0,
        stockAtLastLoad,
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

  /**
   * Entregado a clientes valorizado, por modelo y moneda. Se valoriza al final
   * (unidades × valor) y NUNCA se suman monedas distintas entre sí.
   */
  function valueByCurrency(pick: (row: DispensingDenominationRow) => number | null): { byCurrency: Map<string, DispensingCurrencyTotal>; total: string } {
    const byCurrency = new Map<string, DispensingCurrencyTotal>();
    const centsByCurrency = new Map<string, { currencyId: number | null; cents: bigint; label: string | null }>();
    for (const row of rows) {
      const cents = unitsValueCents(row.denominationValue, pick(row) ?? 0);
      const key = row.currencyId === null ? "none" : String(row.currencyId);
      const current = centsByCurrency.get(key) ?? { currencyId: row.currencyId, cents: 0n, label: row.currencyLabel };
      current.cents += cents;
      centsByCurrency.set(key, current);
    }
    for (const [key, entry] of centsByCurrency) {
      byCurrency.set(key, { currencyId: entry.currencyId, label: entry.label, total: centsToDecimal(entry.cents) });
    }
    return { byCurrency, total: centsToDecimal([...centsByCurrency.values()].reduce((sum, entry) => sum + entry.cents, 0n)) };
  }

  // Modelo A (arqueo base como apertura): la cifra principal de la tabla.
  let clientsFromBaseTotal: string | null = null;
  const outflowByCurrency = new Map<string, DispensingCurrencyTotal>();
  if (hasBase) {
    const valued = valueByCurrency((row) => row.deliveredToClients);
    clientsFromBaseTotal = valued.total;
    for (const [key, entry] of valued.byCurrency) {
      outflowByCurrency.set(key, entry);
    }
  }

  // Modelo B (baúl llenado desde vacío en el último cargue): candidato de verificación.
  let clientsFromLoadTotal: string | null = null;
  const loadOutflowByCurrency = new Map<string, DispensingCurrencyTotal>();
  if (hasLastLoad) {
    const valued = valueByCurrency((row) => row.deliveredToClientsFromLoad);
    clientsFromLoadTotal = valued.total;
    for (const [key, entry] of valued.byCurrency) {
      loadOutflowByCurrency.set(key, entry);
    }
  }

  // Verificación contra el sistema: `Σ returnAmount` de las transacciones aprobadas (el
  // cambio que el sistema registró haber devuelto) contra cada modelo físico. Tolerancia
  // 1 % (billetes sueltos, redondeos del API). Es la única medición independiente del
  // inventario que reporta la máquina, y decide cuál apertura explica el cuadre.
  const systemCents = input.cashDispensedTotal == null ? null : decimalToCents(input.cashDispensedTotal);
  const reconciliationCheck: DispensingReconciliationCheck | null =
    systemCents === null
      ? null
      : (() => {
          const tolerance = (value: bigint) => {
            const magnitude = value < 0n ? -value : value;
            return magnitude / 100n > 1n ? magnitude / 100n : 1n;
          };
          const difference = (modelTotal: string | null): bigint | null => {
            if (modelTotal === null) {
              return null;
            }
            const modelCents = decimalToCents(modelTotal);
            return modelCents === null ? null : modelCents - systemCents;
          };
          const baseDiff = difference(clientsFromBaseTotal);
          const loadDiff = difference(clientsFromLoadTotal);
          const baseMatches = baseDiff !== null && (baseDiff < 0n ? -baseDiff : baseDiff) <= tolerance(systemCents);
          const loadMatches = loadDiff !== null && (loadDiff < 0n ? -loadDiff : loadDiff) <= tolerance(systemCents);
          return {
            best: baseMatches ? "base" : loadMatches ? "load" : systemCents === 0n && clientsFromBaseTotal === null && clientsFromLoadTotal === null ? null : "ninguno",
            differences: {
              base: baseDiff === null ? null : centsToDecimal(baseDiff),
              load: loadDiff === null ? null : centsToDecimal(loadDiff),
            },
            fromBaseTotal: clientsFromBaseTotal,
            fromLoadTotal: clientsFromLoadTotal,
            systemTotal: centsToDecimal(systemCents),
            transactionCount: byState[APPROVED_STATE]?.count ?? 0,
          };
        })();

  const inUseStorage = storage.filter((entry) => inUseIds.has(entry.idCurrencyDenomination));
  const rejectCurrentTotal = sumDecimalStrings(inUseStorage.map((entry) => entry.rjTotal));
  const acceptorCurrentTotal = sumDecimalStrings(inUseStorage.map((entry) => entry.apTotal));

  // ¿El arqueo base cuadra consigo mismo? El operador ve sus totales en «Cargues y
  // arqueos»; si sus detalles no los explican, el punto de partida del cuadre físico no
  // es confiable y hay que decirlo ANTES de discutir la salida. Se omite cuando no es
  // comparable: sin detalles, con cantidades firmadas legacy (Prueba1) o con varias
  // monedas (los totales del arqueo no se pueden sumar entre monedas).
  const baseSelfCheck = (() => {
    if (!hasBase || lastTonnage === null || lastTonnage.details.length === 0) {
      return null;
    }
    if (lastTonnage.details.some((detail) => toInt(detail.quantityDp) < 0)) {
      return null;
    }

    let ap = 0n;
    let dp = 0n;
    let rj = 0n;
    const currencyIds = new Set<number | null>();
    for (const detail of lastTonnage.details) {
      if (detail.idCurrencyDenomination === null) {
        return null;
      }
      currencyIds.add(currencyIndex.get(detail.idCurrencyDenomination)?.currencyId ?? null);
      ap += unitsValueCents(detail.denominationValue, toInt(detail.quantityAp));
      dp += unitsValueCents(detail.denominationValue, toInt(detail.quantityDp));
      rj += unitsValueCents(detail.denominationValue, toInt(detail.quantityRj));
    }
    if (currencyIds.size > 1) {
      return null;
    }

    const declaredAp = decimalToCents(lastTonnage.totalAp);
    const declaredDp = decimalToCents(lastTonnage.totalDp);
    const declaredRj = decimalToCents(lastTonnage.totalRj);
    if (declaredAp === null || declaredDp === null || declaredRj === null) {
      return null;
    }

    return {
      declared: { ap: lastTonnage.totalAp, dp: lastTonnage.totalDp, rj: lastTonnage.totalRj },
      details: { ap: centsToDecimal(ap), dp: centsToDecimal(dp), rj: centsToDecimal(rj) },
      matches: declaredAp === ap && declaredDp === dp && declaredRj === rj,
    };
  })();

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
      clientsFromBaseTotal,
      clientsFromLoadTotal,
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
    reconciliationCheck,
    reconciliation: {
      baseAt: lastTonnage?.dateCreated ?? null,
      baseSelfCheck,
      hasBase,
      loadsSinceBaseCount: loadsSinceBase.length,
      loadsSinceBaseTotal,
      loadsSinceLastLoadCount: loadsSinceLastLoad.length,
      loadsSinceLastLoadTotal,
    },
    rj: {
      count: byState[RETURNED_ERROR_STATE]?.count ?? 0,
      currentTotal: rejectCurrentTotal,
      physicalTotal: lastTonnage?.totalRj ?? null,
      total: byState[RETURNED_ERROR_STATE]?.total ?? "0",
    },
    excludedRows,
    currencyLabels: [...new Set(rows.map((row) => row.currencyLabel ?? "moneda no declarada"))],
    loadOutflowTotalsByCurrency: [...loadOutflowByCurrency.values()],
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
