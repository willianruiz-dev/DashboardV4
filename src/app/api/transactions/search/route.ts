import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { paypadSchema } from "@/features/paypads/schemas";
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

async function getTransactions(paypadId: number, from: string, to: string, token: string): Promise<DashboardTransaction[]> {
  try {
    const envelope = await requestBackend(["api", "Transaction", "GetByDate"], httpEnvelopeSchema(z.array(transactionSchema)), {
      body: JSON.stringify({ from, id: paypadId, to }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      token,
    });
    return envelope.response;
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

async function getPaypadIds(token: string): Promise<number[]> {
  try {
    const envelope = await requestBackend(["api", "PayPad"], httpEnvelopeSchema(z.array(paypadSchema)), { token });
    return envelope.response.map((paypad) => paypad.id);
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
    const paypadIds = search.paypadId === null ? await getPaypadIds(token) : [search.paypadId];
    const resultSets = await Promise.all(paypadIds.map((paypadId) => getTransactions(paypadId, search.from, search.to, token)));
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
