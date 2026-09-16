"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createClient, deleteClient, getClient, getClients, updateClient, clientQueryKeys } from "@/features/clients/api";
import type { ClientMutation } from "@/features/clients/schemas";

export function useClients(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getClients,
    queryKey: clientQueryKeys.list(),
  });
}

export function useClient(id: number | null) {
  return useQuery({
    enabled: id !== null,
    queryFn: () => {
      if (id === null) {
        throw new Error("No se indicó un cliente para consultar.");
      }

      return getClient(id);
    },
    queryKey: id === null ? ["clients", "detail", "none"] : clientQueryKeys.detail(id),
  });
}

function useInvalidateClients() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: clientQueryKeys.all });
}

export function useCreateClient() {
  const invalidateClients = useInvalidateClients();
  return useMutation({
    mutationFn: (payload: ClientMutation) => createClient(payload),
    onSuccess: invalidateClients,
  });
}

export function useUpdateClient() {
  const invalidateClients = useInvalidateClients();
  return useMutation({
    mutationFn: (payload: ClientMutation) => updateClient(payload),
    onSuccess: invalidateClients,
  });
}

export function useDeleteClient() {
  const invalidateClients = useInvalidateClients();
  return useMutation({
    mutationFn: (id: number) => deleteClient(id),
    onSuccess: invalidateClients,
  });
}
