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

/**
 * Cargue de la máquina (denominación → unidades). Es imprescindible para medir el movimiento
 * físico: si entre los dos arqueos el baúl se RECARGÓ, `base − actual` puede ser ≤ 0 aunque el
 * módulo haya entregado (caso real: «esa máquina fue cargada hace poco»). El movimiento válido
 * es el NETO: `base + cargado − actual`, la misma regla que usa el motor de atascos.
 */
export interface JamEarlyWarningLoadDetail {
  denominationValue: string;
  quantity: string;
}

export interface JamEarlyWarningLoad {
  dateCreated: string | null;
  details: readonly JamEarlyWarningLoadDetail[];
}

export interface JamEarlyWarningTransaction {
  dateCreated: string | null;
  returnAmount: string;
  stateTransaction: string | null;
}

export interface JamEarlyWarning {
  /** Módulos que sí entregaron (movimiento NETO, descontados los cargues). */
  compensators: { denominationValue: string; movement: number }[];
  /** `null` = no se consultó el baúl (sólo se consulta cuando ya hay sospecha). */
  configuredForDispensing: boolean | null;
  /** Pagos del intervalo cuyo importe devuelto alcanzaba para esta denominación. */
  demand: number;
  /**
   * Desde cuándo se cuentan esos pagos: después del arqueo base y, si hubo cargue, después del
   * ÚLTIMO cargue de la denominación. Antes de una recarga no se puede afirmar que el módulo
   * tuviera unidades, así que esos pagos no son evidencia.
   */
  demandFrom: string | null;
  denominationValue: string;
  /** Caída BRUTA entre arqueos (`base − actual`), sin descontar cargues. */
  grossMovement: number;
  /** Unidades cargadas a esta denominación entre los dos arqueos. */
  loadedUnits: number;
  /** Unidades cargadas DESPUÉS del último arqueo: el saldo mostrado las incluye. */
  loadedAfterArqueo: number;
  /**
   * Caída NETA = `base + cargues − actual`. Es el número con el que se decide: `≤ 0` significa
   * que el módulo no entregó unidades ni contando lo que se le cargó.
   */
  netMovement: number;
  /** Unidades en el baúl (si se consultó) o en el arqueo base. */
  stock: number;
}

export interface JamEarlyWarningScreen {
  arqueoFrom: string | null;
  arqueoTo: string | null;
  /**
   * `false` = no se pudo leer el historial de cargues. En ese caso NO se evalúan los módulos que
   * crecieron o se mantuvieron en el arqueo (no se puede saber si fue un cargue) y se declara.
   */
  loadsKnown: boolean;
  /** Motivo por el que el semáforo no aplica (sin arqueos, pocos pagos, multimoneda…). */
  note: string | null;
  payouts: number;
  /**
   * Módulos que NO se evaluaron por no poder leer los cargues: crecieron o se mantuvieron en el
   * arqueo y sin el historial de cargues no se puede saber si entregaron. El servidor usa esta
   * lista para decidir si vale la pena pedir los cargues antes de concluir.
   */
  suppressedByMissingLoads: string[];
  warnings: JamEarlyWarning[];
}

