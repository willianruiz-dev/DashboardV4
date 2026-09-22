import type { CurrencyDenomination } from "@/features/denominations/schemas";
import type { PayPadStorage } from "@/features/paypads/schemas";
import {
  buildDenominationCurrencyIndex,
  buildDenominationValueIndex,
  denominationCurrencyText,
  type DenominationCurrencyInfo,
} from "./denomination-currency";
import { formatDashboardMoney } from "@/lib/formatters/money";
import { LOW_BALANCE_TOLERANCE } from "./dispensing-metrics";
import {
  canonicalPayoutMix,
  decimalToCents,
  inferOperationRoles,
  isErrorReturnedState,
  readJamDetail,
  reconcileDetailInterpretation,
  type JamScanPayload,
} from "./dispensing-jams";

/**
 * CONCILIACIÓN POR DENOMINACIÓN: lo que el kiosco DEBÍA entregar contra lo que el detalle
 * confirma que entregó. Es la tabla que pide la operación:
 *
 *   Denominación | Esperado | Dispensado | Diferencia   →  y por qué pudo faltar
 *
 * El motor de atascos NO es este módulo: aquel decide si hay evidencia de atasco (niveles y
 * señales); éste responde la pregunta previa y más simple — «¿qué se pidió, qué se entregó y
 * qué falta?» — sin acusar a nadie. La distinción clave (regla del negocio):
 *
 *   1. Inventario 0 y faltó                        → AGOTADO  (no es atasco)
 *   2. Inventario > 0, se pidió y no se entregó    → NO ENTREGÓ CON SALDO (revisar el módulo)
 *   3. Se entregó lo esperado                      → CORRECTO
 *
 * Límites declarados (no se inventan): el API no publica el PLAN que el kiosco intentó
 * (se reconstruye con la combinación canónica sobre el valor solicitado), no registra el
 * estado reportado por el dispositivo (vacío/atasco/sin respuesta) ni distingue billete de
 * moneda ni de si el canal fue Arduino. Todo eso se declara en `limitations[]` para que
 * nadie lea la conciliación como algo que el kiosco no está diciendo.
 */

export type PayoutDenominationState =
  /** El detalle entregó lo que el valor pedía. */
  | "correcto"
  /** Faltó y había saldo según el inventario leído: revisar el módulo (posible fallo). */
  | "no_entrego_con_saldo"
  /** Faltó y no hay saldo: agotamiento, NO atasco. */
  | "sin_saldo"
  /** Faltó y la denominación no aparece en el inventario de la máquina. */
  | "sin_inventario"
  /** Entregó más de lo que le tocaba: está cubriendo el hueco de otra (compensando). */
  | "sobre_entrega"
  /**
   * Hubo devoluciones incompletas en el período y el faltante NO se pudo repartir hasta esta
   * denominación (no había combinación exacta con el inventario leído): se declara en lugar de
   * culpar a ciegas.
   */
  | "sin_atribucion"
  /** Ninguna devolución del período la necesitaba. */
  | "sin_plan";

export interface PayoutLine {
  currencyId: number | null;
  currencyLabel: string | null;
  denominationId: number;
  denominationValue: string;
  /** Unidades que el valor solicitado pedía con la combinación canónica (referencia). */
  expectedUnits: number;
  /** Unidades que el kiosco PODÍA armar con el inventario leído (sin contar agotadas). */
  feasibleUnits: number;
  /** Unidades que el detalle confirma entregadas. */
  dispensedUnits: number;
  /**
   * `expectedUnits − dispensedUnits`: diferencia de COMPOSICIÓN contra el plan canónico.
   * Con la devolución completa puede ser distinta de cero sin que nada esté mal (el kiosco
   * eligió otra combinación válida).
   */
  differenceUnits: number;
  /** Unidades que FALTARON de esta denominación en devoluciones incompletas. */
  missingUnits: number;
  /** Unidades en el baúl en la última lectura del panel. */
  stock: number;
  /** Valor unitario de la denominación, en decimal del API. */
  unitValue: string;
}

