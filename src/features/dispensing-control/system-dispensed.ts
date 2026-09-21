import type { CurrencyDenomination } from "@/features/denominations/schemas";
import type { PayPadStorage } from "@/features/paypads/schemas";
import {
  buildDenominationCurrencyIndex,
  buildDenominationValueIndex,
  denominationCurrencyText,
} from "./denomination-currency";
import {
  decimalToCents,
  inferOperationRoles,
  isErrorReturnedState,
  readJamDetail,
  reconcileDetailInterpretation,
  type JamOperationKind,
  type JamScanPayload,
} from "./dispensing-jams";

/**
 * Lo que el SISTEMA registró, medido por los DETALLES de cada transacción y separado por
 * moneda y por dirección del dinero (AP = aceptador / DP = dispensador).
 *
 * Por qué existe (caso real Pay+ ODRB Rionegro, ID 1288, máquina de cambio divisa COP ⇄ USD):
 * la verificación del cuadre usaba `Σ returnAmount` de las transacciones aprobadas como
 * «lo dispensado». En esa máquina eso es falso por dos motivos independientes:
 *
 *  1. **AP ≠ DP.** Las operaciones aprobadas registran dinero que ENTRA al aceptador
 *     (el cliente entrega dólares); lo que sale del dispensador (pesos) no vive en
 *     `returnAmount`. Comparar `Σ returnAmount` ($1.166.900) contra el dispensado físico
 *     ($9.207.900) acusaba «hay dinero sin registro» cuando no faltaba nada.
 *  2. **Monedas mezcladas.** El DTO de transacción no declara la moneda de cada importe,
 *     así que `Σ returnAmount` suma pesos y dólares en un solo número, y el dispensado
 *     físico también: la diferencia entre ambos no significa nada.
 *
 * Los detalles (`Transaction/{id}/Details`) sí dicen, por denominación y por operación,
 * qué billete se movió y hacia dónde; con el catálogo de denominaciones cada detalle tiene
 * moneda. De ahí sale una medición del lado DP **por moneda**, que es la única comparable
 * con el cuadre físico (`cargado − en dispensadores − rechazado`, también por moneda).
 *
 * Este módulo NO pide nada al API: reutiliza el barrido que ya hace la detección de
 * atascos (misma ventana, mismos detalles, misma caché) y la MISMA regla de clasificación
 * del motor (`readJamDetail`), para que los dos paneles nunca se contradigan.
 */

/** Importes del lado del sistema, por moneda y por dirección del dinero. */
export interface SystemDispensedCurrencyTotal {
  /** Valor ACEPTADO (entra al aceptador, AP) según los detalles. */
  acceptedValue: string;
  currencyId: number | null;
  /** Unidades que los detalles muestran SALIENDO del dispensador (DP). */
  dispensedUnits: number;
  /** Valor DISPENSADO (sale al cliente, DP) según los detalles. */
  dispensedValue: string;
  /** Valor de intentos de salida fallidos en transacciones con error devuelta. */
  failedValue: string;
  /** Etiqueta de la moneda («COP», «USD»); presentación, nunca comparación. */
  label: string | null;
  /** Transacciones analizadas con salidas del dispensador en esta moneda. */
  payoutTransactions: number;
}

export interface SystemDispensedEvidence {
  /** Valor aceptado total (suma monedas distintas: sólo referencia, no comparable). */
  acceptedTotal: string;
  /** Transacciones del período que el barrido realmente analizó. */
  analyzedTransactions: number;
  /**
   * Los importes dicen que las operaciones «de salida» del detalle describen lo ACEPTADO
   * (lectura invertida): el lado DP deducido no es confiable y no debe usarse para verificar.
   */
  amountsInverted: boolean;
  /** La suma de las salidas del detalle cuadra con `returnAmount` (sólo aplicable con una moneda). */
  amountsVerified: boolean;
  /** Ningún detalle legible en el barrido: no hay evidencia del lado DP. */
  blind: boolean;
  byCurrency: SystemDispensedCurrencyTotal[];
  /** Transacciones cuyo detalle no se pudo leer (la evidencia queda parcial). */
  detailsFailures: number;
  /** Valor dispensado total (suma monedas distintas: sólo referencia, no comparable). */
  dispensedTotal: string;
  /** Los detalles analizados abarcan más de una moneda. */
  multiCurrency: boolean;
  /** Transacciones analizadas con alguna salida del dispensador. */
  payoutTransactions: number;
  /**
   * `Σ returnAmount` de las MISMAS transacciones analizadas: referencia para contrastar con
   * el lado DP del detalle (ventana idéntica, sí es comparable con él).
   */
  returnAmountTotal: string;
  /** El barrido dejó transacciones del período por fuera (tope del motor de atascos). */
  truncated: boolean;
  /** Ninguna transacción analizada trajo detalles (el API los devolvió vacíos): no hay lado DP. */
  withoutDetails: boolean;
}

