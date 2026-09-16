"use client";

import type { ExcelRequest, TransactionSearchRequest, VideoRequest } from "@/features/transactions/schemas";
import { transactionDetailsResponseSchema, transactionSearchResponseSchema } from "@/features/transactions/schemas";
import { ClientApiError, requestApi } from "@/lib/api/client";
import { backendPath, requestBackendApi } from "@/lib/api/backend";

async function emptyWhenNotFound<T>(request: Promise<T>): Promise<T | []> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ClientApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

function errorMessage(value: unknown): string {
  return typeof value === "object" && value !== null && "message" in value && typeof value.message === "string"
    ? value.message
    : "No fue posible descargar el archivo.";
}

function triggerDownload(blob: Blob, fileName: string): void {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

async function downloadFile(path: string, fileName: string, init: RequestInit): Promise<void> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    throw new ClientApiError({ message: errorMessage(body), status: response.status });
  }
  triggerDownload(await response.blob(), fileName);
}

export const transactionQueryKeys = {
  all: ["transactions"] as const,
  detail: (id: number) => ["transactions", "detail", id] as const,
  search: (request: TransactionSearchRequest) => ["transactions", "search", request] as const,
};

export function searchTransactions(payload: TransactionSearchRequest) {
  return requestApi("/api/transactions/search", transactionSearchResponseSchema, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export function getTransactionDetails(id: number) {
  return emptyWhenNotFound(requestBackendApi(["api", "Transaction", id, "Details"], transactionDetailsResponseSchema));
}

export function downloadExcel(payload: ExcelRequest): Promise<void> {
  return downloadFile(backendPath("api", "Transaction", "ExcelDoc"), payload.fileName, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export function downloadTransactionVideo(payload: VideoRequest): Promise<void> {
  const query = new URLSearchParams({
    idPaypad: String(payload.idPaypad),
    idTransaction: String(payload.idTransaction),
  });
  return downloadFile(`${backendPath("api", "Transaction", "Video")}?${query.toString()}`, `transaccion_${payload.idTransaction}.mp4`, { method: "GET" });
}