export interface PayoutTransactionReconciliation {
  at: string | null;
  /** Se entregó EXACTAMENTE el valor solicitado (la composición puede variar: sigue siendo correcto). */
  complete: boolean;
  /** La composición entregada coincide con la combinación canónica reconstruida. */
  compositionMatchesPlan: boolean;
  dispensedValue: string;
  expectedValue: string;
  id: number;
  lines: PayoutLine[];
  /** Faltante valorizado: el valor solicitado que NO salió del dispensador. */
  missingValue: string;
  /**
   * Parte del faltante que no se puede atribuir a una denominación del plan (no había
   * combinación exacta con el inventario leído). `missingValue = Σ(unidades faltantes × valor) + este resto`.
   */
  unattributedMissingValue: string;
  /** El estado de la transacción es de error devuelta (`Aprobada Error Devuelta`). */
  returnedWithError: boolean;
  /** Valor solicitado por el cliente (`returnAmount`). */
  requestedValue: string;
  stateTransaction: string;
  verdict: string;
}

export interface PayoutDenominationReconciliation extends PayoutLine {
  /** Transacciones del período que exigían esta denominación (por el valor). */
  expectedTransactions: number[];
  /** Denominación configurada para dispensar (`isDispensing`). */
  configuredForDispensing: boolean;
  /** Devoluciones incompletas en las que esta denominación faltó (ids de transacción). */
  missingTransactions: number[];
  /** Valor del faltante (unidades × valor unitario). */
  missingValue: string;
  reading: string;
  state: PayoutDenominationState;
  /** Umbral de recarga configurado en el baúl. */
  minDpQuantity: number;
}

export interface PayoutReconciliation {
  analyzedTransactions: number;
  byDenomination: PayoutDenominationReconciliation[];
  completeTransactions: number;
  incompleteTransactions: number;
  /** Lo que el API actual NO permite verificar (se declara, no se inventa). */
  limitations: string[];
  missingTotal: string;
  notes: string[];
  transactions: PayoutTransactionReconciliation[];
}

export interface PayoutReconciliationInput {
  /**
   * Denominaciones que el kiosco entrega como MONEDA. Mientras el catálogo no declare el tipo
   * (`CurrencyDenomination` sólo expone moneda, valor e imagen), la regla de «devolución sólo
   * con monedas hasta $1.900» no se puede aplicar: se declara como limitación.
   */
  coinDenominationIds?: readonly number[];
  denominations?: readonly CurrencyDenomination[];
  machineCurrency?: { id: number; label: string | null } | null;
  /** Tope de la devolución exclusivamente con monedas (regla del negocio: $1.900). */
  maxCoinOnlyReturnValue?: string;
  scan: JamScanPayload | null;
  storage: readonly PayPadStorage[];
}

const DEFAULT_MAX_COIN_ONLY_RETURN = "1900";

function toInt(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : 0;
  }

  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Importe legible para los textos (los campos de datos siguen en decimal del API). */
function amountText(value: string): string {
  return formatDashboardMoney(value);
}

/** Unidades legibles («1», «10.000») para los textos del diagnóstico. */
function unitsText(units: number): string {
  return new Intl.NumberFormat("es-CO").format(units);
}