export interface SystemDispensedEvidenceInput {
  /** Catálogo de denominaciones: aporta la moneda de cada detalle. */
  denominations?: readonly CurrencyDenomination[];
  /** Moneda declarada por el Pay+ (respaldo de etiqueta si el catálogo no responde). */
  machineCurrency?: { id: number; label: string | null } | null;
  /** Barrido de detalles ya consultado por la detección de atascos (`null` = sin barrido). */
  scan: JamScanPayload | null;
  storage: readonly PayPadStorage[];
}

function toInt(value: string | number | null | undefined, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : fallback;
  }

  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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

interface CurrencyAccumulator {
  accepted: bigint;
  currencyId: number | null;
  dispensed: bigint;
  failed: bigint;
  label: string | null;
  payoutTransactions: Set<number>;
  units: number;
}

/**
 * Construye la evidencia del lado del sistema desde el barrido de detalles.
 * Devuelve `null` sin barrido (la verificación cae entonces a `Σ returnAmount` o se declara
 * no comparable, según la moneda: ver `dispensing-metrics.ts`).
 */
export function buildSystemDispensedEvidence(input: SystemDispensedEvidenceInput): SystemDispensedEvidence | null {
  const scan = input.scan;
  if (scan === null) {
    return null;
  }

  const currencyIndex = buildDenominationCurrencyIndex({
    denominations: input.denominations ?? [],
    machineCurrency: input.machineCurrency ?? null,
    storage: input.storage,
  });
  const valueTextById = buildDenominationValueIndex({
    denominations: input.denominations ?? [],
    machineCurrency: input.machineCurrency ?? null,
    storage: input.storage,
  });
  const denominationValueById = new Map(
    [...valueTextById].map(([denominationId, value]) => [denominationId, decimalToCents(value)]),
  );

  const transactions = [...scan.transactions];
  const currencyKeyOf = (denominationId: number): number | null => currencyIndex.get(denominationId)?.currencyId ?? null;
  const currencyLabelOf = (denominationId: number): string | null => denominationCurrencyText(currencyIndex.get(denominationId));

  // Con varias monedas la conciliación por importes no aplica (no se suman pesos y dólares):
  // mismo criterio del motor de atascos, para no declarar «verificado» lo que no se pudo verificar.
  const detailCurrencies = new Set<number | null>();
  for (const transaction of transactions) {
    for (const detail of transaction.details) {
      if (detail.denominationId !== null) {
        detailCurrencies.add(currencyKeyOf(detail.denominationId));
      }
    }
  }
  const multiCurrency = detailCurrencies.size > 1;
  const interpretation = multiCurrency
    ? { incomeMatches: 0, inverted: false, returnMatches: 0, roleMethod: "ninguno" as const, verified: false }
    : reconcileDetailInterpretation(transactions, denominationValueById);
  const inferredRoles: { method: "importes" | "ninguno"; roles: Map<string, JamOperationKind> } = multiCurrency
    ? { method: "ninguno", roles: new Map<string, JamOperationKind>() }
    : inferOperationRoles(transactions, denominationValueById);

  const byCurrency = new Map<number | null, CurrencyAccumulator>();
  const accumulatorFor = (currencyId: number | null, label: string | null): CurrencyAccumulator => {
    const current = byCurrency.get(currencyId);
    if (current) {
      return current;
    }
    const created: CurrencyAccumulator = {
      accepted: 0n,
      currencyId,
      dispensed: 0n,
      failed: 0n,
      label,
      payoutTransactions: new Set<number>(),
      units: 0,
    };
    byCurrency.set(currencyId, created);
    return created;
  };

  let acceptedTotal = 0n;
  let dispensedTotal = 0n;
  let returnAmountTotal = 0n;
  let payoutTransactions = 0;
  let detailsRead = 0;

  for (const transaction of transactions) {
    const errorState = isErrorReturnedState(transaction.stateTransaction);
    const payoutCents = decimalToCents(transaction.returnAmount);
    const hasPayout = payoutCents > 0n;
    returnAmountTotal += payoutCents;
    detailsRead += transaction.details.length;

    let dispensedInTransaction = false;
    for (const detail of transaction.details) {
      const { denominationId, kind } = readJamDetail(detail, inferredRoles);
      if (denominationId === null) {
        continue;
      }

      const quantity = Math.abs(toInt(detail.quantity));
      if (quantity === 0) {
        continue;
      }

      const value = BigInt(quantity) * (denominationValueById.get(denominationId) ?? 0n);
      const accumulator = accumulatorFor(currencyKeyOf(denominationId), currencyLabelOf(denominationId));

      // Dinero aceptado: pertenece al aceptador (AP), no al dispensador. Se mide aparte
      // porque es justamente lo que la verificación anterior confundía con dispensado.
      if (kind === "accept") {
        accumulator.accepted += value;
        acceptedTotal += value;
        continue;
      }

      if (kind === "dispense") {
        accumulator.dispensed += value;
        accumulator.units += quantity;
        accumulator.payoutTransactions.add(transaction.id);
        dispensedInTransaction = true;
        dispensedTotal += value;
        continue;
      }

      if (kind === "failed") {
        // Intento de salida fallido sólo cuando la transacción debía devolver (igual que el motor).
        if (errorState && hasPayout) {
          accumulator.failed += value;
        }
        continue;
      }

      // Sin nombre legible: se atribuye sólo si la transacción tiene devolución (regla del motor).
      if (!hasPayout) {
        continue;
      }
      if (errorState) {
        accumulator.failed += value;
        continue;
      }
      accumulator.dispensed += value;
      accumulator.units += quantity;
      accumulator.payoutTransactions.add(transaction.id);
      dispensedInTransaction = true;
      dispensedTotal += value;
    }

    if (dispensedInTransaction) {
      payoutTransactions += 1;
    }
  }

  const sorted = [...byCurrency.values()].sort((left, right) => (left.label ?? "").localeCompare(right.label ?? ""));

  return {
    acceptedTotal: centsToDecimal(acceptedTotal),
    analyzedTransactions: transactions.length,
    amountsInverted: interpretation.inverted,
    amountsVerified: interpretation.verified,
    // Mismo criterio del motor: ciego cuando se pidieron detalles y ninguno respondió.
    blind: scan.detailsRequests > 0 && scan.detailsFailures >= scan.detailsRequests,
    byCurrency: sorted.map((entry) => ({
      acceptedValue: centsToDecimal(entry.accepted),
      currencyId: entry.currencyId,
      dispensedUnits: entry.units,
      dispensedValue: centsToDecimal(entry.dispensed),
      failedValue: centsToDecimal(entry.failed),
      label: entry.label,
      payoutTransactions: entry.payoutTransactions.size,
    })),
    detailsFailures: scan.detailsFailures,
    dispensedTotal: centsToDecimal(dispensedTotal),
    multiCurrency,
    payoutTransactions,
    returnAmountTotal: centsToDecimal(returnAmountTotal),
    truncated: scan.truncated,
    withoutDetails: detailsRead === 0,
  };
}

/**
 * ¿La evidencia del detalle puede sostener la verificación del cuadre? Exige cobertura
 * completa del período (sin truncar), detalles legibles y una lectura no invertida: sin eso
 * la comparación se declara «no aplicable» en lugar de acusar un descuadre inexistente.
 */
export function isSystemEvidenceUsable(evidence: SystemDispensedEvidence | null): boolean {
  return (
    evidence !== null &&
    !evidence.truncated &&
    !evidence.blind &&
    !evidence.withoutDetails &&
    evidence.detailsFailures === 0 &&
    !evidence.amountsInverted &&
    evidence.analyzedTransactions > 0
  );
}
