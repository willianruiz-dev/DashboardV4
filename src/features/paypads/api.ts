"use client";

import { z } from "zod";

import type {
  LoadMutation,
  PayPadConfigurationMutation,
  PayPadCreateRequest,
  PayPadMutation,
  PayPadStorageMutation,
  TonnageMutation,
} from "@/features/paypads/schemas";
import { loadSchema, paypadConfigurationMutationSchema, paypadConfigurationSchema, paypadSchema, paypadStorageSchema, tonnageSchema } from "@/features/paypads/schemas";
import { ClientApiError, requestApi } from "@/lib/api/client";
import { deleteBackendResource, requestBackendApi, sendBackendJson } from "@/lib/api/backend";

const actionResponseSchema = z.object({ message: z.string() });

// The documented list envelopes allow `response: null` when a Pay+ has no stored
// inventory or historical records. Normalize that legacy representation before it
// reaches TanStack Query.
const loadListResponseSchema = z.array(loadSchema).nullish().transform((loads) => loads ?? []);
const paypadStorageListResponseSchema = z.array(paypadStorageSchema).nullish().transform((storage) => storage ?? []);
const tonnageListResponseSchema = z.array(tonnageSchema).nullish().transform((tonnages) => tonnages ?? []);

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

export const paypadQueryKeys = {
  all: ["paypads"] as const,
  configuration: (id: number) => ["paypads", "configuration", id] as const,
  detail: (id: number) => ["paypads", "detail", id] as const,
  list: () => ["paypads", "list"] as const,
  loads: (id: number) => ["paypads", "loads", id] as const,
  storage: (id: number) => ["paypads", "storage", id] as const,
  tonnages: (id: number) => ["paypads", "tonnages", id] as const,
};

export function getPaypads() {
  return emptyWhenNotFound(requestBackendApi(["api", "PayPad"], z.array(paypadSchema)));
}

export function getPaypad(id: number) {
  return requestBackendApi(["api", "PayPad", id], paypadSchema);
}

export function getPaypadStorage(id: number) {
  return emptyWhenNotFound(requestBackendApi(["api", "PayPad", "GetStorage", id], paypadStorageListResponseSchema));
}

export function getPaypadConfiguration(id: number) {
  return requestBackendApi(["api", "PayPad", "GetConfiguration", id], paypadConfigurationSchema);
}

export function getPaypadLoads(id: number) {
  return emptyWhenNotFound(requestBackendApi(["api", "Load", "GetByPaypad", id], loadListResponseSchema));
}

export function getPaypadTonnages(id: number) {
  return emptyWhenNotFound(requestBackendApi(["api", "Tonnage", "GetByPaypad", id], tonnageListResponseSchema));
}

export function createPaypad(payload: PayPadCreateRequest) {
  return requestApi("/api/paypads", actionResponseSchema, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export function updatePaypad(payload: PayPadMutation) {
  return sendBackendJson(["api", "PayPad"], "PUT", payload, z.unknown());
}

export function deletePaypad(id: number): Promise<void> {
  return deleteBackendResource(["api", "PayPad", id]);
}

export function changePaypadPassword(payload: { document: string; newPwd: string; oldPwd: string }) {
  return requestApi("/api/paypads/change-password", actionResponseSchema, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
}

export function savePaypadStorage(payload: PayPadStorageMutation[]) {
  return requestApi("/api/paypads/storage", actionResponseSchema, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export function saveLoad(payload: LoadMutation) {
  return requestApi("/api/operations/loads", actionResponseSchema, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export function saveTonnage(payload: TonnageMutation) {
  return requestApi("/api/operations/tonnages", actionResponseSchema, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export function createPaypadConfiguration(payload: PayPadConfigurationMutation) {
  return sendBackendJson(["api", "PayPad", "CreateConfiguration"], "POST", paypadConfigurationMutationSchema.parse(payload), z.unknown());
}

export function updatePaypadConfiguration(payload: PayPadConfigurationMutation) {
  return sendBackendJson(["api", "PayPad", "UpdateConfiguration"], "PUT", paypadConfigurationMutationSchema.parse(payload), z.unknown());
}
