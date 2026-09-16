"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { downloadExcel, downloadTransactionVideo, getTransactionDetails, searchTransactions, transactionQueryKeys } from "@/features/transactions/api";
import type { ExcelRequest, TransactionSearchRequest, VideoRequest } from "@/features/transactions/schemas";

export function useTransactionSearch(request: TransactionSearchRequest | null) {
  return useQuery({
    enabled: request !== null,
    queryFn: () => {
      if (request === null) {
        throw new Error("Ingresa parámetros de búsqueda para consultar transacciones.");
      }
      return searchTransactions(request);
    },
    queryKey: request === null ? ["transactions", "search", "none"] : transactionQueryKeys.search(request),
  });
}

export function useTransactionDetails(id: number | null) {
  return useQuery({
    enabled: id !== null,
    queryFn: () => {
      if (id === null) {
        throw new Error("No se indicó una transacción para consultar sus detalles.");
      }
      return getTransactionDetails(id);
    },
    queryKey: id === null ? ["transactions", "detail", "none"] : transactionQueryKeys.detail(id),
  });
}

export function useDownloadExcel() {
  return useMutation({ mutationFn: (payload: ExcelRequest) => downloadExcel(payload) });
}

export function useDownloadTransactionVideo() {
  return useMutation({ mutationFn: (payload: VideoRequest) => downloadTransactionVideo(payload) });
}
