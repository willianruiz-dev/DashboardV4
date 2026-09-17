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

export function compareTransactions(
  left: DashboardTransaction,
  right: DashboardTransaction,
  search: Pick<TransactionSearchRequest, "sortDirection" | "sortKey">,
): number {
  let result: number;

  switch (search.sortKey) {
    case "id":
      result = left.id - right.id;
      break;
    case "totalAmount":
      result = compareMoneyStrings(left.totalAmount, right.totalAmount);
      break;
    case "product":
      result = textCollator.compare(text(left.product), text(right.product));
      break;
    case "stateTransaction":
      result = textCollator.compare(text(left.stateTransaction), text(right.stateTransaction));
      break;
    case "typePayment":
      result = textCollator.compare(text(left.typePayment), text(right.typePayment));
      break;
    case "typeTransaction":
      result = textCollator.compare(text(left.typeTransaction), text(right.typeTransaction));
      break;
    case "dateCreated":
      result = compareDateTime(left.dateCreated, right.dateCreated);
      break;
  }

  if (result === 0) {
    return left.id - right.id;
  }

  return search.sortDirection === "asc" ? result : -result;
}

export function sortTransactions(
  transactions: readonly DashboardTransaction[],
  search: Pick<TransactionSearchRequest, "sortDirection" | "sortKey">,
): DashboardTransaction[] {
  return [...transactions].sort((left, right) => compareTransactions(left, right, search));
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
