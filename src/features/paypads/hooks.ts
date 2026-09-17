"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  changePaypadPassword,
  createPaypad,
  createPaypadConfiguration,
  deletePaypad,
  getPaypad,
  getPaypadConfiguration,
  getPaypadLoads,
  getPaypadStorage,
  getPaypadTonnages,
  getPaypads,
  paypadQueryKeys,
  saveLoad,
  savePaypadStorage,
  saveTonnage,
  updatePaypad,
  updatePaypadConfiguration,
} from "@/features/paypads/api";
import type {
  LoadMutation,
  PayPadConfigurationMutation,
  PayPadCreateRequest,
  PayPadMutation,
  PayPadStorageMutation,
  TonnageMutation,
} from "@/features/paypads/schemas";

export function usePaypads(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getPaypads,
    queryKey: paypadQueryKeys.list(),
  });
}

export function usePaypad(id: number | null) {
  return useQuery({
    enabled: id !== null,
    queryFn: () => {
      if (id === null) {
        throw new Error("No se indicó un Pay+ para consultar.");
      }
      return getPaypad(id);
    },
    queryKey: id === null ? ["paypads", "detail", "none"] : paypadQueryKeys.detail(id),
  });
}

export function usePaypadStorage(id: number | null) {
  return useQuery({
    enabled: id !== null,
    queryFn: () => {
      if (id === null) {
        throw new Error("No se indicó un Pay+ para consultar almacenamiento.");
      }
      return getPaypadStorage(id);
    },
    queryKey: id === null ? ["paypads", "storage", "none"] : paypadQueryKeys.storage(id),
  });
}

export function usePaypadConfiguration(id: number | null) {
  return useQuery({
    enabled: id !== null,
    queryFn: () => {
      if (id === null) {
        throw new Error("No se indicó un Pay+ para consultar configuración.");
      }
      return getPaypadConfiguration(id);
    },
    queryKey: id === null ? ["paypads", "configuration", "none"] : paypadQueryKeys.configuration(id),
    retry: false,
  });
}

export function usePaypadLoads(id: number | null) {
  return useQuery({
    enabled: id !== null,
    queryFn: () => {
      if (id === null) {
        throw new Error("No se indicó un Pay+ para consultar cargues.");
      }
      return getPaypadLoads(id);
    },
    queryKey: id === null ? ["paypads", "loads", "none"] : paypadQueryKeys.loads(id),
  });
}

export function usePaypadTonnages(id: number | null) {
  return useQuery({
    enabled: id !== null,
    queryFn: () => {
      if (id === null) {
        throw new Error("No se indicó un Pay+ para consultar arqueos.");
      }
      return getPaypadTonnages(id);
    },
    queryKey: id === null ? ["paypads", "tonnages", "none"] : paypadQueryKeys.tonnages(id),
  });
}

function useInvalidatePaypads() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: paypadQueryKeys.all });
}

export function useCreatePaypad() {
  const invalidate = useInvalidatePaypads();
  return useMutation({ mutationFn: (payload: PayPadCreateRequest) => createPaypad(payload), onSuccess: invalidate });
}

export function useUpdatePaypad() {
  const invalidate = useInvalidatePaypads();
  return useMutation({ mutationFn: (payload: PayPadMutation) => updatePaypad(payload), onSuccess: invalidate });
}

export function useDeletePaypad() {
  const invalidate = useInvalidatePaypads();
  return useMutation({ mutationFn: (id: number) => deletePaypad(id), onSuccess: invalidate });
}

export function useChangePaypadPassword() {
  return useMutation({ mutationFn: (payload: { document: string; newPwd: string; oldPwd: string }) => changePaypadPassword(payload) });
}

export function useSavePaypadStorage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PayPadStorageMutation[]) => savePaypadStorage(payload),
    onSuccess: async (_data, payload) => {
      const paypadId = payload[0]?.idPayPad;
      if (paypadId !== undefined) {
        await queryClient.invalidateQueries({ queryKey: paypadQueryKeys.storage(paypadId) });
      }
    },
  });
}

export function useSaveLoad() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoadMutation) => saveLoad(payload),
    onSuccess: async (_data, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: paypadQueryKeys.loads(payload.idPayPad) }),
        queryClient.invalidateQueries({ queryKey: paypadQueryKeys.storage(payload.idPayPad) }),
      ]);
    },
  });
}

export function useSaveTonnage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TonnageMutation) => saveTonnage(payload),
    onSuccess: async (_data, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: paypadQueryKeys.tonnages(payload.idPayPad) }),
        queryClient.invalidateQueries({ queryKey: paypadQueryKeys.storage(payload.idPayPad) }),
      ]);
    },
  });
}

export function useCreatePaypadConfiguration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PayPadConfigurationMutation) => createPaypadConfiguration(payload),
    onSuccess: async (_data, payload) => {
      await queryClient.invalidateQueries({ queryKey: paypadQueryKeys.configuration(payload.idPaypad) });
    },
  });
}

export function useUpdatePaypadConfiguration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PayPadConfigurationMutation) => updatePaypadConfiguration(payload),
    onSuccess: async (_data, payload) => {
      await queryClient.invalidateQueries({ queryKey: paypadQueryKeys.configuration(payload.idPaypad) });
    },
  });
}
