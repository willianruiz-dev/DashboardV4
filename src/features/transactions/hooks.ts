"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { downloadExcel, downloadTransactionVideo, getTransactionDetails, searchTransactions, transactionQueryKeys } from "@/features/transactions/api";
import type { ExcelRequest, TransactionSearchRequest, VideoRequest } from "@/features/transactions/schemas";
import { isSameTransactionSearch } from "@/features/transactions/transaction-search";

/** La solicitud va en la tercera posición de `transactionQueryKeys.search`. */
function requestFromQueryKey(queryKey: readonly unknown[] | undefined): TransactionSearchRequest | null {
  const candidate = queryKey?.[2];
  return typeof candidate === "object" && candidate !== null ? (candidate as TransactionSearchRequest) : null;
}

export function useTransactionSearch(request: TransactionSearchRequest | null) {
  return useQuery({
    enabled: request !== null,
    // Al cambiar el orden, la dirección, la página o el producto de la MISMA consulta, la tabla
    // actual sigue visible (atenuada) hasta que llega el nuevo orden; antes todo se reemplazaba
    // por un esqueleto de carga. Una consulta nueva nunca muestra resultados de la anterior.
    placeholderData: (previousData, previousQuery) =>
      isSameTransactionSearch(requestFromQueryKey(previousQuery?.queryKey), request) ? previousData : undefined,
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
