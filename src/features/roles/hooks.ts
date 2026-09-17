"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createRole,
  deleteRole,
  getPermissionCatalog,
  getRole,
  getRoles,
  getRouteCatalog,
  roleQueryKeys,
  updateRole,
} from "@/features/roles/api";
import type { RoleMutation } from "@/features/roles/schemas";

export function useRoles(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getRoles,
    queryKey: roleQueryKeys.list(),
  });
}

export function useRole(id: number | null) {
  return useQuery({
    enabled: id !== null,
    queryFn: () => {
      if (id === null) {
        throw new Error("No se indicó un rol para consultar.");
      }
      return getRole(id);
    },
    queryKey: id === null ? ["roles", "detail", "none"] : roleQueryKeys.detail(id),
  });
}

export function usePermissionCatalog(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getPermissionCatalog,
    queryKey: roleQueryKeys.permissions(),
  });
}

export function useRouteCatalog(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getRouteCatalog,
    queryKey: roleQueryKeys.routes(),
  });
}

function useInvalidateRoles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: roleQueryKeys.all });
}

export function useCreateRole() {
  const invalidateRoles = useInvalidateRoles();
  return useMutation({
    mutationFn: (payload: RoleMutation) => createRole(payload),
    onSuccess: invalidateRoles,
  });
}

export function useUpdateRole() {
  const invalidateRoles = useInvalidateRoles();
  return useMutation({
    mutationFn: (payload: RoleMutation) => updateRole(payload),
    onSuccess: invalidateRoles,
  });
}

export function useDeleteRole() {
  const invalidateRoles = useInvalidateRoles();
  return useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: invalidateRoles,
  });
}
