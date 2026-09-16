import type {
  DashboardTransaction,
  TransactionPaymentType,
  TransactionSearchRequest,
} from "@/features/transactions/schemas";
import { compareMoneyStrings } from "@/lib/formatters/money";

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
