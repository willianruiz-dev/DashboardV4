"use client";

import { z } from "zod";

const MAX_VALIDATION_ISSUES = 3;

export interface ClientValidationIssue {
  code: string;
  path: string;
}

export class ClientApiError extends Error {
  readonly code: number | null;
  readonly status: number;
  readonly validationIssues: readonly ClientValidationIssue[];

  constructor({
    code,
    message,
    status,
    validationIssues = [],
  }: {
    code?: number | null;
    message: string;
    status: number;
    validationIssues?: readonly ClientValidationIssue[];
  }) {
    super(message);
    this.name = "ClientApiError";
    this.code = code ?? null;
    this.status = status;
    this.validationIssues = validationIssues;
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

function sanitizeValidationIssuePath(path: readonly PropertyKey[]): string {
  return path.length === 0
    ? "<root>"
    : path.map((segment) => typeof segment === "number" ? "[]" : String(segment)).join(".");
}

function getSanitizedValidationIssues(error: z.ZodError): ClientValidationIssue[] {
  return error.issues.slice(0, MAX_VALIDATION_ISSUES).map((issue) => ({
    code: issue.code,
    path: sanitizeValidationIssuePath(issue.path),
  }));
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

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new ClientApiError({
      message: "La aplicación recibió una respuesta JSON incompleta o inválida.",
      status: 502,
    });
  }

  const parsedPayload = responseSchema.safeParse(payload);

  if (!parsedPayload.success) {
    throw new ClientApiError({
      message: "La aplicación recibió una respuesta con formato inesperado.",
      status: 502,
      validationIssues: getSanitizedValidationIssues(parsedPayload.error),
    });
  }

  return parsedPayload.data;
}
