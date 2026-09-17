import type { Load, PayPadStorage, Tonnage } from "@/features/paypads/schemas";
import type { TransactionStateBucket } from "@/features/transactions/schemas";

/**
 * Detección temprana de atascos (monederos/billeteros) — cálculo PURO y testeable.
 *
 * Contexto: el Pay+ no reporta un evento explícito de "atasco". La única vía con
 * los contratos que YA existen en el API es cruzar cuatro fuentes:
 *
 *  1. `PayPad/GetStorage/{id}`      → saldo por denominación del baúl dispensador
 *                                     (`dpStored`), baúl de rechazo (`rjStored`),
 *                                     `isDispensing`, `minDpQuantity`.
 *  2. `Transaction/GetByDate` (BFF) → estado de cada transacción del período
 *                                     (`Aprobada`, `Aprobada Error Devuelta`, ...) y
 *                                     los importes (`incomeAmount`, `returnAmount`).
 *  3. `Transaction/{id}/Details`    → por transacción y denominación, la operación
 *                                     (`typeOperation` + `idTypeOperation`) y la
 *                                     cantidad. Responde a "¿qué intentó entregar y
 *                                     qué entregó?".
 *  4. `Tonnage/GetByPaypad` + `Load/GetByPaypad` → arqueos (conteo FÍSICO) y cargues,
 *                                     para saber qué salió realmente del monedero.
 *
 * Regla conceptual (la del negocio):
 *  - "hay saldo suficiente pero no sale"  → posible ATRASCO.
 *  - "no hay saldo"                        → AGOTAMIENTO (ya cubierto por el umbral).
 *  - "salió menos de lo que el sistema dice entregar" → ATRASCO / descuadre.
 *
 * Semántica de las operaciones del detalle: el API entrega `typeOperation` (texto)
 * e `idTypeOperation` (id), y el catálogo de valores NO existe en el repositorio.
 * El motor clasifica por palabras clave (`failed` → `accept` → `dispense`) y,
 * además, RECONCILIA con los importes: si la suma de los detalles de salida de una
 * transacción aprobada cuadra con `returnAmount` (el cambio que sale del
 * dispensador), la lectura queda verificada; si cuadra con `incomeAmount`, los
 * nombres describen lo ACEPTADO y se desactivan sustitución/participación. Cuando
 * no hay `typeOperation` legible, la atribución se infiere del estado (error ⇒
 * intento fallido; aprobada ⇒ entregado) y solo si la transacción tiene devolución.
 *
 * Evidencia por denominación `d` (ventana analizada = transacciones con detalle
 * consultado; caída física = últimos dos arqueos consecutivos):
 *
 *   intentosFallidos(d)  = unidades de operaciones fallidas dentro de transacciones
 *                          con estado de error y devolución (o sin clasificar allí)
 *   dispensadoSistema(d) = unidades de operaciones de salida (o sin clasificar en
 *                          transacciones aprobadas con devolución)
 *   sistemaTotal(d)      = intentosFallidos(d) + dispensadoSistema(d)
 *   caidaFisica(d)       = quantityDp(arqueoPrevio, d) + cargues(previo, actual, d)
 *                          − quantityDp(arqueoActual, d)
 *
 * Señales (pesos explícitos en `jamSignalWeights`, nunca un único umbral mágico):
 *  - devuelto_con_saldo (3)   : hubo intentos fallidos y el baúl tiene unidades.
 *  - sustitucion (3)          : el pago se completó sin la denominación canónica
 *                               aunque el saldo la permitía (patrón repetido).
 *  - sin_caida_fisica (3)     : el sistema reporta movimiento y el arqueo no bajó.
 *  - participacion_perdida (2): dejó de usarse en la ventana reciente conservando saldo.
 *  - caida_corroborada (2)    : el arqueo bajó exactamente lo dispensado (los intentos
 *                               fallidos siguen en el baúl).
 *  - caida_insuficiente (1)   : el arqueo bajó menos que lo entregado registrado.
 *  - caida_sin_registro (1)   : el arqueo bajó más de lo registrado (extracción manual).
 *  - rafaga_salida (2, máquina): muchas `Aprobada Error Devuelta` en el período.
 *  - descuadre_inventario (0, informativo): el conteo subió (cargue no registrado).
 *
 * Niveles: sin_evidencia → sospecha → probable (score ≥ 3) → confirmado (score ≥ 6
 * con señales de familias distintas). Si el baúl está en el umbral de recarga
 * (legacy: `minDpQuantity + 10`) y la única evidencia es "devolvió teniendo
 * unidades", el nivel se limita a sospecha: el desabasto también explica el fallo.
 *
 * IMPORTANTE — `isDispensing` NO habilita ni bloquea señales (corrección basada en
 * un caso real: Pay+ Inder 2 tenía el monedero de 500 marcado como «No dispensa» en
 * la configuración y aun así debía entregarlo; el filtro anterior suprimía toda la
 * evidencia de esa denominación). El conjunto de denominaciones que pueden entregar
 * cambio se deduce de la EVIDENCIA: `isDispensing` OR unidades dispensadas en la
 * ventana OR caída física positiva en el intervalo de arqueos. Cuando una
 * denominación que la evidencia considera dispensadora no está marcada como tal, la
 * señal de sustitución baja de peso y se informa como posible configuración
 * desactualizada (`sustitucion_no_configurada`).
 * Los umbrales viven en `JAM_THRESHOLDS` y admiten override por parámetro (evolución
 * natural: `PayPadConfiguration.extraDataJson`, key/value, sin migración).
 */

export const RETURNED_ERROR_STATE = "Aprobada Error Devuelta";

export const jamLevels = ["sin_evidencia", "sospecha", "probable", "confirmado"] as const;
export type JamLevel = (typeof jamLevels)[number];

export const jamLevelLabels: Record<JamLevel, string> = {
  confirmado: "Atasco confirmado por datos",
  probable: "Atasco probable",
  sin_evidencia: "Sin evidencia",
  sospecha: "Posible atasco",
};

export const jamCauses = ["atasco", "agotado", "sin_evidencia"] as const;
export type JamCause = (typeof jamCauses)[number];

export const jamCauseLabels: Record<JamCause, string> = {
  agotado: "Sin saldo (agotamiento)",
  atasco: "Atasco",
  sin_evidencia: "Sin evidencia",
};

export type JamSignalCode =
  | "caida_corroborada"
  | "caida_insuficiente"
  | "caida_sin_registro"
  | "config_inconsistente"
  | "descuadre_inventario"
  | "devuelto_con_saldo"
  | "inactiva_con_saldo"
  | "participacion_perdida"
  | "rafaga_salida"
  | "rechazo_con_unidades"
  | "sin_caida_fisica"
  | "sustitucion"
  | "sustitucion_no_configurada";

