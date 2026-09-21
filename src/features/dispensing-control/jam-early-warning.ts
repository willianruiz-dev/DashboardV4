// Import RELATIVO a propósito: los guiones de regresión (`scripts/dispensing-fixtures.mts`)
// cargan estos módulos sin resolver el alias `@/`.
import { RETURNED_ERROR_STATE, decimalToCents } from "./dispensing-jams";

/**
 * Semáforo de «posible atasco» del inicio, SIN pedir el detalle de cada transacción.
 *
 * Motivo: el panel de inicio debe avisar que una máquina sólo está entregando la
 * denominación menor (caso real Pay+ Inder 2, donde el cambio sale únicamente con monedas
 * de 100). El motor completo (`computeJamDiagnostics`) exige el detalle por transacción
 * —una petición al API legado por cada pago—, así que no se puede ejecutar para todas las
 * máquinas en cada vuelta del sondeo (30 s). Este semáforo usa sólo datos que ya se
 * consultan o que cuestan una petición por máquina y minuto:
 *
 *  - Los arqueos del día (`Tonnage/GetByPaypad`): qué módulos bajaron y cuáles no.
 *  - Las transacciones del día (ya consultadas para la alerta de errores de devuelta): si
 *    hubo pagos con devolución y de qué valor (la «demanda» de cada denominación).
 *  - El baúl (`PayPad/GetStorage`), SOLO para las máquinas que ya dieron sospecha: saldo
 *    real y si la configuración marca el módulo como «No dispensa».
 *
 * Regla: si en el intervalo hubo pagos con devolución y existe un módulo con saldo que
 * (a) NO bajó en el arqueo, (b) podía usarse en varios de esos pagos y (c) otros módulos sí
 * bajaron, entonces ese módulo es sospechoso de atasco y los que bajaron son quienes están
 * cubriendo el cambio. Es el mismo razonamiento del motor (señal `sin_participacion`),
 * medido sobre el arqueo en lugar del detalle, y por eso el texto del inicio declara que la
 * confirmación requiere el análisis completo.
 *
 * El resultado NUNCA sustituye al motor: es una alerta temprana con su origen visible.
 */
export const JAM_EARLY_WARNING_THRESHOLDS = {
  /** Pagos con devolución mínimos del intervalo para intentar el semáforo. */
  minimumPayouts: 3,
  /** Pagos que debían poder usar la denominación (importe devuelto ≥ su valor). */
  minimumDemand: 3,
  /** Unidades mínimas en el arqueo base: con 1 o 2 monedas cualquier pago se explica. */
  minimumBaseStock: 5,
} as const;

export interface JamEarlyWarningStorageRow {
  denominationValue: string;
  dpStored: string;
  idCurrencyDenomination: number;
  isDispensing: boolean;
}

export interface JamEarlyWarningTonnageDetail {
  denominationValue: string;
  idCurrencyDenomination: number | null;
  quantityDp: string;
}

export interface JamEarlyWarningTonnage {
  dateCreated: string | null;
  details: readonly JamEarlyWarningTonnageDetail[];
}

export interface JamEarlyWarningTransaction {
  dateCreated: string | null;
  returnAmount: string;
  stateTransaction: string | null;
}

export interface JamEarlyWarning {
  /** Módulos que sí bajaron en el arqueo: por ahí está saliendo el cambio. */
  compensators: { denominationValue: string; movement: number }[];
  /** `null` = no se consultó el baúl (sólo se consulta cuando ya hay sospecha). */
  configuredForDispensing: boolean | null;
  /** Pagos del intervalo cuyo importe devuelto alcanzaba para esta denominación. */
  demand: number;
  denominationValue: string;
  /** Cuánto bajó el módulo entre los dos arqueos (≤ 0 = no entregó). */
  movement: number;
  /** Unidades en el baúl (si se consultó) o en el arqueo base. */
  stock: number;
}

export interface JamEarlyWarningScreen {
  arqueoFrom: string | null;
  arqueoTo: string | null;
  /** Motivo por el que el semáforo no aplica (sin arqueos, pocos pagos, multimoneda…). */
  note: string | null;
  payouts: number;
  warnings: JamEarlyWarning[];
}

export interface JamEarlyWarningInput {
  from: string;
  storage?: readonly JamEarlyWarningStorageRow[] | null;
  to: string;
  tonnages: readonly JamEarlyWarningTonnage[];
  transactions: readonly JamEarlyWarningTransaction[];
}

function toMillis(value: string | null | undefined): number {
  const time = new Date(value ?? "").getTime();
  return Number.isNaN(time) ? Number.NaN : time;
}

function toInt(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : 0;
  }

  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function quantityByDenomination(tonnage: JamEarlyWarningTonnage | null): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const detail of tonnage?.details ?? []) {
    quantities.set(detail.denominationValue, Math.abs(toInt(detail.quantityDp)));
  }
  return quantities;
}

