"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createOffice, deleteOffice, getOffice, getOffices, getOfficesByClient, officeQueryKeys, updateOffice } from "@/features/offices/api";
import type { OfficeMutation } from "@/features/offices/schemas";

export function useOffices(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getOffices,
    queryKey: officeQueryKeys.all,
  });
}

export function useOfficesByClient(clientId: number | null, enabled = true) {
  return useQuery({
    enabled: enabled && clientId !== null,
    queryFn: () => {
      if (clientId === null) {
        throw new Error("Selecciona un cliente antes de consultar sucursales.");
      }

      return getOfficesByClient(clientId);
    },
    queryKey: clientId === null ? ["offices", "client", "none"] : officeQueryKeys.byClient(clientId),
  });
}

export function useOffice(id: number | null) {
  return useQuery({
    enabled: id !== null,
    queryFn: () => {
      if (id === null) {
        throw new Error("No se indicó una sucursal para consultar.");
      }

      return getOffice(id);
    },
    queryKey: id === null ? ["offices", "detail", "none"] : officeQueryKeys.detail(id),
  });
}

function useInvalidateOffices() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: officeQueryKeys.all });
}

export function useCreateOffice() {
  const invalidateOffices = useInvalidateOffices();
  return useMutation({
    mutationFn: (payload: OfficeMutation) => createOffice(payload),
    onSuccess: invalidateOffices,
  });
}

export function useUpdateOffice() {
  const invalidateOffices = useInvalidateOffices();
  return useMutation({
    mutationFn: (payload: OfficeMutation) => updateOffice(payload),
    onSuccess: invalidateOffices,
  });
}

export function useDeleteOffice() {
  const invalidateOffices = useInvalidateOffices();
  return useMutation({
    mutationFn: (id: number) => deleteOffice(id),
    onSuccess: invalidateOffices,
  });
}