export interface JamThresholds {
  /** Transacciones `Aprobada Error Devuelta` en el período para declarar ráfaga de salida. */
  burstTransactions: number;
  /** Score para "confirmado" (además exige >= 2 señales y una señal núcleo). */
  confirmedScore: number;
  /** Tolerancia legacy del arqueo: saldo <= minDpQuantity + tolerancia ⇒ umbral de recarga. */
  lowBalanceTolerance: number;
  /** Unidades no entregadas mínimas para emitir "devolvió teniendo unidades". */
  minimumFailedUnits: number;
  /** Pagos recientes mínimos para evaluar pérdida de participación. */
  minimumRecentPayouts: number;
  /** Eventos de sustitución (transacciones distintas) para declarar patrón. */
  minimumSubstitutionEvents: number;
  /** Score para "probable". */
  probableScore: number;
  /** Caída de participación (previa − reciente) mínima para marcar participación perdida. */
  participationDropRatio: number;
  /** Participación previa mínima para considerar que la denominación se usaba. */
  participationPreviousRatio: number;
}

export const JAM_THRESHOLDS: JamThresholds = {
  burstTransactions: 3,
  confirmedScore: 6,
  lowBalanceTolerance: 10,
  minimumFailedUnits: 2,
  minimumRecentPayouts: 3,
  minimumSubstitutionEvents: 2,
  participationDropRatio: 0.6,
  participationPreviousRatio: 0.3,
  probableScore: 3,
};

/** Peso y etiqueta de cada señal: el score es la suma de las señales presentes. */
export const jamSignalWeights: Record<JamSignalCode, number> = {
  caida_corroborada: 2,
  caida_insuficiente: 1,
  caida_sin_registro: 1,
  config_inconsistente: 1,
  descuadre_inventario: 0,
  devuelto_con_saldo: 3,
  inactiva_con_saldo: 2,
  participacion_perdida: 2,
  rafaga_salida: 2,
  rechazo_con_unidades: 1,
  sin_caida_fisica: 3,
  sustitucion: 3,
  sustitucion_no_configurada: 3,
};

export const jamSignalLabels: Record<JamSignalCode, string> = {
  caida_corroborada: "Arqueo corroboró los fallos",
  caida_insuficiente: "Arqueo bajó menos de lo entregado",
  caida_sin_registro: "Salió sin registro en el sistema",
  config_inconsistente: "Configuración contradice el arqueo",
  descuadre_inventario: "Descuadre de inventario",
  devuelto_con_saldo: "Devolvió teniendo saldo",
  inactiva_con_saldo: "No participó con saldo (arqueo)",
  participacion_perdida: "Dejó de usarse",
  rafaga_salida: "Ráfaga de error devuelta",
  rechazo_con_unidades: "Baúl de rechazo con unidades",
  sin_caida_fisica: "El arqueo no bajó nada",
  sustitucion: "Se sustituyó por denominación menor",
  sustitucion_no_configurada: "Sustitución con denominación no configurada",
};

/** Señales que por sí solas describen un atasco de monedero/billetero. */
const jamCoreSignals: readonly JamSignalCode[] = ["devuelto_con_saldo", "sin_caida_fisica", "sustitucion", "sustitucion_no_configurada"];

/**
 * Categorías de operación del detalle:
 * - `dispense`: dinero que SALE del dispensador (cambio/devuelta/entrega).
 * - `failed`  : intento de salida fallido o rechazado (error, rechazo, fallo).
 * - `accept`  : dinero ACEPTADO (entra al aceptador); no participa del diagnóstico.
 * - `unknown` : sin nombre legible; se infiere desde el estado de la transacción.
 */
export type JamOperationKind = "accept" | "dispense" | "failed" | "unknown";

export interface JamScanDetail {
  denominationId: number | null;
  operation: string | null;
  operationId: number | null;
  quantity: string;
}

export interface JamScanTransaction {
  dateCreated: string | null;
  details: readonly JamScanDetail[];
  id: number;
  incomeAmount: string;
  realAmount: string;
  returnAmount: string;
  stateTransaction: string;
  totalAmount: string;
}

export interface JamScanPayload {
  detailsFailures: number;
  /** Detalles normalizados desde una forma inesperada (opcional por compatibilidad). */
  detailsMalformed?: number;
  detailsRequests: number;
  /** Motivos sanitizados de los fallos de detalle (opcional por compatibilidad). */
  failureReasons?: readonly string[];
  generatedAt: string;
  maxTransactions: number;
  scannedFrom: string | null;
  scannedTo: string | null;
  transactions: readonly JamScanTransaction[];
  truncated: boolean;
}

export interface JamDiagnosticsInput {
  byState: Readonly<Record<string, TransactionStateBucket>>;
  loads: readonly Load[];
  /** Período solicitado en la UI (ISO); delimita la validez de la caída física. */
  rangeFrom?: string | null;
  rangeTo?: string | null;
  scan: JamScanPayload | null;
  storage: readonly PayPadStorage[];
  thresholds?: Partial<JamThresholds>;
  tonnages: readonly Tonnage[];
}

export interface JamSignalEvidence {
  code: JamSignalCode;
  detail: string;
  weight: number;
}

export interface JamDenominationRow {
  cause: JamCause;
  denominationId: number;
  denominationImage: string | null;
  denominationValue: string;
  /** Lo que dice Pay+ → Configurar denominaciones (puede estar desactualizado). */
  configuredForDispensing: boolean;
  /** Lo que la evidencia muestra: movimiento físico, dispensado o sustituciones. */
  dispensesByEvidence: boolean;
  dispensedUnits: number;
  /** Sin unidades en el baúl: los fallos se explican por agotamiento. */
  empty: boolean;
  failedTransactions: readonly number[];
  failedUnits: number;
  inferredUnits: number;
  lastEvidenceAt: string | null;
  level: JamLevel;
  /** Saldo en el umbral de recarga legacy (`minDpQuantity + tolerancia`). */
  low: boolean;
  minDpQuantity: number;
  operationNames: readonly string[];
  physicalDrop: { coveredByScan: boolean; units: number | null; windowFrom: string | null; windowTo: string | null };
  /** Unidades en operaciones de rechazo que no son intentos de salida (contexto). */
  rejectedUnits: number;
  /** Saldo del baúl de rechazo (RJ). */
  rejectionStock: number;
  score: number;
  signals: readonly JamSignalEvidence[];
  stock: number;
  stockValue: string;
  /** Pagos que se completaron sin esta denominación estando configurada como dispensadora. */
  substitutionEvents: number;
  /** Igual, pero con la denominación marcada como «No dispensa» (posible configuración vencida). */
  unconfiguredSubstitutionEvents: number;
  suggestedAction: string | null;
  summary: string;
}

