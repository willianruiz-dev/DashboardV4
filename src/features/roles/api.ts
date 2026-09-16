"use client";

import { z } from "zod";

import { permissionSchema, routeSchema } from "@/features/auth/schemas";
import type { RoleMutation } from "@/features/roles/schemas";
import { dashboardRoleSchema } from "@/features/roles/schemas";
import { deleteBackendResource, requestBackendApi, sendBackendJson } from "@/lib/api/backend";

export const roleQueryKeys = {
  all: ["roles"] as const,
  detail: (id: number) => ["roles", "detail", id] as const,
  list: () => ["roles", "list"] as const,
  permissions: () => ["roles", "permissions"] as const,
  routes: () => ["roles", "routes"] as const,
};

export function getRoles() {
  return requestBackendApi(["api", "Role"], z.array(dashboardRoleSchema));
}

export function getRole(id: number) {
  return requestBackendApi(["api", "Role", id], dashboardRoleSchema);
}

export function getPermissionCatalog() {
  return requestBackendApi(["api", "Permission"], z.array(permissionSchema));
}

export function getRouteCatalog() {
  return requestBackendApi(["api", "Route"], z.array(routeSchema));
}

export function createRole(payload: RoleMutation) {
  return sendBackendJson(["api", "Role"], "POST", payload, z.unknown());
}

export function updateRole(payload: RoleMutation) {
  return sendBackendJson(["api", "Role"], "PUT", payload, z.unknown());
}

export function deleteRole(id: number): Promise<void> {
  return deleteBackendResource(["api", "Role", id]);
}
