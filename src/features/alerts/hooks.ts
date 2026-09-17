"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { alertQueryKeys, createSubscription, deleteSubscription, getSubscriptionsByPaypad } from "@/features/alerts/api";
import type { AlertSubscriptionCreate } from "@/features/alerts/schemas";

export function useSubscriptions(paypadId: number | null, enabled = true) {
  return useQuery({
    enabled: enabled && paypadId !== null,
    queryFn: () => {
      if (paypadId === null) {
        throw new Error("Selecciona un Pay+ para consultar sus alertas.");
      }
      return getSubscriptionsByPaypad(paypadId);
    },
    queryKey: paypadId === null ? ["alerts", "subscriptions", "none"] : alertQueryKeys.subscriptions(paypadId),
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AlertSubscriptionCreate) => createSubscription(payload),
    onSuccess: async (_data, payload) => {
      await queryClient.invalidateQueries({ queryKey: alertQueryKeys.subscriptions(payload.idPayPad) });
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; paypadId: number }) => deleteSubscription(id),
    onSuccess: async (_data, payload) => {
      await queryClient.invalidateQueries({ queryKey: alertQueryKeys.subscriptions(payload.paypadId) });
    },
  });
}
