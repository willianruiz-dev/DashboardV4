"use client";

import { z } from "zod";

import type { MasterKind, MasterMutation } from "@/features/masters/schemas";
import { masterRecordSchema } from "@/features/masters/schemas";
import { deleteBackendResource, requestBackendApi, sendBackendJson } from "@/lib/api/backend";

export const masterQueryKeys = {
  all: ["masters"] as const,
  detail: (kind: MasterKind, id: number) => ["masters", kind, "detail", id] as const,
  list: (kind: MasterKind) => ["masters", kind, "list"] as const,
};

export function getMasters(kind: MasterKind) {
  return requestBackendApi(["api", "Masters", kind], z.array(masterRecordSchema));
}

export function getMaster(kind: MasterKind, id: number) {
  return requestBackendApi(["api", "Masters", kind, id], masterRecordSchema);
}

export function createMaster(kind: MasterKind, payload: MasterMutation) {
  return sendBackendJson(["api", "Masters", kind], "POST", payload, z.unknown());
}

export function updateMaster(kind: MasterKind, payload: MasterMutation) {
  return sendBackendJson(["api", "Masters", kind], "PUT", payload, z.unknown());
}

export function deleteMaster(kind: MasterKind, id: number): Promise<void> {
  return deleteBackendResource(["api", "Masters", kind, id]);
}
