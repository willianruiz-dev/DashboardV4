"use client";

import { z } from "zod";

import { requestApi } from "@/lib/api/client";
import { httpEnvelopeSchema } from "@/schemas/http";

export function backendPath(...segments: readonly (number | string)[]): string {
  return `/api/backend/${segments.map((segment) => encodeURIComponent(String(segment))).join("/")}`;
}

export function backendStaticFilePath(filePath: string | null | undefined): string | null {
  if (!filePath) {
    return null;
  }

  const segments = filePath.split("/").filter(Boolean);
  return segments.length > 0 ? backendPath("staticfiles", ...segments) : null;
}

export async function requestBackendApi<TSchema extends z.ZodType>(
  segments: readonly (number | string)[],
  responseSchema: TSchema,
  init: RequestInit = {},
): Promise<z.output<TSchema>> {
  const envelope = await requestApi(backendPath(...segments), httpEnvelopeSchema(responseSchema), init);
  return (envelope as { response: z.output<TSchema> }).response;
}

export async function sendBackendJson<TSchema extends z.ZodType>(
  segments: readonly (number | string)[],
  method: "PATCH" | "POST" | "PUT",
  body: unknown,
  responseSchema: TSchema,
): Promise<z.output<TSchema>> {
  return requestBackendApi(segments, responseSchema, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method,
  });
}

export async function deleteBackendResource(segments: readonly (number | string)[]): Promise<void> {
  await requestBackendApi(segments, z.unknown(), { method: "DELETE" });
}