export interface JamIncident {
  cause: JamCause;
  denominationId: number | null;
  denominationValue: string | null;
  detail: string;
  evidence: readonly string[];
  kind: "monedero" | "salida";
  lastEvidenceAt: string | null;
  level: JamLevel;
  suggestedAction: string;
  title: string;
}

/** Lectura verificada (o no) de las operaciones del detalle frente a los importes. */
export interface JamInterpretation {
  /** Transacciones cuya suma de salidas cuadró con `incomeAmount` (lectura invertida). */
  incomeMatches: number;
  inverted: boolean;
  /** Transacciones cuya suma de salidas cuadró con `returnAmount`. */
  returnMatches: number;
  /** Cómo se dedujo el rol de `idTypeOperation`: por importes o por ningún método. */
  roleMethod: "importes" | "ninguno";
  verified: boolean;
}

export interface JamDiagnostics {
  analyzed: boolean;
  /** Ninguna transacción analizada devolvió detalle: el diagnóstico es ciego. */
  blind: boolean;
  failureReasons: readonly string[];
  headline: string;
  incidents: readonly JamIncident[];
  interpretation: JamInterpretation;
  rows: readonly JamDenominationRow[];
  scanned: {
    detailsFailures: number;
    detailsRequests: number;
    firstTransactionAt: string | null;
    lastTransactionAt: string | null;
    payoutsAnalyzed: number;
    transactions: number;
    truncated: boolean;
  };
  warnings: readonly string[];
}

const failedOperationPattern = /error|fall|rechaz/i;
const acceptOperationPattern = /acept|recib|ingres|deposit|entrada|carga/i;
const dispenseOperationPattern = /dispens|entreg|devuel|vuelta|retorn|cambio|expend|salida|pago/i;

/**
 * Clasifica la operación del detalle. El orden importa: un nombre como
 * «Devuelta Error» describe un intento de salida fallido, no una entrega.
 */
export function classifyJamOperation(operation: string | null): JamOperationKind {
  const text = operation?.trim() ?? "";
  if (text.length === 0) {
    return "unknown";
  }

  if (failedOperationPattern.test(text)) {
    return "failed";
  }

  if (acceptOperationPattern.test(text)) {
    return "accept";
  }

  return dispenseOperationPattern.test(text) ? "dispense" : "unknown";
}

export function isErrorReturnedState(state: string | null | undefined): boolean {
  return /error/i.test(state?.trim() ?? "");
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

  return new Date(value).getTime();
}

/** Centavos con signo a partir de un decimal del API (string/number). */
export function decimalToCents(value: string | number | null | undefined): bigint {
  if (value === null || value === undefined) {
    return 0n;
  }

  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(value).trim());
  if (!match) {
    return 0n;
  }

  const fraction = (match[3] ?? "").slice(0, 2).padEnd(2, "0");
  const cents = BigInt(match[2] ?? "0") * 100n + BigInt(fraction);
  return match[1] === "-" ? -cents : cents;
}

interface MixPlan {
  units: Map<number, number>;
  valueCents: bigint;
}

/**
 * Combinación canónica (menor cantidad de unidades, mayor denominación primero)
 * de un valor con las denominaciones disponibles del dispensador. Devuelve `null`
 * si el valor no se puede armar exactamente: en ese caso no se emite evidencia de
 * sustitución (el algoritmo de entrega del Pay+ puede usar otro criterio).
 */
export function canonicalPayoutMix(
  valueCents: bigint,
  denominations: readonly { denominationId: number; units: number; valueCents: bigint }[],
): MixPlan | null {
  if (valueCents <= 0n) {
    return null;
  }

  const sorted = [...denominations]
    .filter((entry) => entry.units > 0 && entry.valueCents > 0n)
    .sort((left, right) => (right.valueCents === left.valueCents ? right.units - left.units : right.valueCents > left.valueCents ? 1 : -1));
  const units = new Map<number, number>();
  let remainder = valueCents;

  for (const entry of sorted) {
    if (remainder < entry.valueCents) {
      continue;
    }

    const wanted = remainder / entry.valueCents;
    const available = BigInt(entry.units);
    const used = wanted > available ? available : wanted;
    if (used > 0n) {
      units.set(entry.denominationId, Number(used));
      remainder -= used * entry.valueCents;
    }
  }

  return remainder === 0n ? { units, valueCents } : null;
}

interface DenominationAggregate {
  dispensedUnits: number;
  failedTransactions: Set<number>;
  failedUnits: number;
  inferredUnits: number;
  lastEvidenceAt: string | null;
  operationNames: Set<string>;
  payoutTransactions: Set<number>;
  rejectedUnits: number;
  substitutionEvents: number;
  unconfiguredSubstitutionEvents: number;
}

function createAggregate(): DenominationAggregate {
  return {
    dispensedUnits: 0,
    failedTransactions: new Set<number>(),
    failedUnits: 0,
    inferredUnits: 0,
    lastEvidenceAt: null,
    operationNames: new Set<string>(),
    payoutTransactions: new Set<number>(),
    rejectedUnits: 0,
    substitutionEvents: 0,
    unconfiguredSubstitutionEvents: 0,
  };
}

function loadQuantityForDenomination(
  loads: readonly Load[],
  denominationId: number,
  denominationValue: string,
  fromMillis: number,
  toMillisValue: number,
): number {
  let total = 0;
  for (const load of loads) {
    const time = toMillis(load.dateCreated);
    if (Number.isNaN(time) || time <= fromMillis || time > toMillisValue) {
      continue;
    }

    for (const detail of load.details) {
      const matchesId = detail.idCurrencyDenomination !== null && detail.idCurrencyDenomination === denominationId;
      const matchesValue = detail.idCurrencyDenomination === null && toInt(detail.denominationValue) === toInt(denominationValue);
      if (matchesId || matchesValue) {
        total += toInt(detail.quantity);
      }
    }
  }
  return total;
}

function tonnageQuantity(tonnage: Tonnage | null, denominationId: number): number | null {
  if (!tonnage) {
    return null;
  }

  const detail = tonnage.details.find((item) => item.idCurrencyDenomination === denominationId);
  return detail ? toInt(detail.quantityDp) : null;
}

/**
 * Cuando `typeOperation` viene nulo o con un nombre no clasificable, el rol de cada
 * `idTypeOperation` se deduce de los IMPORTES: la operación cuyo valor acumulado
 * sigue a `returnAmount` (dinero que sale) es de dispensado; la que sigue a
 * `incomeAmount − returnAmount` es de aceptación. Es inferencia estadística sobre el
 * propio período, no una suposición sobre el catálogo de la base.
 */
