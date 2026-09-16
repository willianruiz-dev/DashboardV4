"use client";

import { z } from "zod";

import type { OfficeMutation } from "@/features/offices/schemas";
import { officeSchema } from "@/features/offices/schemas";
import { deleteBackendResource, requestBackendApi, sendBackendJson } from "@/lib/api/backend";

export const officeQueryKeys = {
  all: ["offices"] as const,
  byClient: (clientId: number) => ["offices", "client", clientId] as const,
  detail: (id: number) => ["offices", "detail", id] as const,
};

export function getOfficesByClient(clientId: number) {
  return requestBackendApi(["api", "Office", "Client", clientId], z.array(officeSchema));
}

export function getOffice(id: number) {
  return requestBackendApi(["api", "Office", id], officeSchema);
}

export function createOffice(payload: OfficeMutation) {
  return sendBackendJson(["api", "Office"], "POST", payload, z.unknown());
}

export function updateOffice(payload: OfficeMutation) {
  return sendBackendJson(["api", "Office"], "PUT", payload, z.unknown());
}

export function deleteOffice(id: number): Promise<void> {
  return deleteBackendResource(["api", "Office", id]);
}
