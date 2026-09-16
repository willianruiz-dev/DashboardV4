"use client";

import { z } from "zod";

export class ClientApiError extends Error {
  readonly code: number | null;
  readonly status: number;

  constructor({ code, message, status }: { code?: number | null; message: string; status: number }) {
    super(message);
    this.name = "ClientApiError";
    this.code = code ?? null;
    this.status = status;
  }
}

function parseErrorCode(message: string): { code: number | null; message: string } {
  const separatorIndex = message.indexOf(":");
  if (separatorIndex <= 0) {
    return { code: null, message };
  }

  const possibleCode = Number(message.slice(0, separatorIndex));
  return {
    code: Number.isInteger(possibleCode) ? possibleCode : null,
    message: message.slice(separatorIndex + 1).trim() || message,
  };
}

async function readError(response: Response): Promise<ClientApiError> {
  const body: unknown = await response.json().catch(() => undefined);
  const message =
    typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
      ? body.message
      : "No fue posible completar la solicitud.";
  const code =
    typeof body === "object" && body !== null && "code" in body && typeof body.code === "number" ? body.code : null;
  const parsedMessage = parseErrorCode(message);

  return new ClientApiError({
    code: code ?? parsedMessage.code,
    message: parsedMessage.message,
    status: response.status,
  });
}

export async function requestApi<TSchema extends z.ZodType>(
  path: string,
  responseSchema: TSchema,
  init: RequestInit = {},
): Promise<z.output<TSchema>> {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw await readError(response);
  }

  const payload: unknown = await response.json();
  const parsedPayload = responseSchema.safeParse(payload);

  if (!parsedPayload.success) {
    throw new ClientApiError({
      message: "La aplicación recibió una respuesta con formato inesperado.",
      status: 502,
    });
  }

  return parsedPayload.data;
}