export function inferOperationRoles(
  transactions: readonly JamScanTransaction[],
  denominationValueById: ReadonlyMap<number, bigint>,
): { method: "importes" | "ninguno"; roles: Map<string, JamOperationKind> } {
  const totals = new Map<string, bigint>();
  let expectedOut = 0n;
  let expectedIn = 0n;

  for (const transaction of transactions) {
    if (isErrorReturnedState(transaction.stateTransaction)) {
      continue;
    }

    const payoutCents = decimalToCents(transaction.returnAmount);
    if (payoutCents <= 0n) {
      continue;
    }

    expectedOut += payoutCents;
    const inCents = decimalToCents(transaction.incomeAmount) - payoutCents;
    expectedIn += inCents > 0n ? inCents : 0n;

    for (const detail of transaction.details) {
      if (detail.denominationId === null) {
        continue;
      }
      const key = detail.operationId !== null ? `op:${detail.operationId}` : `name:${(detail.operation ?? "").toLowerCase()}`;
      const value = BigInt(Math.abs(toInt(detail.quantity))) * (denominationValueById.get(detail.denominationId) ?? 0n);
      totals.set(key, (totals.get(key) ?? 0n) + value);
    }
  }

  const roles = new Map<string, JamOperationKind>();
  const close = (value: bigint, expected: bigint): boolean =>
    expected > 0n && value > 0n && (value > expected ? value - expected : expected - value) * 20n <= (value > expected ? value : expected);

  let matched = 0;
  for (const [key, total] of totals) {
    if (close(total, expectedOut) && !close(total, expectedIn)) {
      roles.set(key, "dispense");
      matched += 1;
      continue;
    }

    if (close(total, expectedIn) && !close(total, expectedOut)) {
      roles.set(key, "accept");
      matched += 1;
    }
  }

  return { method: matched > 0 ? "importes" : "ninguno", roles };
}

/**
 * Pre-paso de reconciliación: ¿los detalles que parecen salidas suman el valor de
 * `returnAmount` (cambio entregado) o el de `incomeAmount` (dinero aceptado)? Es la
 * única forma de validar los nombres de operación sin el catálogo de la base.
 */
export function reconcileDetailInterpretation(
  transactions: readonly JamScanTransaction[],
  denominationValueById: ReadonlyMap<number, bigint>,
): JamInterpretation {
  let returnMatches = 0;
  let incomeMatches = 0;

  for (const transaction of transactions) {
    const payoutCents = decimalToCents(transaction.returnAmount);
    if (payoutCents <= 0n || isErrorReturnedState(transaction.stateTransaction)) {
      continue;
    }

    let sideTotal = 0n;
    for (const detail of transaction.details) {
      if (detail.denominationId === null || classifyJamOperation(detail.operation) !== "dispense") {
        continue;
      }
      sideTotal += BigInt(Math.abs(toInt(detail.quantity))) * (denominationValueById.get(detail.denominationId) ?? 0n);
    }

    if (sideTotal === 0n) {
      continue;
    }

    if (sideTotal === payoutCents) {
      returnMatches += 1;
      continue;
    }

    if (sideTotal === decimalToCents(transaction.incomeAmount)) {
      incomeMatches += 1;
    }
  }

  const comparable = returnMatches + incomeMatches;
  const inverted = incomeMatches > returnMatches;
  return {
    incomeMatches,
    inverted,
    returnMatches,
    roleMethod: "ninguno",
    verified: comparable > 0 && !inverted,
  };
}

function buildSummary(
  level: JamLevel,
  cause: JamCause,
  failedUnits: number,
  dispensedUnits: number,
  physicalDrop: number | null,
  substitutions: number,
): string {
  if (cause === "agotado" && level === "sin_evidencia") {
    return "Sin unidades en el baúl: los fallos de entrega se explican por agotamiento y no por atasco.";
  }

  if (level === "sin_evidencia") {
    return "Sin evidencia de atasco en la ventana analizada.";
  }

  const parts: string[] = [];
  if (failedUnits > 0) {
    parts.push(`${failedUnits} unidad(es) no entregada(s) con unidades disponibles en el baúl`);
  }
  if (dispensedUnits > 0) {
    parts.push(`${dispensedUnits} unidad(es) dispensada(s) registrada(s) por el sistema`);
  }
  if (substitutions > 0) {
    parts.push(`${substitutions} pago(s) se completaron con denominaciones menores teniendo saldo disponible`);
  }
  if (physicalDrop !== null) {
    parts.push(`caída física del arqueo: ${physicalDrop} unidad(es)`);
  }

  return parts.length === 0 ? "Señales de atasco detectadas en la ventana analizada." : `${parts.join(" · ")}.`;
}

function buildSuggestedAction(cause: JamCause, level: JamLevel): string | null {
  if (level === "sin_evidencia") {
    return null;
  }

  if (cause === "agotado") {
    return "Programar el cargue de la denominación y confirmar con arqueo que el conteo físico coincide.";
  }

  return "Verificar el módulo en sitio: liberar la obstrucción, registrar arqueo de la denominación y, si el cuadre no cierra, escalar al proveedor del Pay+.";
}

/** Evidencia independiente: física (arqueo) o fallo explícito de entrega. */
const jamIndependentSignals: readonly JamSignalCode[] = [
  "caida_corroborada",
  "caida_insuficiente",
  "caida_sin_registro",
  "devuelto_con_saldo",
  "sin_caida_fisica",
];

function levelFromScore(score: number, signals: readonly JamSignalEvidence[], thresholds: JamThresholds): JamLevel {
  const hasCoreSignal = signals.some((signal) => jamCoreSignals.includes(signal.code));
  const hasIndependentSignal = signals.some((signal) => jamIndependentSignals.includes(signal.code));
  // "Confirmado" exige evidencia independiente de la composición de pagos: la
  // sustitución sola puede deberse al algoritmo de entrega del Pay+.
  if (score >= thresholds.confirmedScore && signals.length >= 2 && hasCoreSignal && hasIndependentSignal) {
    return "confirmado";
  }
  if (score >= thresholds.probableScore) {
    return "probable";
  }
  if (score >= 1) {
    return "sospecha";
  }
  return "sin_evidencia";
}