function emptyScreen(note: string): JamEarlyWarningScreen {
  return { arqueoFrom: null, arqueoTo: null, note, payouts: 0, warnings: [] };
}

export function computeJamEarlyWarnings(input: JamEarlyWarningInput): JamEarlyWarningScreen {
  const fromMs = toMillis(input.from);
  const toMs = toMillis(input.to);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) {
    return emptyScreen("El rango del semáforo no tiene fechas válidas.");
  }

  // Arqueos ordenados; el «base» es el arqueo previo al inicio del día y, si no existe, el
  // primero del día (el semáforo mide desde ahí y sólo cuenta los pagos posteriores).
  const tonnages = [...input.tonnages]
    .map((tonnage) => ({ at: toMillis(tonnage.dateCreated), tonnage }))
    .filter((entry) => !Number.isNaN(entry.at) && entry.at <= toMs)
    .sort((left, right) => left.at - right.at);
  const current = tonnages.at(-1) ?? null;
  const before = [...tonnages].reverse().find((entry) => entry.at <= fromMs) ?? tonnages[0] ?? null;
  if (current === null || before === null || current.at <= before.at) {
    return emptyScreen("Sin dos arqueos comparables en el período (se necesitan para medir el movimiento de cada módulo).");
  }

  // Pagos con devolución posteriores al arqueo base: su importe es la demanda de cada módulo.
  const payouts = input.transactions.filter((transaction) => {
    const state = (transaction.stateTransaction ?? "").trim();
    if (state === RETURNED_ERROR_STATE) {
      return false;
    }
    const amount = decimalToCents(transaction.returnAmount);
    if (amount <= 0n) {
      return false;
    }
    const at = toMillis(transaction.dateCreated);
    return !Number.isNaN(at) && at > before.at && at <= toMs;
  });
  if (payouts.length < JAM_EARLY_WARNING_THRESHOLDS.minimumPayouts) {
    return {
      arqueoFrom: before.tonnage.dateCreated ?? null,
      arqueoTo: current.tonnage.dateCreated ?? null,
      note: `Menos de ${JAM_EARLY_WARNING_THRESHOLDS.minimumPayouts} pagos con devolución después del arqueo base: no hay evidencia suficiente para el semáforo.`,
      payouts: payouts.length,
      warnings: [],
    };
  }

  const baseQuantities = quantityByDenomination(before.tonnage);
  const currentQuantities = quantityByDenomination(current.tonnage);
  const movements = new Map<string, number>();
  const stockAtBase = new Map<string, number>();
  for (const [denominationValue, baseQuantity] of baseQuantities) {
    const currentQuantity = currentQuantities.get(denominationValue);
    if (currentQuantity === undefined) {
      // El módulo no aparece en el arqueo actual: sin dato comparable, no se acusa.
      continue;
    }
    stockAtBase.set(denominationValue, baseQuantity);
    movements.set(denominationValue, baseQuantity - currentQuantity);
  }

  const compensators = [...movements.entries()]
    .filter(([, movement]) => movement > 0)
    .sort((left, right) => right[1] - left[1])
    .map(([denominationValue, movement]) => ({ denominationValue, movement }))
    .slice(0, 3);
  if (compensators.length === 0) {
    return {
      arqueoFrom: before.tonnage.dateCreated ?? null,
      arqueoTo: current.tonnage.dateCreated ?? null,
      note: "Ningún módulo bajó en el arqueo del intervalo: no se puede atribuir el cambio a una denominación concreta.",
      payouts: payouts.length,
      warnings: [],
    };
  }

  const storageByValue = new Map((input.storage ?? []).map((row) => [row.denominationValue, row]));
  const warnings: JamEarlyWarning[] = [];
  for (const [denominationValue, movement] of movements) {
    if (movement > 0) {
      continue;
    }
    const baseStock = stockAtBase.get(denominationValue) ?? 0;
    if (baseStock < JAM_EARLY_WARNING_THRESHOLDS.minimumBaseStock) {
      continue;
    }
    const valueCents = decimalToCents(denominationValue);
    if (valueCents <= 0n) {
      continue;
    }
    const demand = payouts.filter((transaction) => decimalToCents(transaction.returnAmount) >= valueCents).length;
    if (demand < JAM_EARLY_WARNING_THRESHOLDS.minimumDemand) {
      continue;
    }

    const storageRow = storageByValue.get(denominationValue);
    warnings.push({
      compensators,
      configuredForDispensing: storageRow?.isDispensing ?? null,
      demand,
      denominationValue,
      movement,
      stock: storageRow ? Math.abs(toInt(storageRow.dpStored)) : baseStock,
    });
  }

  warnings.sort((left, right) => right.demand - left.demand || right.stock - left.stock);
  return {
    arqueoFrom: before.tonnage.dateCreated ?? null,
    arqueoTo: current.tonnage.dateCreated ?? null,
    note: warnings.length === 0 ? "Ningún módulo con saldo quedó sin participar en el cambio del intervalo." : null,
    payouts: payouts.length,
    warnings,
  };
}
