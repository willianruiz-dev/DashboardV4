"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createMaster, deleteMaster, getMaster, getMasters, masterQueryKeys, updateMaster } from "@/features/masters/api";
import type { MasterKind, MasterMutation } from "@/features/masters/schemas";

export function useMasters(kind: MasterKind, enabled = true) {
  return useQuery({
    enabled,
    queryFn: () => getMasters(kind),
    queryKey: masterQueryKeys.list(kind),
  });
}

export function useMaster(kind: MasterKind, id: number | null) {
  return useQuery({
    enabled: id !== null,
    queryFn: () => {
      if (id === null) {
        throw new Error("No se indicó un registro para consultar.");
      }
      return getMaster(kind, id);
    },
    queryKey: id === null ? ["masters", kind, "detail", "none"] : masterQueryKeys.detail(kind, id),
  });
}

function useInvalidateMasters(kind: MasterKind) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["masters", kind] });
}

export function useCreateMaster(kind: MasterKind) {
  const invalidateMasters = useInvalidateMasters(kind);
  return useMutation({
    mutationFn: (payload: MasterMutation) => createMaster(kind, payload),
    onSuccess: invalidateMasters,
  });
}

export function useUpdateMaster(kind: MasterKind) {
  const invalidateMasters = useInvalidateMasters(kind);
  return useMutation({
    mutationFn: (payload: MasterMutation) => updateMaster(kind, payload),
    onSuccess: invalidateMasters,
  });
}

export function useDeleteMaster(kind: MasterKind) {
  const invalidateMasters = useInvalidateMasters(kind);
  return useMutation({
    mutationFn: (id: number) => deleteMaster(kind, id),
    onSuccess: invalidateMasters,
  });
}
