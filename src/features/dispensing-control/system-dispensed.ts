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
  /**
   * Dispensado DENTRO de la ventana del arqueo base `(base → ahora]`: es la cifra que se
   * compara con el cuadre físico de esa misma ventana. `null` = no se pidió la ventana.
   */
  dispensedSinceBase: { transactions: number; value: string } | null;
  /**
   * Dispensado DENTRO de cada frontera pedida `(frontera → ahora]`, alineado con
   * `windows.sinceMs`. Por diferencia de acumulados se mide el tramo entre dos arqueos:
   * `desde(b_i) − desde(b_j)` = pagos dentro de `(b_i, b_j]`. `null` = frontera no pedida
   * o inválida (nunca se inventa la cifra).
   */
  dispensedSinceBoundaries: Array<{ atMs: number; transactions: number; value: string } | null>;
  /** Dispensado DENTRO de la ventana del último cargue `(último cargue → ahora]`. */
  dispensedSinceLastLoad: { transactions: number; value: string } | null;
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
  /** Dispensado total (todas las monedas sumadas: sólo referencia, no comparable). */
  dispensedSinceBaseTotal: string | null;
  dispensedSinceLastLoadTotal: string | null;
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
  /**
   * Ventanas con las que se compara el lado físico. El cuadre físico sólo es una identidad
   * exacta cuando arranca de un conteo de baúl (arqueo) o del propio cargue: por eso el lado
   * del sistema debe poder medirse en ESAS ventanas y no sólo en el período del día. Sin
   * ventanas, el lado del sistema sigue midiéndose sobre todo el período.
   */
  windows?: {
    /** Fecha del arqueo base: ventana `(base → ahora]`. */
    baseAtMs?: number | null;
    /** Fecha del último cargue: ventana `(último cargue → ahora]`. */
    lastLoadAtMs?: number | null;
    /**
     * Fronteras adicionales (fechas de los arqueos del historial): acumulados
     * `(frontera → ahora]` por moneda para auditar los tramos ENTRE arqueos consecutivos,
     * que la ventana del arqueo base (el más reciente) no puede ver.
     */
    sinceMs?: readonly (number | null)[];
  } | null;
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

