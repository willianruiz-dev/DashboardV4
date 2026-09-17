"use client";

import { z } from "zod";

import type { ClientMutation } from "@/features/clients/schemas";
import { clientSchema } from "@/features/clients/schemas";
import { deleteBackendResource, requestBackendApi, sendBackendJson } from "@/lib/api/backend";

export const clientQueryKeys = {
  all: ["clients"] as const,
  detail: (id: number) => ["clients", "detail", id] as const,
  list: () => ["clients", "list"] as const,
};

export function getClients() {
  return requestBackendApi(["api", "Client"], z.array(clientSchema));
}

export function getClient(id: number) {
  return requestBackendApi(["api", "Client", id], clientSchema);
}

export function createClient(payload: ClientMutation) {
  return sendBackendJson(["api", "Client"], "POST", payload, z.unknown());
}

export function updateClient(payload: ClientMutation) {
  return sendBackendJson(["api", "Client"], "PUT", payload, z.unknown());
}

export function deleteClient(id: number): Promise<void> {
  return deleteBackendResource(["api", "Client", id]);
}