function centsToValue(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const integer = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${integer.toString()}${fraction === "00" ? "" : `.${fraction}`}`;
}

interface StorageRow {
  configured: boolean;
  denominationId: number;
  minDpQuantity: number;
  stock: number;
  valueCents: bigint;
  value: string;
}

/**
 * Conciliación esperado/entregado por denominación y por transacción, sobre el mismo barrido
 * de detalles que ya alimenta el motor de atascos (misma ventana, ninguna petición extra).
 */
interface DenominationAggregate {
  dispensedUnits: number;
  expectedTransactions: Set<number>;
  expectedUnits: number;
  feasibleUnits: number;
  /** Devoluciones que NO se completaron y en las que esta denominación faltó. */
  missingTransactions: Set<number>;
  missingUnits: number;
}

export function buildPayoutReconciliation(input: PayoutReconciliationInput): PayoutReconciliation {
  const scan = input.scan;
  const currencyIndex = buildDenominationCurrencyIndex({
    denominations: input.denominations ?? [],
    machineCurrency: input.machineCurrency ?? null,
    storage: input.storage,
  });
  const valueIndex = buildDenominationValueIndex({
    denominations: input.denominations ?? [],
    machineCurrency: input.machineCurrency ?? null,
    storage: input.storage,
  });
  const denominationValueById = new Map<number, bigint>(
    [...valueIndex.entries()].map(([denominationId, value]) => [denominationId, decimalToCents(value)]),
  );

  const storageById = new Map<number, StorageRow>(
    input.storage.map((entry) => [
      entry.idCurrencyDenomination,
      {
        configured: entry.isDispensing,
        denominationId: entry.idCurrencyDenomination,
        minDpQuantity: toInt(entry.minDpQuantity),
        stock: Math.max(0, toInt(entry.dpStored)),
        value: entry.denominationValue,
        valueCents: decimalToCents(entry.denominationValue),
      },
    ]),
  );

  const limitations: string[] = [
    "El plan de devolución se reconstruye con la combinación canónica sobre el valor solicitado y el inventario leído: el kiosco no publica el plan que realmente intentó.",
    "El API de transacciones no registra el estado que reporta cada dispositivo (vacío, atasco, sin respuesta): sólo se puede inferir cruzando el estado de la transacción con el inventario y el arqueo.",
    "El catálogo de denominaciones no dice si cada una es BILLETE o MONEDA ni si se comunicó por Arduino: la conciliación es por denominación, no por canal ni por tipo de dispositivo.",
  ];
  if (!input.coinDenominationIds || input.coinDenominationIds.length === 0) {
    limitations.push(
      `La regla de devolución exclusivamente con monedas (tope ${amountText(
        input.maxCoinOnlyReturnValue ?? DEFAULT_MAX_COIN_ONLY_RETURN,
      )}) no es verificable sin saber qué denominaciones son monedas; el panel no la aplica en vez de suponerla.`,
    );
  }

  const notes: string[] = [];
  if (scan === null) {
    return emptyReconciliation(limitations, ["Falta el análisis de detalles: no hay nada que conciliar."]);
  }
  if (scan.truncated) {
    notes.push(
      `El barrido quedó truncado (tope ${scan.maxTransactions} transacciones): la conciliación cubre sólo la muestra analizada.`,
    );
  }
  if (scan.detailsFailures > 0) {
    notes.push(`${scan.detailsFailures} detalle(s) no se pudieron leer: sus transacciones no se concilian.`);
  }

  const transactions = scan.transactions;
  const roles = inferOperationRoles(transactions, denominationValueById);
  const interpretation = reconcileDetailInterpretation(transactions, denominationValueById);

  const byDenomination = new Map<number, DenominationAggregate>();
  const reconciliationRows: PayoutTransactionReconciliation[] = [];
  let analyzedTransactions = 0;

  for (const transaction of transactions) {
    const payoutCents = decimalToCents(transaction.returnAmount);
    if (payoutCents <= 0n) {
      continue;
    }

    const errorState = isErrorReturnedState(transaction.stateTransaction);
    const dispensed = new Map<number, number>();
    let dispensedCents = 0n;

    for (const detail of transaction.details) {
      if (detail.denominationId === null) {
        continue;
      }
      const quantity = Math.abs(toInt(detail.quantity));
      if (quantity === 0) {
        continue;
      }

      const { denominationId, kind } = readJamDetail(detail, roles);
      if (denominationId === null || kind === "accept") {
        continue;
      }

      // Mismas reglas que el motor de atascos: un fallo declarado NO es entrega, y un detalle
      // sin clasificar sólo cuenta como entrega si la transacción es una devolución pagada.
      const isDelivery = kind === "dispense" || (kind === "unknown" && !errorState && !interpretation.inverted);
      if (!isDelivery) {
        continue;
      }

      dispensed.set(denominationId, (dispensed.get(denominationId) ?? 0) + quantity);
      dispensedCents += BigInt(quantity) * (denominationValueById.get(denominationId) ?? 0n);
    }

    const payoutCurrencyId = resolvePayoutCurrencyId({
      currencyByDenomination: currencyIndex,
      dispensed,
      machineCurrencyId: input.machineCurrency?.id ?? null,
      storageById,
    });

    const allCandidates = [...storageById.values()]
      .filter((entry) => currencyKeyOf(currencyIndex, entry.denominationId) === payoutCurrencyId)
      .map((entry) => ({ denominationId: entry.denominationId, units: Number.MAX_SAFE_INTEGER, valueCents: entry.valueCents }));
    const withStock = [...storageById.values()]
      .filter((entry) => entry.stock > 0 && currencyKeyOf(currencyIndex, entry.denominationId) === payoutCurrencyId)
      .map((entry) => ({ denominationId: entry.denominationId, units: entry.stock, valueCents: entry.valueCents }));

    // La expectativa del NEGOCIO: cómo se compone el valor con las denominaciones de la
    // máquina (sin recortar por inventario). Sin esta lectura, una denominación agotada
    // desaparecía del plan y el faltante se atribuía a las que sí entregaron.
    const idealMix = canonicalPayoutMix(payoutCents, allCandidates);
    const feasibleMix = canonicalPayoutMix(payoutCents, withStock);
    const expectedUnits = idealMix?.units ?? new Map<number, number>();

    const denominationIds = new Set<number>([...expectedUnits.keys(), ...dispensed.keys()]);
    const composition: PayoutLine[] = [...denominationIds]
      .map((denominationId) => buildLine(denominationId, expectedUnits, feasibleMix?.units ?? null, dispensed, currencyIndex, storageById, valueIndex))
      .sort((left, right) => Number(right.unitValue) - Number(left.unitValue));

    // El veredicto del negocio es por VALOR: «entregado exacto» es correcto aunque el kiosco
    // haya elegido otra combinación válida (p. ej. 1 × 10.000 + 2 × 5.000 + 1 × 500 en vez de
    // 2 × 10.000 + 1 × 500). Sólo cuando el valor entregado NO alcanza el solicitado se
    // pregunta qué faltó, y esas unidades —y sólo esas— alimentan el diagnóstico.
    const expectedCents = sumLineCents(composition, (line) => line.expectedUnits);
    const complete = dispensedCents === payoutCents;
    const missingCents = complete || dispensedCents > payoutCents ? 0n : payoutCents - dispensedCents;
    const compositionMatchesPlan = composition.every((line) => line.differenceUnits === 0);
    // El faltante se reparte por DENOMINACIÓN usando el valor que falta (no la diferencia
    // contra el plan): si el plan pedía 2 × 10.000 y sólo faltó un billete, lo que hay que
    // decir es «faltó 1 × 10.000», no «faltaron 20.000».
    const decomposed = complete
      ? { leftover: 0n, units: new Map<number, number>() }
      : decomposeMissingUnits(composition, missingCents);
    const lines: PayoutLine[] = composition.map((line) => ({
      ...line,
      missingUnits: decomposed.units.get(line.denominationId) ?? 0,
    }));

    analyzedTransactions += 1;
    for (const line of lines) {
      const aggregate = byDenomination.get(line.denominationId) ?? {
        dispensedUnits: 0,
        expectedTransactions: new Set<number>(),
        expectedUnits: 0,
        feasibleUnits: 0,
        missingTransactions: new Set<number>(),
        missingUnits: 0,
      };
      aggregate.dispensedUnits += line.dispensedUnits;
      aggregate.expectedUnits += line.expectedUnits;
      aggregate.feasibleUnits += line.feasibleUnits;
      if (line.expectedUnits > 0) {
        aggregate.expectedTransactions.add(transaction.id);
      }
      if (line.missingUnits > 0) {
        aggregate.missingUnits += line.missingUnits;
        aggregate.missingTransactions.add(transaction.id);
      }
      byDenomination.set(line.denominationId, aggregate);
    }

    reconciliationRows.push({
      at: transaction.dateCreated ?? null,
      complete,
      compositionMatchesPlan,
      dispensedValue: centsToValue(dispensedCents),
      expectedValue: centsToValue(expectedCents),
      id: transaction.id,
      lines,
      missingValue: centsToValue(missingCents),
      requestedValue: centsToValue(payoutCents),
      returnedWithError: errorState,
      stateTransaction: transaction.stateTransaction,
      unattributedMissingValue: centsToValue(decomposed.leftover),
      verdict: describeTransaction({
        complete,
        compositionMatchesPlan,
        dispensedCents,
        errorState,
        expectedCents,
        lines,
        missingCents,
        payoutCents,
        unattributedMissing: decomposed.leftover,
      }),
    });
  }

  const incompletePayouts = reconciliationRows.filter((row) => !row.complete).length;
  const byDenominationRows: PayoutDenominationReconciliation[] = [...byDenomination.entries()]
    .map(([denominationId, aggregate]) => {
      const storageRow = storageById.get(denominationId) ?? null;
      const currency = currencyIndex.get(denominationId) ?? null;
      const unitValueCents = denominationValueById.get(denominationId) ?? 0n;
      const differenceUnits = aggregate.expectedUnits - aggregate.dispensedUnits;
      const state = classifyDenominationState({
        differenceUnits,
        dispensedUnits: aggregate.dispensedUnits,
        expectedUnits: aggregate.expectedUnits,
        incompletePayouts,
        missingUnits: aggregate.missingUnits,
        stock: storageRow?.stock ?? 0,
        storagePresent: storageRow !== null,
      });

      return {
        configuredForDispensing: storageRow?.configured ?? false,
        currencyId: currency?.currencyId ?? null,
        currencyLabel: denominationCurrencyText(currency),
        denominationId,
        denominationValue: storageRow?.value ?? valueIndex.get(denominationId) ?? "0",
        differenceUnits,
        dispensedUnits: aggregate.dispensedUnits,
        expectedTransactions: [...aggregate.expectedTransactions].sort((left, right) => left - right),
        expectedUnits: aggregate.expectedUnits,
        feasibleUnits: aggregate.feasibleUnits,
        minDpQuantity: storageRow?.minDpQuantity ?? 0,
        missingTransactions: [...aggregate.missingTransactions].sort((left, right) => left - right),
        missingUnits: aggregate.missingUnits,
        missingValue: centsToValue(BigInt(aggregate.missingUnits) * unitValueCents),
        reading: describeDenominationState({
          configured: storageRow?.configured ?? false,
          differenceUnits,
          expectedUnits: aggregate.expectedUnits,
          incompletePayouts,
          minDpQuantity: storageRow?.minDpQuantity ?? 0,
          missingUnits: aggregate.missingUnits,
          stock: storageRow?.stock ?? 0,
          storagePresent: storageRow !== null,
        }),
        state,
        stock: storageRow?.stock ?? 0,
        unitValue: storageRow?.value ?? valueIndex.get(denominationId) ?? "0",
      };
    })
    .filter((row) => row.expectedUnits > 0 || row.dispensedUnits > 0 || row.missingUnits > 0)
    .sort((left, right) => {
      const leftLabel = left.currencyLabel ?? "";
      const rightLabel = right.currencyLabel ?? "";
      if (leftLabel !== rightLabel) {
        return leftLabel.localeCompare(rightLabel);
      }
      return Number(right.unitValue) - Number(left.unitValue);
    });

  const incomplete = reconciliationRows.filter((row) => !row.complete);
  const missingTotal = centsToValue(
    reconciliationRows.reduce((total, row) => total + decimalToCents(row.missingValue), 0n),
  );

  const coinRule = describeCoinOnlyRule({
    coinDenominationIds: input.coinDenominationIds ?? [],
    maxValue: input.maxCoinOnlyReturnValue ?? DEFAULT_MAX_COIN_ONLY_RETURN,
    transactions: reconciliationRows,
  });
  if (coinRule) {
    notes.push(coinRule);
  }

  return {
    analyzedTransactions,
    byDenomination: byDenominationRows,
    completeTransactions: analyzedTransactions - incomplete.length,
    incompleteTransactions: incomplete.length,
    limitations,
    missingTotal,
    notes,
    transactions: reconciliationRows.sort((left, right) => (right.missingValue > left.missingValue ? 1 : -1)),
  };
}

function emptyReconciliation(limitations: string[], notes: string[]): PayoutReconciliation {
  return {
    analyzedTransactions: 0,
    byDenomination: [],
    completeTransactions: 0,
    incompleteTransactions: 0,
    limitations,
    missingTotal: "0",
    notes,
    transactions: [],
  };
}

function currencyKeyOf(
  currencyIndex: ReadonlyMap<number, DenominationCurrencyInfo>,
  denominationId: number,
): number | null {
  return currencyIndex.get(denominationId)?.currencyId ?? null;
}

/**
 * Moneda del pago: la de las denominaciones que el detalle confirma entregadas (una
 * conciliación no mezcla monedas). Si nada salió —el caso de la devolución fallida completa—
 * cae a la moneda declarada por el Pay+ y, si tampoco la hay, a la única moneda en uso.
 */
function resolvePayoutCurrencyId(context: {
  currencyByDenomination: ReadonlyMap<number, DenominationCurrencyInfo>;
  dispensed: ReadonlyMap<number, number>;
  machineCurrencyId: number | null;
  storageById: ReadonlyMap<number, StorageRow>;
}): number | null {
  const currencies = new Set<number | null>(
    [...context.dispensed.keys()].map((denominationId) => currencyKeyOf(context.currencyByDenomination, denominationId)),
  );
  if (currencies.size === 1) {
    return [...currencies][0] ?? null;
  }
  if (context.machineCurrencyId !== null) {
    return context.machineCurrencyId;
  }

  const inUseCurrencies = new Set<number | null>(
    [...context.storageById.keys()].map((denominationId) => currencyKeyOf(context.currencyByDenomination, denominationId)),
  );
  return inUseCurrencies.size === 1 ? [...inUseCurrencies][0] ?? null : null;
}

function buildLine(
  denominationId: number,
  expected: ReadonlyMap<number, number>,
  feasible: ReadonlyMap<number, number> | null,
  dispensed: ReadonlyMap<number, number>,
  currencyIndex: ReadonlyMap<number, DenominationCurrencyInfo>,
  storageById: ReadonlyMap<number, StorageRow>,
  valueIndex: ReadonlyMap<number, string>,
): PayoutLine {
  const expectedUnits = expected.get(denominationId) ?? 0;
  const dispensedUnits = dispensed.get(denominationId) ?? 0;
  const storageRow = storageById.get(denominationId) ?? null;

  return {
    currencyId: currencyKeyOf(currencyIndex, denominationId),
    currencyLabel: denominationCurrencyText(currencyIndex.get(denominationId) ?? null),
    denominationId,
    denominationValue: storageRow?.value ?? valueIndex.get(denominationId) ?? "0",
    differenceUnits: expectedUnits - dispensedUnits,
    dispensedUnits,
    expectedUnits,
    feasibleUnits: feasible?.get(denominationId) ?? 0,
    missingUnits: 0,
    stock: storageRow?.stock ?? 0,
    unitValue: storageRow?.value ?? valueIndex.get(denominationId) ?? "0",
  };
}

function sumLineCents(lines: readonly PayoutLine[], pick: (line: PayoutLine) => number): bigint {
  return lines.reduce((total, line) => total + BigInt(Math.max(0, pick(line))) * decimalToCents(line.unitValue), 0n);
}

/**
 * Diagnóstico de la denominación. Manda lo que FALTÓ en devoluciones que no se completaron:
 * una composición distinta a la canónica con la devolución completa NO es una falla (el kiosco
 * entregó el valor por otro camino válido), así que ahí no se acusa nada.
 */
function classifyDenominationState(input: {
  differenceUnits: number;
  dispensedUnits: number;
  expectedUnits: number;
  incompletePayouts: number;
  missingUnits: number;
  stock: number;
  storagePresent: boolean;
}): PayoutDenominationState {
  if (input.missingUnits > 0) {
    if (!input.storagePresent) {
      return "sin_inventario";
    }
    return input.stock > 0 ? "no_entrego_con_saldo" : "sin_saldo";
  }
  if (input.expectedUnits === 0) {
    // Entregó unidades que el plan de referencia no contemplaba: participó por otra
    // combinación válida (no es una falla, pero explica quién cubrió el hueco).
    return input.dispensedUnits > 0 ? "sobre_entrega" : "sin_plan";
  }
  if (input.differenceUnits < 0) {
    return "sobre_entrega";
  }
  if (input.differenceUnits > 0 && input.incompletePayouts > 0) {
    // El plan la pedía, no salió y hubo devoluciones incompletas, pero el faltante valorizado
    // se repartió entre otras denominaciones: no se atribuye a ciegas.
    return "sin_atribucion";
  }
  return "correcto";
}

export const payoutStateLabels: Record<PayoutDenominationState, string> = {
  correcto: "Entregado",
  sin_atribucion: "Faltante no atribuido",
  no_entrego_con_saldo: "No entregó teniendo saldo",
  sin_inventario: "Sin inventario declarado",
  sin_plan: "Sin demanda en el período",
  sin_saldo: "Agotado (sin saldo)",
  sobre_entrega: "Entregó de más (compensa)",
};

function describeDenominationState(input: {
  configured: boolean;
  differenceUnits: number;
  expectedUnits: number;
  incompletePayouts: number;
  minDpQuantity: number;
  missingUnits: number;
  stock: number;
  storagePresent: boolean;
}): string {
  const configuration = input.configured ? "" : " La denominación no está marcada para dispensar en la configuración del Pay+.";
  if (input.missingUnits > 0) {
    if (!input.storagePresent) {
      return "Faltó y la denominación no aparece en el inventario de la máquina: no se puede saber si había unidades. Confirmar la configuración de dispensado.";
    }
    if (input.stock <= 0) {
      return `Faltaron ${unitsText(input.missingUnits)} unidad(es) y el inventario está en cero: es AGOTAMIENTO, no un atasco. Cargar la denominación y confirmar con arqueo.`;
    }

    // Sólo se atenúa el diagnóstico cuando el baúl está de verdad en el umbral configurado
    // (umbral 0 significa «sin umbral», no «casi vacío»).
    const nearThreshold = input.minDpQuantity > 0 && input.stock <= input.minDpQuantity + LOW_BALANCE_TOLERANCE;
    return `Faltaron ${unitsText(input.missingUnits)} unidad(es) con ${unitsText(input.stock)} en el baúl${
      nearThreshold ? " (cerca del umbral de recarga: el desabasto también lo explica)" : ""
    }: revisar el módulo antes de acusar un fallo.${configuration}`;
  }

  if (input.expectedUnits === 0) {
    return "El valor de las devoluciones del período no exigía esta denominación, pero entregó unidades: participó con otra combinación válida.";
  }
  if (input.differenceUnits < 0) {
    return `Entregó ${unitsText(Math.abs(input.differenceUnits))} unidad(es) más de las que le tocaban: está compensando la entrega de otra denominación.`;
  }
  if (input.differenceUnits === 0) {
    return "El detalle confirma la entrega de la parte que le correspondía.";
  }
  if (input.incompletePayouts > 0) {
    return "El plan de referencia pedía unidades de esta denominación que no salieron, pero el faltante del período no se pudo repartir hasta aquí (no había combinación exacta con el inventario leído). Cruzar con el análisis de atascos antes de concluir.";
  }
  return "Las devoluciones se completaron con otra combinación válida: esta denominación no participó y no hay entrega incompleta que explicar.";
}

/**
 * Reparte el faltante VALORIZADO entre las denominaciones que el plan pedía y no salieron,
 * de mayor a menor: «faltó 1 × 10.000» cuando de verdad faltó un billete. Si el inventario no
 * permitía completar la suma, el resto queda como faltante no atribuible (se declara).
 */
function decomposeMissingUnits(
  lines: readonly PayoutLine[],
  missingCents: bigint,
): { leftover: bigint; units: Map<number, number> } {
  const units = new Map<number, number>();
  let leftover = missingCents;
  const candidates = [...lines]
    .filter((line) => line.differenceUnits > 0)
    .map((line) => ({ line, unitCents: decimalToCents(line.unitValue) }))
    .filter((entry) => entry.unitCents > 0n)
    .sort((left, right) => (right.unitCents > left.unitCents ? 1 : right.unitCents < left.unitCents ? -1 : 0));

  for (const { line, unitCents } of candidates) {
    if (leftover < unitCents) {
      continue;
    }
    const wanted = Number(leftover / unitCents);
    const take = Math.min(wanted, line.differenceUnits);
    if (take <= 0) {
      continue;
    }
    units.set(line.denominationId, take);
    leftover -= BigInt(take) * unitCents;
  }

  return { leftover, units };
}

function describeTransaction(input: {
  complete: boolean;
  compositionMatchesPlan: boolean;
  dispensedCents: bigint;
  errorState: boolean;
  expectedCents: bigint;
  lines: readonly PayoutLine[];
  missingCents: bigint;
  payoutCents: bigint;
  unattributedMissing: bigint;
}): string {
  if (input.complete) {
    return input.compositionMatchesPlan
      ? `Entregado exacto: ${amountText(centsToValue(input.dispensedCents))} con la combinación esperada.`
      : `Entregado exacto: ${amountText(centsToValue(input.dispensedCents))} con otra combinación válida (el plan de referencia era ${amountText(centsToValue(input.expectedCents))}).`;
  }

  const missing = input.lines
    .filter((line) => line.missingUnits > 0)
    .map((line) => `${line.currencyLabel ? `${line.currencyLabel} ` : ""}${amountText(line.denominationValue)} × ${unitsText(line.missingUnits)}`)
    .join(" + ");

  const parts: string[] = [
    input.missingCents > 0n
      ? `Faltó ${amountText(centsToValue(input.missingCents))}${missing ? ` (${missing})` : ""}`
      : "Lo entregado no coincide con el plan reconstruido",
    `entregado ${amountText(centsToValue(input.dispensedCents))} de ${amountText(centsToValue(input.payoutCents))} solicitado`,
  ];
  if (input.unattributedMissing > 0n) {
    parts.push(`${amountText(centsToValue(input.unattributedMissing))} no se puede atribuir a una denominación: no había combinación exacta con el inventario leído`);
  }
  if (input.expectedCents !== input.payoutCents && input.expectedCents > 0n) {
    parts.push("con el inventario leído no había combinación exacta para ese valor");
  }
  parts.push(input.errorState ? "el kiosco registró la devolución con ERROR" : "la transacción no reporta error de devolución");
  return `${parts.join(" · ")}.`;
}

/**
 * Regla del negocio: la devolución exclusivamente con monedas tiene tope ($1.900). Sólo puede
 * comprobarse cuando se conocen las denominaciones que son moneda; mientras el catálogo no lo
 * declare, el panel NO la aplica (lo dice en `limitations`).
 */
function describeCoinOnlyRule(input: {
  coinDenominationIds: readonly number[];
  maxValue: string;
  transactions: readonly PayoutTransactionReconciliation[];
}): string | null {
  if (input.coinDenominationIds.length === 0) {
    return null;
  }

  const coins = new Set(input.coinDenominationIds);
  const maxCents = decimalToCents(input.maxValue);
  const violations = input.transactions.filter((transaction) => {
    const delivered = transaction.lines.filter((line) => line.dispensedUnits > 0);
    if (delivered.length === 0 || !delivered.every((line) => coins.has(line.denominationId))) {
      return false;
    }
    const total = delivered.reduce((sum, line) => sum + BigInt(line.dispensedUnits) * decimalToCents(line.unitValue), 0n);
    return total > maxCents;
  });

  if (violations.length === 0) {
    return `Regla de devolución sólo con monedas (tope ${amountText(input.maxValue)}): ninguna transacción del período la excede.`;
  }

  return `Regla de devolución sólo con monedas (tope ${amountText(input.maxValue)}): ${violations.length} transacción(es) entregaron TODO con monedas por encima del tope (ids ${violations
    .slice(0, 8)
    .map((transaction) => transaction.id)
    .join(", ")}${violations.length > 8 ? ", …" : ""}). Revisar si el kiosco debía usar billetes.`;
}
