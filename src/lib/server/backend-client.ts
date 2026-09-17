import "server-only";

import { z } from "zod";

import {
  BACKEND_API_KEY_HEADER,
  type BackendConfig,
  BackendConfigurationError,
  createBackendUrl,
  getBackendConfig,
} from "@/lib/server/backend-config";
import { httpErrorSchema } from "@/schemas/http";

export class BackendApiError extends Error {
  readonly code: number | null;
  readonly status: number;

  constructor({ code, message, status }: { code?: number | null; message: string; status: number }) {
    super(message);
    this.name = "BackendApiError";
    this.code = code ?? null;
    this.status = status;
  }
}

export interface BackendRequestOptions {
  body?: BodyInit;
  headers?: HeadersInit;
  method?: "DELETE" | "GET" | "HEAD" | "PATCH" | "POST" | "PUT";
  token?: string;
}

function parseLegacyErrorMessage(message: string | null | undefined): { code: number | null; message: string } {
  if (!message) {
    return {
      code: null,
      message: "El servicio no devolvió un mensaje de error.",
    };
  }

  const separatorIndex = message.indexOf(":");
  if (separatorIndex <= 0) {
    return {
      code: null,
      message,
    };
  }

  const possibleCode = Number(message.slice(0, separatorIndex));
  return {
    code: Number.isInteger(possibleCode) ? possibleCode : null,
    message: message.slice(separatorIndex + 1).trim() || message,
  };
}

function createHeaders(config: BackendConfig, options: BackendRequestOptions): Headers {
  const headers = new Headers(options.headers);
  headers.set(BACKEND_API_KEY_HEADER, config.apiKeyId);
  headers.set("Accept", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  return headers;
}

async function parseError(response: Response): Promise<BackendApiError> {
  const responseText = await response.text();
  const parsedResponse = httpErrorSchema.safeParse(
    responseText.length > 0 ? tryParseJson(responseText) : undefined,
  );

  if (parsedResponse.success) {
    const parsedMessage = parseLegacyErrorMessage(parsedResponse.data.message);
    return new BackendApiError({
      code: parsedMessage.code,
      message: parsedMessage.message,
      status: response.status,
    });
  }

  const parsedMessage = parseLegacyErrorMessage(responseText);
  return new BackendApiError({
    code: parsedMessage.code,
    message: parsedMessage.message,
    status: response.status,
  });
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

export async function requestBackend<TSchema extends z.ZodType>(
  pathSegments: readonly string[],
  responseSchema: TSchema,
  options: BackendRequestOptions = {},
): Promise<z.output<TSchema>> {
  const config = getBackendConfig();
  const response = await fetch(createBackendUrl(config, pathSegments, ""), {
    body: options.body,
    cache: "no-store",
    headers: createHeaders(config, options),
    method: options.method ?? "GET",
    redirect: "manual",
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const payload = await response.json() as unknown;
  const parsedPayload = responseSchema.safeParse(payload);

  if (!parsedPayload.success) {
    throw new BackendApiError({
      message: "La respuesta del servicio no cumple el contrato esperado.",
      status: 502,
    });
  }

  return parsedPayload.data;
}

export function isBackendConfigurationError(error: unknown): error is BackendConfigurationError {
  return error instanceof BackendConfigurationError;
}
