import type {
  DashboardTransaction,
  TransactionPaymentType,
  TransactionSearchRequest,
} from "@/features/transactions/schemas";
import { compareMoneyStrings, subtractMoneyStrings, sumMoneyStrings } from "@/lib/formatters/money";

const textCollator = new Intl.Collator("es-CO", {
  numeric: true,
  sensitivity: "base",
});

function text(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function compareDateTime(left: string | null | undefined, right: string | null | undefined): number {
  const leftTime = left ? Date.parse(left) : Number.NaN;
  const rightTime = right ? Date.parse(right) : Number.NaN;

  if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) {
    return leftTime - rightTime;
  }

  return textCollator.compare(text(left), text(right));
}

export function matchesTransactionPaymentType(
  transaction: DashboardTransaction,
  paymentType: TransactionPaymentType | null,
): boolean {
  return paymentType === null || text(transaction.typePayment) === paymentType;
}

function compareBySortKey(left: DashboardTransaction, right: DashboardTransaction, sortKey: TransactionSearchRequest["sortKey"]): number {
  switch (sortKey) {
    case "id":
      return left.id - right.id;
    case "totalAmount":
      return compareMoneyStrings(left.totalAmount, right.totalAmount);
    case "product":
      return textCollator.compare(text(left.product), text(right.product));
    case "stateTransaction":
      return textCollator.compare(text(left.stateTransaction), text(right.stateTransaction));
    case "typePayment":
      return textCollator.compare(text(left.typePayment), text(right.typePayment));
    case "typeTransaction":
      return textCollator.compare(text(left.typeTransaction), text(right.typeTransaction));
    case "dateCreated":
      return compareDateTime(left.dateCreated, right.dateCreated);
  }
}

/**
 * Orden completo y determinista: el campo elegido, luego la fecha y por último el ID. La
 * dirección se aplica a TODA la comparación, así que «Descendente» es exactamente «Ascendente»
 * al revés. Antes el desempate por ID era siempre ascendente: en los campos con valores
 * repetidos (Trámite, Medio de pago, Estado, Producto) las dos direcciones mostraban la misma
 * lista y el selector «Dirección» parecía no hacer nada.
 */
export function compareTransactions(
  left: DashboardTransaction,
  right: DashboardTransaction,
  search: Pick<TransactionSearchRequest, "sortDirection" | "sortKey">,
): number {
  const result =
    compareBySortKey(left, right, search.sortKey) ||
    compareDateTime(left.dateCreated, right.dateCreated) ||
    left.id - right.id;

  return search.sortDirection === "asc" ? result : -result;
}

export function sortTransactions(
  transactions: readonly DashboardTransaction[],
  search: Pick<TransactionSearchRequest, "sortDirection" | "sortKey">,
): DashboardTransaction[] {
  return [...transactions].sort((left, right) => compareTransactions(left, right, search));
}

/**
 * Identificador de una consulta explícita («Consultar»). No usa `crypto.randomUUID`: el panel
 * también se sirve por HTTP en una IP (docs/DEPLOY.md) y allí esa API no existe.
 */
export function createTransactionSearchId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * `true` cuando `next` sólo cambia cómo se muestra la misma consulta explícita: orden, dirección,
 * página, tamaño de página o producto. Entonces la tabla actual puede seguir visible mientras
 * llega el nuevo orden. Sin `searchId` (p. ej. el control de dispensado) nunca se considera la
 * misma consulta, y una consulta nueva jamás muestra resultados de otra máquina o período.
 */
export function isSameTransactionSearch(
  previous: TransactionSearchRequest | null | undefined,
  next: TransactionSearchRequest | null | undefined,
): boolean {
  if (!previous?.searchId || !next?.searchId) {
    return false;
  }

  return (
    previous.searchId === next.searchId &&
    previous.paypadId === next.paypadId &&
    previous.from === next.from &&
    previous.to === next.to &&
    previous.paymentType === next.paymentType
  );
}

/** Moneda de una máquina dentro del resumen de Transacciones/Reportes. */
export interface TransactionMachineCurrency {
  currencyId: number | null;
  label: string;
  /** La máquina opera más de una moneda (cambio divisa): sus importes no son separables. */
  mixed: boolean;
}

/** Totales del período agrupados por moneda (nunca se suman monedas distintas). */
export interface TransactionCurrencyBucket {
  approvedCount: number;
  approvedTotal: string;
  cancelledCount: number;
  cardTotal: string;
  cashTotal: string;
  currencyId: number | null;
  currencyLabel: string;
  /** `true` cuando el grupo son máquinas de cambio divisa: el importe no es atribuible a una moneda. */
  mixed: boolean;
}

const MIXED_BUCKET_LABEL = "Varias monedas";

/**
 * Agrupa los totales recaudados por moneda. La moneda sale de la máquina (`PayPad.idCurrency`)
 * porque el DTO de transacción no la trae; si la máquina opera varias monedas, sus importes van
 * a un grupo aparte («Varias monedas (COP, USD)») en lugar de atribuirse a una moneda que no les
 * corresponde. Es la misma regla del control de dispensado (C8) aplicada a los totales que el
 * dashboard antiguo sumaba sin distinguir.
 */
export function summarizeTransactionsByCurrency(
  transactions: readonly DashboardTransaction[],
  currencyByPaypadId: ReadonlyMap<number, TransactionMachineCurrency>,
): TransactionCurrencyBucket[] {
  const buckets = new Map<string, TransactionCurrencyBucket>();

  for (const transaction of transactions) {
    const machine = currencyByPaypadId.get(transaction.idPayPad) ?? { currencyId: null, label: "Moneda no declarada", mixed: false };
    const key = machine.mixed ? "mixed" : `currency:${machine.currencyId ?? "unknown"}`;
    const bucket = buckets.get(key) ?? {
      approvedCount: 0,
      approvedTotal: "0",
      cancelledCount: 0,
      cardTotal: "0",
      cashTotal: "0",
      currencyId: machine.mixed ? null : machine.currencyId,
      currencyLabel: machine.mixed ? MIXED_BUCKET_LABEL : machine.label,
      mixed: machine.mixed,
    };

    const amount = subtractMoneyStrings(transaction.incomeAmount, transaction.returnAmount);
    const state = text(transaction.stateTransaction);
    if (state === "Aprobada") {
      bucket.approvedCount += 1;
      bucket.approvedTotal = sumMoneyStrings([bucket.approvedTotal, amount]);
      if (text(transaction.typePayment) === "Tarjeta") {
        bucket.cardTotal = sumMoneyStrings([bucket.cardTotal, amount]);
      } else if (text(transaction.typePayment) === "Efectivo") {
        bucket.cashTotal = sumMoneyStrings([bucket.cashTotal, amount]);
      }
    }
    if (state === "Cancelada") {
      bucket.cancelledCount += 1;
    }

    // Las etiquetas de un grupo mixto se acumulan: «Varias monedas (COP, USD)».
    if (machine.mixed && machine.label && !bucket.currencyLabel.includes(machine.label)) {
      bucket.currencyLabel =
        bucket.currencyLabel === MIXED_BUCKET_LABEL ? `${MIXED_BUCKET_LABEL} (${machine.label})` : `${bucket.currencyLabel}, ${machine.label}`;
    }

    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort(
    (left, right) => compareMoneyStrings(right.approvedTotal, left.approvedTotal) || left.currencyLabel.localeCompare(right.currencyLabel),
  );
}