/** Fecha a milisegundos; `NaN` cuando no es utilizable (nunca se asume «ahora»). */
function toMillis(value: string | null | undefined): number {
  if (!value) {
    return Number.NaN;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
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
  /** Dispensado (y transacciones) DENTRO de la ventana del arqueo base. */
  sinceBase: bigint;
  sinceBaseTransactions: Set<number>;
  /** Dispensado (y transacciones) DENTRO de cada frontera pedida `(frontera → ahora]`. */
  sinceBoundaries: Array<{ cents: bigint; transactions: Set<number> }>;
  /** Dispensado (y transacciones) DENTRO de la ventana del último cargue. */
  sinceLastLoad: bigint;
  sinceLastLoadTransactions: Set<number>;
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
      sinceBase: 0n,
      sinceBaseTransactions: new Set<number>(),
      sinceBoundaries: sinceBoundariesMs.map(() => ({ cents: 0n, transactions: new Set<number>() })),
      sinceLastLoad: 0n,
      sinceLastLoadTransactions: new Set<number>(),
      units: 0,
    };
    byCurrency.set(currencyId, created);
    return created;
  };

  // Ventanas de comparación. `null` = no se pidió esa ventana: no se inventa una cifra.
  const baseAtMs = input.windows?.baseAtMs ?? null;
  const lastLoadAtMs = input.windows?.lastLoadAtMs ?? null;
  const hasBaseWindow = baseAtMs !== null && Number.isFinite(baseAtMs);
  const hasLastLoadWindow = lastLoadAtMs !== null && Number.isFinite(lastLoadAtMs);
  // Fronteras de tramos: se conservan las POSICIONES del pedido (las inválidas quedan en
  // `null`) y cada acumulado lleva su `atMs`, para que el consumidor alinee por fecha y no
  // por orden de llegada.
  const sinceBoundariesMs = (input.windows?.sinceMs ?? []).map((value) =>
    value !== null && Number.isFinite(value) ? value : null,
  );

  let acceptedTotal = 0n;
  let dispensedTotal = 0n;
  let dispensedSinceBaseTotal = 0n;
  let dispensedSinceLastLoadTotal = 0n;
  let returnAmountTotal = 0n;
  let payoutTransactions = 0;
  let detailsRead = 0;

  /** Suma una salida del dispensador a la moneda y a las ventanas que correspondan. */
  const addDispensed = (
    accumulator: CurrencyAccumulator,
    value: bigint,
    quantity: number,
    transactionId: number,
    at: number,
    inBaseWindow: boolean,
    inLastLoadWindow: boolean,
  ): void => {
    accumulator.dispensed += value;
    accumulator.units += quantity;
    accumulator.payoutTransactions.add(transactionId);
    dispensedTotal += value;
    if (inBaseWindow) {
      accumulator.sinceBase += value;
      accumulator.sinceBaseTransactions.add(transactionId);
      dispensedSinceBaseTotal += value;
    }
    if (inLastLoadWindow) {
      accumulator.sinceLastLoad += value;
      accumulator.sinceLastLoadTransactions.add(transactionId);
      dispensedSinceLastLoadTotal += value;
    }
    for (let index = 0; index < sinceBoundariesMs.length; index += 1) {
      const boundary = sinceBoundariesMs[index] ?? null;
      if (boundary === null || at <= boundary) {
        continue;
      }
      const bucket = accumulator.sinceBoundaries[index];
      if (bucket) {
        bucket.cents += value;
        bucket.transactions.add(transactionId);
      }
    }
  };

  for (const transaction of transactions) {
    const errorState = isErrorReturnedState(transaction.stateTransaction);
    const payoutCents = decimalToCents(transaction.returnAmount);
    const hasPayout = payoutCents > 0n;
    returnAmountTotal += payoutCents;
    detailsRead += transaction.details.length;

    // Ventanas: el límite inferior es EXCLUSIVO (el arqueo y el cargue son el conteo de
    // arranque, no un movimiento posterior), igual que el cuadre físico.
    const transactionAt = toMillis(transaction.dateCreated ?? null);
    const inBaseWindow =
      hasBaseWindow && !Number.isNaN(transactionAt) && transactionAt > (baseAtMs as number);
    const inLastLoadWindow =
      hasLastLoadWindow && !Number.isNaN(transactionAt) && transactionAt > (lastLoadAtMs as number);

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
        addDispensed(accumulator, value, quantity, transaction.id, transactionAt, inBaseWindow, inLastLoadWindow);
        dispensedInTransaction = true;
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
      addDispensed(accumulator, value, quantity, transaction.id, transactionAt, inBaseWindow, inLastLoadWindow);
      dispensedInTransaction = true;
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
      dispensedSinceBase: hasBaseWindow
        ? { transactions: entry.sinceBaseTransactions.size, value: centsToDecimal(entry.sinceBase) }
        : null,
      dispensedSinceBoundaries: sinceBoundariesMs.map((atMs, index) => {
        if (atMs === null) {
          return null;
        }
        const bucket = entry.sinceBoundaries[index];
        return bucket === undefined
          ? null
          : { atMs, transactions: bucket.transactions.size, value: centsToDecimal(bucket.cents) };
      }),
      dispensedSinceLastLoad: hasLastLoadWindow
        ? { transactions: entry.sinceLastLoadTransactions.size, value: centsToDecimal(entry.sinceLastLoad) }
        : null,
      dispensedUnits: entry.units,
      dispensedValue: centsToDecimal(entry.dispensed),
      failedValue: centsToDecimal(entry.failed),
      label: entry.label,
      payoutTransactions: entry.payoutTransactions.size,
    })),
    detailsFailures: scan.detailsFailures,
    dispensedSinceBaseTotal: hasBaseWindow ? centsToDecimal(dispensedSinceBaseTotal) : null,
    dispensedSinceLastLoadTotal: hasLastLoadWindow ? centsToDecimal(dispensedSinceLastLoadTotal) : null,
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