export interface JamEarlyWarningInput {
  from: string;
  /** Cargues de la máquina. `null`/`undefined` = lectura no disponible (se declara). */
  loads?: readonly JamEarlyWarningLoad[] | null;
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

function emptyScreen(note: string, loadsKnown = true): JamEarlyWarningScreen {
  return { arqueoFrom: null, arqueoTo: null, loadsKnown, note, payouts: 0, suppressedByMissingLoads: [], warnings: [] };
}

interface LoadTimeline {
  /** Cargues de una denominación dentro de `(fromMs, toMs]`. */
  between: Map<string, number>;
  /** Último cargue de una denominación hasta `toMs` (ms), para saber desde cuándo había unidades. */
  lastAt: Map<string, number>;
  /** Cargues de una denominación posteriores a `afterMs` (explican el saldo vivo del baúl). */
  after: Map<string, number>;
}

/**
 * Cronología de cargues por denominación. Sin ella el movimiento del arqueo no es interpretable:
 * una máquina recargada entre dos arqueos aparece como «no bajó» aunque haya entregado.
 */
function buildLoadTimeline(
  loads: readonly JamEarlyWarningLoad[] | null | undefined,
  fromMs: number,
  toMs: number,
  afterMs: number,
): LoadTimeline {
  const timeline: LoadTimeline = { after: new Map(), between: new Map(), lastAt: new Map() };
  for (const load of loads ?? []) {
    const at = toMillis(load.dateCreated);
    if (Number.isNaN(at)) {
      continue;
    }
    for (const detail of load.details) {
      const units = Math.abs(toInt(detail.quantity));
      if (units === 0) {
        continue;
      }
      if (at > fromMs && at <= toMs) {
        timeline.between.set(detail.denominationValue, (timeline.between.get(detail.denominationValue) ?? 0) + units);
      }
      if (at <= toMs) {
        const previous = timeline.lastAt.get(detail.denominationValue) ?? Number.NEGATIVE_INFINITY;
        if (at > previous) {
          timeline.lastAt.set(detail.denominationValue, at);
        }
      }
      if (at > afterMs) {
        timeline.after.set(detail.denominationValue, (timeline.after.get(detail.denominationValue) ?? 0) + units);
      }
    }
  }
  return timeline;
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
  // Cargues: sin esta lectura, `base − actual` miente en cualquier máquina recargada.
  const loadsKnown = Array.isArray(input.loads);
  const timeline = buildLoadTimeline(input.loads ?? null, before.at, current.at, current.at);

  if (payouts.length < JAM_EARLY_WARNING_THRESHOLDS.minimumPayouts) {
    return {
      arqueoFrom: before.tonnage.dateCreated ?? null,
      arqueoTo: current.tonnage.dateCreated ?? null,
      loadsKnown,
      note: `Menos de ${JAM_EARLY_WARNING_THRESHOLDS.minimumPayouts} pagos con devolución después del arqueo base: no hay evidencia suficiente para el semáforo.`,
      payouts: payouts.length,
      suppressedByMissingLoads: [],
      warnings: [],
    };
  }

  const baseQuantities = quantityByDenomination(before.tonnage);
  const currentQuantities = quantityByDenomination(current.tonnage);
  // Movimiento BRUTO (`base − actual`) y NETO (`base + cargues − actual`). El neto es el que
  // decide: una máquina que se recargó entre los dos arqueos tiene movimiento bruto ≤ 0 aunque
  // haya entregado, y acusarla sería un falso positivo («esa máquina fue cargada hace poco»).
  const movements = new Map<string, { gross: number; loaded: number; net: number }>();
  const stockAtBase = new Map<string, number>();
  for (const [denominationValue, baseQuantity] of baseQuantities) {
    const currentQuantity = currentQuantities.get(denominationValue);
    if (currentQuantity === undefined) {
      // El módulo no aparece en el arqueo actual: sin dato comparable, no se acusa.
      continue;
    }
    const loaded = timeline.between.get(denominationValue) ?? 0;
    const gross = baseQuantity - currentQuantity;
    stockAtBase.set(denominationValue, baseQuantity);
    movements.set(denominationValue, { gross, loaded, net: gross + loaded });
  }

  const compensators = [...movements.entries()]
    .filter(([, movement]) => movement.net > 0)
    .sort((left, right) => right[1].net - left[1].net)
    .map(([denominationValue, movement]) => ({ denominationValue, movement: movement.net }))
    .slice(0, 3);
  if (compensators.length === 0) {
    return {
      arqueoFrom: before.tonnage.dateCreated ?? null,
      arqueoTo: current.tonnage.dateCreated ?? null,
      loadsKnown,
      note: "Ningún módulo entregó unidades netas en el intervalo (descontados los cargues): no se puede atribuir el cambio a una denominación concreta.",
      payouts: payouts.length,
      suppressedByMissingLoads: [],
      warnings: [],
    };
  }

  const storageByValue = new Map((input.storage ?? []).map((row) => [row.denominationValue, row]));
  const warnings: JamEarlyWarning[] = [];
  const suppressed: string[] = [];
  for (const [denominationValue, movement] of movements) {
    if (movement.net > 0) {
      continue;
    }
    // Sin cargues legibles NO se evalúa un módulo que se mantuvo o creció en el arqueo: el
    // movimiento que falta puede ser exactamente un cargue (caso real: máquina recién cargada).
    if (!loadsKnown && movement.gross <= 0) {
      suppressed.push(denominationValue);
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

    // La demanda se cuenta desde el ÚLTIMO cargue (o desde el arqueo base si no se recargó):
    // antes de una recarga no se puede afirmar que el módulo tuviera unidades, así que esos
    // pagos no son evidencia contra él.
    const demandFromMs = timeline.lastAt.get(denominationValue) ?? before.at;
    const demandPayouts = payouts.filter(
      (transaction) =>
        decimalToCents(transaction.returnAmount) >= valueCents &&
        !Number.isNaN(toMillis(transaction.dateCreated)) &&
        toMillis(transaction.dateCreated) > demandFromMs,
    );
    if (demandPayouts.length < JAM_EARLY_WARNING_THRESHOLDS.minimumDemand) {
      continue;
    }

    const storageRow = storageByValue.get(denominationValue);
    warnings.push({
      compensators,
      configuredForDispensing: storageRow?.isDispensing ?? null,
      demand: demandPayouts.length,
      demandFrom: Number.isFinite(demandFromMs) ? new Date(demandFromMs).toISOString() : null,
      denominationValue,
      grossMovement: movement.gross,
      loadedAfterArqueo: timeline.after.get(denominationValue) ?? 0,
      loadedUnits: movement.loaded,
      netMovement: movement.net,
      stock: storageRow ? Math.abs(toInt(storageRow.dpStored)) : baseStock,
    });
  }

  warnings.sort((left, right) => right.demand - left.demand || right.stock - left.stock);
  return {
    arqueoFrom: before.tonnage.dateCreated ?? null,
    arqueoTo: current.tonnage.dateCreated ?? null,
    loadsKnown,
    note:
      warnings.length > 0
        ? null
        : suppressed.length > 0
          ? `No se pudo leer el historial de cargues: ${suppressed.length} módulo(s) se mantuvieron o crecieron en el arqueo y no se evalúan sin poder descontar lo cargado.`
          : "Ningún módulo con saldo quedó sin participar en el cambio del intervalo.",
    payouts: payouts.length,
    suppressedByMissingLoads: suppressed,
    warnings,
  };
}