export function computeJamDiagnostics(input: JamDiagnosticsInput): JamDiagnostics {
  const thresholds: JamThresholds = { ...JAM_THRESHOLDS, ...input.thresholds };
  const { byState, loads, rangeFrom, rangeTo, scan, storage, tonnages } = input;
  const warnings: string[] = [];
  const requestedFrom = toMillis(rangeFrom ?? null);
  const requestedTo = toMillis(rangeTo ?? null);
  const detailsBlind = scan !== null && scan.detailsRequests > 0 && scan.detailsFailures >= scan.detailsRequests;
  const detailsPartial = scan !== null && scan.detailsFailures > 0 && !detailsBlind;

  const tonnagesDesc = [...tonnages]
    .filter((tonnage) => !Number.isNaN(toMillis(tonnage.dateCreated)))
    .sort((left, right) => toMillis(right.dateCreated) - toMillis(left.dateCreated));
  const lastTonnage = tonnagesDesc[0] ?? null;
  const previousTonnage = tonnagesDesc[1] ?? null;
  if (!previousTonnage || !lastTonnage) {
    warnings.push(`La caída física por denominación requiere dos arqueos consecutivos; hay ${lastTonnage ? "uno" : "ninguno"}.`);
  }

  const tonnageWindowFrom = previousTonnage?.dateCreated ?? null;
  const tonnageWindowTo = lastTonnage?.dateCreated ?? null;
  const tonnageWindowValid = tonnageWindowFrom !== null && tonnageWindowTo !== null;
  if (!scan) {
    warnings.push("Falta el análisis de detalles: «Analizar atascos» atribuye devoluciones y sustituciones por denominación.");
  } else if (scan.truncated) {
    warnings.push(`El período tenía más movimientos: se analizaron ${scan.transactions.length} transacciones (máximo ${scan.maxTransactions}).`);
  }
  // El diagnóstico nunca puede declararse "limpio" si no pudo leer el detalle: eso
  // fue exactamente lo que ocultó el atasco del monedero de 500 en una máquina real.
  if (detailsBlind) {
    warnings.push(`No se pudo leer el detalle de ninguna de las ${scan?.detailsRequests ?? 0} transacciones analizadas, por eso no hay evidencia de composición de pagos.`);
  } else if (scan && scan.detailsFailures > 0) {
    warnings.push(`${scan.detailsFailures} transacción(es) no devolvieron detalle; la evidencia puede ser parcial.`);
  }
  if (scan && (scan.detailsMalformed ?? 0) > 0) {
    warnings.push(`${scan.detailsMalformed} detalle(s) llegaron con una forma inesperada y se normalizaron; revisar el contrato del endpoint si el diagnóstico no cuadra.`);
  }
  if (scan && (scan.failureReasons?.length ?? 0) > 0) {
    warnings.push(`Motivo de los fallos de detalle: ${scan.failureReasons?.join(" | ")}.`);
  }

  const errorReturnedCount = byState[RETURNED_ERROR_STATE]?.count ?? 0;
  const errorReturnedTotal = byState[RETURNED_ERROR_STATE]?.total ?? "0";
  const denominationValueById = new Map(storage.map((entry) => [entry.idCurrencyDenomination, decimalToCents(entry.denominationValue)]));

  const transactionsAsc = scan
    ? [...scan.transactions].sort((left, right) => toMillis(left.dateCreated) - toMillis(right.dateCreated))
    : [];

  let scannedFrom = Number.NaN;
  let scannedTo = Number.NaN;
  for (const transaction of transactionsAsc) {
    const time = toMillis(transaction.dateCreated);
    if (!Number.isNaN(time)) {
      scannedFrom = Number.isNaN(scannedFrom) ? time : Math.min(scannedFrom, time);
      scannedTo = Number.isNaN(scannedTo) ? time : Math.max(scannedTo, time);
    }
  }

  const interpretation = reconcileDetailInterpretation(transactionsAsc, denominationValueById);
  const inferredRoles = inferOperationRoles(transactionsAsc, denominationValueById);
  if (interpretation.inverted) {
    warnings.push("Los importes indican que las operaciones «de salida» del detalle describen lo aceptado: se desactivaron sustitución y participación para no inventar evidencia.");
  } else if (transactionsAsc.length > 0 && !interpretation.verified) {
    warnings.push("No se pudo reconciliar el detalle con los importes (sin nombres de operación o sin devoluciones): la evidencia se apoya en el estado de la transacción.");
  }

  // Conjunto de denominaciones que pueden entregar cambio: la configuración
  // (`isDispensing`) ya no es la única fuente. Un monedero marcado «No dispensa» que
  // sí bajó en el arqueo o sí aparece dispensando es evidencia suficiente; si no está
  // marcado, la sustitución se registra como posible configuración desactualizada.
  const planCandidates = new Map<number, { configured: boolean; units: number; valueCents: bigint }>();
  const previousQuantities = new Map<number, number | null>();
  const currentQuantities = new Map<number, number | null>();
  for (const entry of storage) {
    const denominationId = entry.idCurrencyDenomination;
    const previousQuantity = tonnageQuantity(previousTonnage, denominationId);
    const currentQuantity = tonnageQuantity(lastTonnage, denominationId);
    previousQuantities.set(denominationId, previousQuantity);
    currentQuantities.set(denominationId, currentQuantity);
    const physicalMovement =
      previousQuantity !== null && currentQuantity !== null ? previousQuantity - currentQuantity : null;
    const observedMovement = physicalMovement !== null && physicalMovement > 0;
    const configured = entry.isDispensing;
    const usableStock = toInt(entry.dpStored);
    if (configured || observedMovement) {
      planCandidates.set(denominationId, {
        configured,
        units: usableStock,
        valueCents: decimalToCents(entry.denominationValue),
      });
    }
  }

  const aggregation = new Map<number, DenominationAggregate>();
  let payoutsAnalyzed = 0;
  const unclassifiedOperations = new Set<string>();

  // 1) Agregados por denominación a partir de los detalles consultados.
  for (const transaction of transactionsAsc) {
    const errorState = isErrorReturnedState(transaction.stateTransaction);
    const payoutCents = decimalToCents(transaction.returnAmount);
    const hasPayout = payoutCents > 0n;
    const dispensedInTransaction = new Map<number, number>();

    for (const detail of transaction.details) {
      const denominationId = detail.denominationId;
      const rawOperation = detail.operation?.trim() || null;
      const keywordKind = classifyJamOperation(rawOperation);
      // El nombre manda cuando es clasificable; si no, se usa el rol deducido de los
      // importes para ese `idTypeOperation` (o el nombre literal como clave).
      const roleKey = detail.operationId !== null ? `op:${detail.operationId}` : `name:${(rawOperation ?? "").toLowerCase()}`;
      const kind: JamOperationKind = keywordKind !== "unknown" ? keywordKind : (inferredRoles.roles.get(roleKey) ?? "unknown");
      if (rawOperation === null) {
        unclassifiedOperations.add("sin tipo de operación");
      } else if (kind === "unknown") {
        unclassifiedOperations.add(rawOperation);
      }
      if (denominationId === null) {
        continue;
      }

      const aggregate = aggregation.get(denominationId) ?? createAggregate();
      aggregation.set(denominationId, aggregate);
      if (rawOperation !== null) {
        aggregate.operationNames.add(rawOperation);
      }

      const quantity = Math.abs(toInt(detail.quantity));
      if (quantity === 0) {
        continue;
      }

      if (kind === "accept") {
        // Dinero aceptado: pertenece al aceptador, no al dispensador.
        continue;
      }

      if (kind === "dispense") {
        aggregate.dispensedUnits += quantity;
        dispensedInTransaction.set(denominationId, (dispensedInTransaction.get(denominationId) ?? 0) + quantity);
        continue;
      }

      if (kind === "failed") {
        if (errorState && hasPayout) {
          // Intento de salida fallido en una transacción que debía devolver.
          aggregate.failedUnits += quantity;
          aggregate.failedTransactions.add(transaction.id);
          aggregate.lastEvidenceAt = transaction.dateCreated ?? aggregate.lastEvidenceAt;
        } else {
          aggregate.rejectedUnits += quantity;
        }
        continue;
      }

      // Sin nombre legible: solo se atribuye si la transacción tiene devolución.
      if (!hasPayout) {
        continue;
      }

      aggregate.inferredUnits += quantity;
      if (errorState) {
        aggregate.failedUnits += quantity;
        aggregate.failedTransactions.add(transaction.id);
        aggregate.lastEvidenceAt = transaction.dateCreated ?? aggregate.lastEvidenceAt;
      } else {
        aggregate.dispensedUnits += quantity;
        dispensedInTransaction.set(denominationId, (dispensedInTransaction.get(denominationId) ?? 0) + quantity);
      }
    }

    // 2) Sustitución: se pagó el valor esperado sin usar la denominación canónica.
    const isPayout = !errorState && hasPayout && dispensedInTransaction.size > 0 && !interpretation.inverted;
    if (!isPayout) {
      continue;
    }

    payoutsAnalyzed += 1;
    let actualTotal = 0n;
    for (const [denominationId, quantity] of dispensedInTransaction) {
      actualTotal += BigInt(quantity) * (denominationValueById.get(denominationId) ?? 0n);
    }

    if (actualTotal === payoutCents) {
      const plan = canonicalPayoutMix(
        payoutCents,
        [...planCandidates].map(([denominationId, candidate]) => ({
          denominationId,
          units: candidate.units,
          valueCents: candidate.valueCents,
        })),
      );

      if (plan) {
        for (const [denominationId, plannedUnits] of plan.units) {
          if ((dispensedInTransaction.get(denominationId) ?? 0) >= plannedUnits) {
            continue;
          }

          const aggregate = aggregation.get(denominationId) ?? createAggregate();
          if (planCandidates.get(denominationId)?.configured) {
            aggregate.substitutionEvents += 1;
          } else {
            aggregate.unconfiguredSubstitutionEvents += 1;
          }
          aggregate.failedTransactions.add(transaction.id);
          aggregate.lastEvidenceAt = transaction.dateCreated ?? aggregate.lastEvidenceAt;
          aggregation.set(denominationId, aggregate);
        }
      }
    }

    // Participación: en cuántos pagos participó cada denominación.
    for (const denominationId of dispensedInTransaction.keys()) {
      const aggregate = aggregation.get(denominationId) ?? createAggregate();
      aggregate.payoutTransactions.add(transaction.id);
      aggregation.set(denominationId, aggregate);
    }
  }

  // 3) Segmentación para la señal de participación (2/3 previos vs 1/3 reciente).
  const recentCutoffIndex = Math.max(0, transactionsAsc.length - Math.max(1, Math.round(transactionsAsc.length / 3)));
  const recentTransactionIds = new Set(transactionsAsc.slice(recentCutoffIndex).map((transaction) => transaction.id));
  const payoutTransactionIds = new Set<number>();
  for (const aggregate of aggregation.values()) {
    for (const id of aggregate.payoutTransactions) {
      payoutTransactionIds.add(id);
    }
  }
  const recentPayoutCount = [...payoutTransactionIds].filter((id) => recentTransactionIds.has(id)).length;
  const previousPayoutCount = payoutTransactionIds.size - recentPayoutCount;
  const canMeasureParticipation = recentPayoutCount >= thresholds.minimumRecentPayouts && previousPayoutCount >= thresholds.minimumRecentPayouts;

  // 4) Filas por denominación del baúl. La configuración (`isDispensing`) informa,
  //    pero no habilita ni bloquea la evidencia: en la máquina real Pay+ Inder 2 el
  //    monedero de 500 estaba marcado «No dispensa» y sí debía entregar.
  const machineMovedInWindow = [...planCandidates.keys()].some((denominationId) => {
    const previous = previousQuantities.get(denominationId) ?? null;
    const current = currentQuantities.get(denominationId) ?? null;
    return previous !== null && current !== null && previous - current > 0;
  });
  const rows: JamDenominationRow[] = storage
    .map((entry) => {
      const denominationId = entry.idCurrencyDenomination;
      const aggregate = aggregation.get(denominationId) ?? createAggregate();
      const stock = toInt(entry.dpStored);
      const minDpQuantity = toInt(entry.minDpQuantity);
      // `low` reutiliza el umbral legacy del arqueo; `empty` exige cero unidades:
      // un fallo con el baúl lleno es más sospechoso que con el baúl en el umbral.
      const low = entry.isDispensing && stock <= minDpQuantity + thresholds.lowBalanceTolerance;
      const empty = stock <= 0;

      const previousQuantity = previousQuantities.get(denominationId) ?? null;
      const currentQuantity = currentQuantities.get(denominationId) ?? null;
      const observedMovement = previousQuantity !== null && currentQuantity !== null ? previousQuantity - currentQuantity : null;
      // ¿Esta denominación entrega? Configuración O evidencia (movimiento físico,
      // unidades dispensadas en la ventana o sustituciones detectadas).
      const evidencedDispensing =
        (observedMovement !== null && observedMovement > 0) ||
        aggregate.dispensedUnits > 0 ||
        aggregate.unconfiguredSubstitutionEvents > 0;
      const dispenses = entry.isDispensing || evidencedDispensing;
      const usable = dispenses && !empty;
      let physicalDrop: number | null = null;
      if (tonnageWindowValid && previousQuantity !== null && currentQuantity !== null && tonnageWindowFrom !== null && tonnageWindowTo !== null) {
        const loaded = loadQuantityForDenomination(loads, denominationId, entry.denominationValue, toMillis(tonnageWindowFrom), toMillis(tonnageWindowTo));
        physicalDrop = previousQuantity + loaded - currentQuantity;
      }

      // La caída física solo es evidencia si TODO movimiento del intervalo del
      // arqueo fue analizado: el intervalo debe empezar dentro de lo analizado y,
      // si el análisis quedó truncado, terminar antes de la última transacción
      // consultada (los movimientos posteriores no se vieron).
      const intervalStart = toMillis(tonnageWindowFrom ?? null);
      const intervalEnd = toMillis(tonnageWindowTo ?? null);
      const insideRequestedRange =
        !Number.isNaN(intervalStart) &&
        !Number.isNaN(intervalEnd) &&
        (Number.isNaN(requestedFrom) || intervalStart >= requestedFrom) &&
        (Number.isNaN(requestedTo) || intervalEnd <= requestedTo);
      const insideScannedWindow =
        !Number.isNaN(intervalStart) &&
        !Number.isNaN(intervalEnd) &&
        !Number.isNaN(scannedFrom) &&
        !Number.isNaN(scannedTo) &&
        intervalStart >= scannedFrom &&
        intervalEnd <= scannedTo;
      // Con el análisis completo del período basta con que el intervalo esté dentro
      // del rango solicitado; si quedó truncado, debe estar dentro de lo analizado.
      const coveredByScan =
        scan !== null && physicalDrop !== null && insideRequestedRange && (!scan.truncated || insideScannedWindow);

      const systemUnits = aggregate.dispensedUnits + aggregate.failedUnits;
      const rejectionStock = toInt(entry.rjStored);
      const signals: JamSignalEvidence[] = [];

      if (usable && aggregate.failedUnits >= thresholds.minimumFailedUnits) {
        signals.push({
          code: "devuelto_con_saldo",
          detail: low
            ? `${aggregate.failedUnits} unidad(es) no entregada(s) en ${aggregate.failedTransactions.size} transacción(es) y el baúl tiene ${stock} unidad(es), por debajo del umbral de recarga (${minDpQuantity + thresholds.lowBalanceTolerance}): confirmar con arqueo que no sea desabasto.`
            : `${aggregate.failedUnits} unidad(es) no entregada(s) en ${aggregate.failedTransactions.size} transacción(es) y el baúl conserva ${stock} unidad(es) por encima del umbral de recarga (${minDpQuantity + thresholds.lowBalanceTolerance}).`,
          weight: jamSignalWeights.devuelto_con_saldo,
        });
      }

      if (usable && aggregate.substitutionEvents >= thresholds.minimumSubstitutionEvents) {
        signals.push({
          code: "sustitucion",
          detail: `En ${aggregate.substitutionEvents} pago(s) el valor se completó con otras denominaciones aunque esta tenía saldo suficiente.`,
          weight: jamSignalWeights.sustitucion,
        });
      }

      if (!entry.isDispensing && !empty && aggregate.unconfiguredSubstitutionEvents >= thresholds.minimumSubstitutionEvents) {
        signals.push({
          code: "sustitucion_no_configurada",
          detail: `En ${aggregate.unconfiguredSubstitutionEvents} pago(s) el valor se completó sin esta denominación aunque tenía ${stock} unidad(es). La configuración la marca como «No dispensa»: puede ser un atasco o una configuración desactualizada (corregir en Pay+ → Configurar denominaciones).`,
          weight: jamSignalWeights.sustitucion_no_configurada,
        });
      }

      if (usable && canMeasureParticipation) {
        const recentUses = [...aggregate.payoutTransactions].filter((id) => recentTransactionIds.has(id)).length;
        const previousUses = aggregate.payoutTransactions.size - recentUses;
        const previousRatio = previousUses / previousPayoutCount;
        const recentRatio = recentUses / recentPayoutCount;
        if (previousRatio >= thresholds.participationPreviousRatio && previousRatio - recentRatio >= thresholds.participationDropRatio) {
          signals.push({
            code: "participacion_perdida",
            detail: `Participaba en el ${Math.round(previousRatio * 100)}% de los pagos previos y ahora en el ${Math.round(recentRatio * 100)}%, con ${stock} unidad(es) en el baúl.`,
            weight: jamSignalWeights.participacion_perdida,
          });
        }
      }

      if (coveredByScan && physicalDrop !== null) {
        if (systemUnits > 0 && physicalDrop === 0) {
          signals.push({
            code: "sin_caida_fisica",
            detail: `El sistema registra ${systemUnits} unidad(es) en movimiento y el arqueo no redujo el conteo del baúl.`,
            weight: jamSignalWeights.sin_caida_fisica,
          });
        } else if (aggregate.failedUnits >= thresholds.minimumFailedUnits && aggregate.dispensedUnits > 0 && physicalDrop === aggregate.dispensedUnits) {
          signals.push({
            code: "caida_corroborada",
            detail: `El arqueo bajó exactamente lo dispensado (${aggregate.dispensedUnits}); las ${aggregate.failedUnits} unidad(es) no entregada(s) siguen en el baúl.`,
            weight: jamSignalWeights.caida_corroborada,
          });
        } else if (aggregate.dispensedUnits > 0 && physicalDrop < aggregate.dispensedUnits) {
          signals.push({
            code: "caida_insuficiente",
            detail: `El arqueo bajó ${physicalDrop} unidad(es) y el sistema registra ${aggregate.dispensedUnits} dispensada(s).`,
            weight: jamSignalWeights.caida_insuficiente,
          });
        } else if (physicalDrop > systemUnits) {
          signals.push({
            code: "caida_sin_registro",
            detail: `El arqueo bajó ${physicalDrop} unidad(es) y el sistema solo registra ${systemUnits}: posible liberación manual de la obstrucción sin registrar.`,
            weight: jamSignalWeights.caida_sin_registro,
          });
        }
      }

      // No participó en el intervalo del arqueo aunque la máquina sí movió otras
      // denominaciones y esta conserva saldo: es la única evidencia posible cuando el
      // Pay+ no devuelve error (entrega silenciosa con denominaciones menores).
      if (
        observedMovement === 0 &&
        !empty &&
        dispenses &&
        machineMovedInWindow &&
        aggregate.dispensedUnits === 0
      ) {
        signals.push({
          code: "inactiva_con_saldo",
          detail: `${coveredByScan ? "" : "Evidencia de arqueos (fuera del período seleccionado): "}en el intervalo ${tonnageWindowFrom ?? "—"} → ${tonnageWindowTo ?? "—"} otras denominaciones bajaron y esta no se movió, conservando ${stock} unidad(es).`,
          weight: coveredByScan ? jamSignalWeights.inactiva_con_saldo : 1,
        });
      }

      if (rejectionStock > 0 && (aggregate.failedUnits >= thresholds.minimumFailedUnits || aggregate.rejectedUnits > 0)) {
        signals.push({
          code: "rechazo_con_unidades",
          detail: `El baúl de rechazo tiene ${rejectionStock} unidad(es) y hubo ${aggregate.failedUnits + aggregate.rejectedUnits} unidad(es) rechazada(s)/no entregada(s).`,
          weight: jamSignalWeights.rechazo_con_unidades,
        });
      }

      if (!entry.isDispensing && observedMovement !== null && observedMovement > 0) {
        signals.push({
          code: "config_inconsistente",
          detail: `La configuración la marca como «No dispensa», pero el arqueo muestra ${observedMovement} unidad(es) menos en el baúl: actualizar Pay+ → Configurar denominaciones para que la detección tenga la configuración correcta.`,
          weight: jamSignalWeights.config_inconsistente,
        });
      }

      if (physicalDrop !== null && physicalDrop < 0) {
        signals.push({
          code: "descuadre_inventario",
          detail: `El conteo físico subió ${-physicalDrop} unidad(es) entre arqueos: cargue no registrado o descuadre previo; la caída física no se usa como evidencia.`,
          weight: jamSignalWeights.descuadre_inventario,
        });
      }

      const score = signals.reduce((total, signal) => total + signal.weight, 0);
      let level = levelFromScore(score, signals, thresholds);
      // Con el baúl en el umbral de recarga y una sola señal de "devolvió teniendo
      // unidades", el desabasto es una explicación tan razonable como el atasco.
      if (level === "probable" && low && !empty && signals.every((signal) => signal.code === "devuelto_con_saldo")) {
        level = "sospecha";
      }
      const cause: JamCause = level !== "sin_evidencia" ? "atasco" : empty && dispenses ? "agotado" : "sin_evidencia";

      return {
        cause,
        denominationId,
        denominationImage: entry.imgDenom ?? null,
        denominationValue: entry.denominationValue,
        dispensedUnits: aggregate.dispensedUnits,
        empty,
        failedTransactions: [...aggregate.failedTransactions].slice(0, 5),
        failedUnits: aggregate.failedUnits,
        inferredUnits: aggregate.inferredUnits,
        configuredForDispensing: entry.isDispensing,
        dispensesByEvidence: evidencedDispensing,
        lastEvidenceAt: aggregate.lastEvidenceAt,
        level,
        low,
        minDpQuantity,
        operationNames: [...aggregate.operationNames],
        physicalDrop: { coveredByScan, units: physicalDrop, windowFrom: tonnageWindowFrom, windowTo: tonnageWindowTo },
        rejectedUnits: aggregate.rejectedUnits,
        rejectionStock,
        score,
        signals,
        stock,
        stockValue: entry.dpTotal,
        substitutionEvents: aggregate.substitutionEvents,
        unconfiguredSubstitutionEvents: aggregate.unconfiguredSubstitutionEvents,
        suggestedAction: buildSuggestedAction(cause, level),
        summary: buildSummary(
          level,
          cause,
          aggregate.failedUnits,
          aggregate.dispensedUnits,
          physicalDrop,
          aggregate.substitutionEvents + aggregate.unconfiguredSubstitutionEvents,
        ),
      } satisfies JamDenominationRow;
    })
    .sort((left, right) => right.score - left.score || toInt(right.denominationValue) - toInt(left.denominationValue));

  // 5) Incidentes: uno por denominación con evidencia + ráfaga de salida a nivel de máquina.
  const incidents: JamIncident[] = [];
  for (const row of rows) {
    if (row.level === "sin_evidencia" || row.cause !== "atasco") {
      continue;
    }

    incidents.push({
      cause: row.cause,
      denominationId: row.denominationId,
      denominationValue: row.denominationValue,
      detail: row.summary,
      evidence: row.signals.map((signal) => `${jamSignalLabels[signal.code]}: ${signal.detail}`),
      kind: "monedero",
      lastEvidenceAt: row.lastEvidenceAt,
      level: row.level,
      suggestedAction: row.suggestedAction ?? "Revisar el módulo con arqueo de la denominación.",
      title: `Posible atasco en la denominación ${row.denominationValue}`,
    });
  }

  if (errorReturnedCount >= thresholds.burstTransactions) {
    incidents.push({
      cause: "atasco",
      denominationId: null,
      denominationValue: null,
      detail: `${errorReturnedCount} transacciones «${RETURNED_ERROR_STATE}» por ${errorReturnedTotal} en el período. Si no se concentra en una denominación, apunta a la ruta de salida común del dispensador.`,
      evidence: [`Ráfaga de error devuelta: ${errorReturnedCount} transacción(es) en el período.`],
      kind: "salida",
      lastEvidenceAt: scan?.scannedTo ?? null,
      level: errorReturnedCount >= thresholds.burstTransactions * 2 ? "probable" : "sospecha",
      suggestedAction: "Revisar la ruta de salida (rodillos, sensor de presencia y boca de entrega) antes de la próxima recarga; contrastar con el baúl de rechazo del último arqueo.",
      title: "Ráfaga de «Aprobada Error Devuelta»",
    });
  }

  const levelOrder: Record<JamLevel, number> = { confirmado: 0, probable: 1, sin_evidencia: 3, sospecha: 2 };
  incidents.sort((left, right) => levelOrder[left.level] - levelOrder[right.level]);

  const confirmed = incidents.filter((incident) => incident.level === "confirmado").length;
  const probable = incidents.filter((incident) => incident.level === "probable").length;
  const suspected = incidents.filter((incident) => incident.level === "sospecha").length;
  const headline =
    incidents.length > 0
      ? `${incidents.length} incidente(s) de dispensado: ${confirmed} confirmado(s), ${probable} probable(s) y ${suspected} en observación.`
      : detailsBlind
        ? "Diagnóstico incompleto: no se pudo leer el detalle de ninguna transacción analizada, así que la composición de los pagos no está verificada."
        : detailsPartial
          ? "Sin incidentes con la evidencia disponible, pero el detalle de algunas transacciones no se pudo leer: el diagnóstico es parcial."
          : scan
            ? "No se detectaron señales de atasco en la ventana analizada."
            : "Sin señales agregadas de atasco; falta el análisis de detalles para atribuirlas por denominación.";

  if (unclassifiedOperations.size > 0) {
    warnings.push(
      `Operaciones sin clasificar (${[...unclassifiedOperations].slice(0, 3).join(", ")}${unclassifiedOperations.size > 3 ? ", …" : ""}): el rol se dedujo de los importes${inferredRoles.method === "importes" ? "" : " y, cuando no fue posible, del estado de la transacción"}.`,
    );
  }
  if (scan && payoutsAnalyzed === 0) {
    warnings.push("No hay pagos con combinación comparable en la ventana: no se pudo evaluar sustitución ni participación.");
  }

  return {
    analyzed: scan !== null,
    blind: detailsBlind,
    failureReasons: scan?.failureReasons ?? [],
    headline,
    incidents,
    interpretation: { ...interpretation, roleMethod: inferredRoles.method },
    rows,
    scanned: {
      detailsFailures: scan?.detailsFailures ?? 0,
      detailsRequests: scan?.detailsRequests ?? 0,
      firstTransactionAt: Number.isNaN(scannedFrom) ? null : new Date(scannedFrom).toISOString(),
      lastTransactionAt: Number.isNaN(scannedTo) ? null : new Date(scannedTo).toISOString(),
      payoutsAnalyzed,
      transactions: transactionsAsc.length,
      truncated: scan?.truncated ?? false,
    },
    warnings,
  };
}
