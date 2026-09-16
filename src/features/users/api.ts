"use client";

import { z } from "zod";

import type { UserChangePasswordRequest, UserCreateRequest, UserUpdateRequest } from "@/features/users/schemas";
import { userSchema } from "@/features/users/schemas";
import { requestApi } from "@/lib/api/client";
import { deleteBackendResource, requestBackendApi, sendBackendJson } from "@/lib/api/backend";

const actionResponseSchema = z.object({
  message: z.string(),
});

export const userQueryKeys = {
  all: ["users"] as const,
  detail: (id: number) => ["users", "detail", id] as const,
  list: () => ["users", "list"] as const,
};

export function getUsers() {
  return requestBackendApi(["api", "User"], z.array(userSchema));
}

export function getUser(id: number) {
  return requestBackendApi(["api", "User", id], userSchema);
}

export function createUser(payload: UserCreateRequest) {
  return requestApi("/api/users", actionResponseSchema, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function updateUser(payload: UserUpdateRequest) {
  return sendBackendJson(["api", "User"], "PUT", payload, z.unknown());
}

export function deleteUser(id: number): Promise<void> {
  return deleteBackendResource(["api", "User", id]);
}

export function verifyUserPassword(payload: { password: string; userName: string }) {
  return requestApi("/api/auth/verify-password", actionResponseSchema, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function changeUserPassword(payload: UserChangePasswordRequest) {
  return requestApi("/api/users/change-password", actionResponseSchema, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });
}
