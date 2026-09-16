"use client";

import { z } from "zod";

import type { CurrencyDenominationMutation } from "@/features/denominations/schemas";
import { denominationSchema } from "@/features/denominations/schemas";
import { requestApi } from "@/lib/api/client";
import { deleteBackendResource, requestBackendApi } from "@/lib/api/backend";

const actionResponseSchema = z.object({ message: z.string() });

export const denominationQueryKeys = {
  all: ["currency-denominations"] as const,
  detail: (id: number) => ["currency-denominations", "detail", id] as const,
  list: () => ["currency-denominations", "list"] as const,
};

export function getDenominations() {
  return requestBackendApi(["api", "Masters", "CurrencyDenomination"], z.array(denominationSchema));
}

export function getDenomination(id: number) {
  return requestBackendApi(["api", "Masters", "CurrencyDenomination", id], denominationSchema);
}

function saveDenomination(method: "POST" | "PUT", payload: CurrencyDenominationMutation) {
  return requestApi("/api/masters/denominations", actionResponseSchema, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method,
  });
}

export function createDenomination(payload: CurrencyDenominationMutation) {
  return saveDenomination("POST", payload);
}

export function updateDenomination(payload: CurrencyDenominationMutation) {
  return saveDenomination("PUT", payload);
}

export function deleteDenomination(id: number): Promise<void> {
  return deleteBackendResource(["api", "Masters", "CurrencyDenomination", id]);
}
