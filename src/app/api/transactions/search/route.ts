import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getPaypadMachineName } from "@/features/paypads/paypad-display";
import { paypadSchema, type PayPad } from "@/features/paypads/schemas";
import { transactionSchema, transactionSearchRequestSchema, transactionSearchResponseSchema, type DashboardTransaction, type TransactionSearchRequest } from "@/features/transactions/schemas";
import { compareMoneyStrings, subtractMoneyStrings, sumMoneyStrings } from "@/lib/formatters/money";
import { BackendApiError, requestBackend } from "@/lib/server/backend-client";
import { requireDashboardToken } from "@/lib/server/require-dashboard-token";
import { createApiRouteError } from "@/lib/server/route-error";
import { httpEnvelopeSchema } from "@/schemas/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function text(value: string | null | undefined): string {
  return value ?? "";
}

function compareTransactions(left: DashboardTransaction, right: DashboardTransaction, search: TransactionSearchRequest): number {
  let result: number;
  switch (search.sortKey) {
    case "id":
      result = left.id - right.id;
      break;
    case "totalAmount":
      result = compareMoneyStrings(left.totalAmount, right.totalAmount);
      break;
    case "product":
      result = text(left.product).localeCompare(text(right.product));
      break;
    case "stateTransaction":
      result = text(left.stateTransaction).localeCompare(text(right.stateTransaction));
      break;
    case "typePayment":
      result = text(left.typePayment).localeCompare(text(right.typePayment));
      break;
    case "typeTransaction":
      result = text(left.typeTransaction).localeCompare(text(right.typeTransaction));
      break;
    case "dateCreated":
      result = text(left.dateCreated).localeCompare(text(right.dateCreated));
      break;
  }
  return search.sortDirection === "asc" ? result : -result;
}

interface TransactionSearchPaypad {
  id: number;
  paypadUsername: string | null;
}

function toTransactionSearchPaypad(paypad: PayPad): TransactionSearchPaypad {
  return {
    id: paypad.id,
    paypadUsername: getPaypadMachineName(paypad),
  };
}

async function getTransactions(paypad: TransactionSearchPaypad, from: string, to: string, token: string): Promise<DashboardTransaction[]> {
  try {
    const envelope = await requestBackend(["api", "Transaction", "GetByDate"], httpEnvelopeSchema(z.array(transactionSchema)), {
      body: JSON.stringify({ from, id: paypad.id, to }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      token,
    });

    // The Transaction DTO's `paypad` label is a server-side display field and can
    // contain the Pay+ description. Resolve the only authoritative machine label
    // from the same PayPad list used by the legacy selector (`username`).
    return envelope.response.map((transaction) => ({
      ...transaction,
      paypadUsername: paypad.paypadUsername,
    }));
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

async function getPaypads(token: string): Promise<PayPad[]> {
  try {
    const envelope = await requestBackend(["api", "PayPad"], httpEnvelopeSchema(z.array(paypadSchema)), { token });
    return envelope.response;
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

function createSummary(transactions: readonly DashboardTransaction[]) {
  const approved = transactions.filter((transaction) => text(transaction.stateTransaction).includes("Aprobada"));
  const approvedExact = transactions.filter((transaction) => transaction.stateTransaction === "Aprobada");
  const netAmount = (transaction: DashboardTransaction) => subtractMoneyStrings(transaction.incomeAmount, transaction.returnAmount);

  return {
    approvedCount: approved.length,
    approvedTotal: sumMoneyStrings(approvedExact.map(netAmount)),
    cancelledCount: transactions.filter((transaction) => transaction.stateTransaction === "Cancelada").length,
    cardTotal: sumMoneyStrings(approved.filter((transaction) => transaction.typePayment === "Tarjeta").map(netAmount)),
    cashTotal: sumMoneyStrings(approved.filter((transaction) => transaction.typePayment === "Efectivo").map(netAmount)),
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json().catch(() => undefined);
    const search = transactionSearchRequestSchema.parse(body);
    const token = await requireDashboardToken();
    const paypads = await getPaypads(token);
    const selectedPaypad = search.paypadId === null ? undefined : paypads.find((paypad) => paypad.id === search.paypadId);
    const searchPaypads = search.paypadId === null
      ? paypads.map(toTransactionSearchPaypad)
      : [{
          id: search.paypadId,
          paypadUsername: selectedPaypad ? getPaypadMachineName(selectedPaypad) : null,
        }];
    const resultSets = await Promise.all(searchPaypads.map((paypad) => getTransactions(paypad, search.from, search.to, token)));
    const allTransactions = resultSets.flat();
    const products = [...new Set(allTransactions.flatMap((transaction) => transaction.product?.trim() ? [transaction.product] : []))].sort((left, right) => left.localeCompare(right));
    const matchingTransactions = search.product === null ? allTransactions : allTransactions.filter((transaction) => transaction.product === search.product);
    const sortedTransactions = [...matchingTransactions].sort((left, right) => compareTransactions(left, right, search));
    const start = (search.page - 1) * search.pageSize;
    const response = transactionSearchResponseSchema.parse({
      items: sortedTransactions.slice(start, start + search.pageSize),
      products,
      summary: createSummary(matchingTransactions),
      total: sortedTransactions.length,
      transactionIds: sortedTransactions.map((transaction) => transaction.id),
    });

    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return createApiRouteError(error);
  }
}
