"use client";

import { z } from "zod";

import type { OfficeMutation } from "@/features/offices/schemas";
import { officeSchema } from "@/features/offices/schemas";
import { ClientApiError } from "@/lib/api/client";
import { deleteBackendResource, requestBackendApi, sendBackendJson } from "@/lib/api/backend";

export const officeQueryKeys = {
  all: ["offices"] as const,
  byClient: (clientId: number) => ["offices", "client", clientId] as const,
  detail: (id: number) => ["offices", "detail", id] as const,
};

async function emptyWhenNotFound<T>(request: Promise<T>): Promise<T | []> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ClientApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

export function getOffices() {
  return emptyWhenNotFound(requestBackendApi(["api", "Office"], z.array(officeSchema)));
}

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
