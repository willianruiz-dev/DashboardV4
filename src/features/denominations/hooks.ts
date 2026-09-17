"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createDenomination, deleteDenomination, denominationQueryKeys, getDenomination, getDenominations, updateDenomination } from "@/features/denominations/api";
import type { CurrencyDenominationMutation } from "@/features/denominations/schemas";

export function useDenominations(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getDenominations,
    queryKey: denominationQueryKeys.list(),
  });
}

export function useDenomination(id: number | null) {
  return useQuery({
    enabled: id !== null,
    queryFn: () => {
      if (id === null) {
        throw new Error("No se indicó una denominación para consultar.");
      }
      return getDenomination(id);
    },
    queryKey: id === null ? ["currency-denominations", "detail", "none"] : denominationQueryKeys.detail(id),
  });
}

function useInvalidateDenominations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: denominationQueryKeys.all });
}

export function useCreateDenomination() {
  const invalidate = useInvalidateDenominations();
  return useMutation({
    mutationFn: (payload: CurrencyDenominationMutation) => createDenomination(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateDenomination() {
  const invalidate = useInvalidateDenominations();
  return useMutation({
    mutationFn: (payload: CurrencyDenominationMutation) => updateDenomination(payload),
    onSuccess: invalidate,
  });
}

export function useDeleteDenomination() {
  const invalidate = useInvalidateDenominations();
  return useMutation({
    mutationFn: (id: number) => deleteDenomination(id),
    onSuccess: invalidate,
  });
}
