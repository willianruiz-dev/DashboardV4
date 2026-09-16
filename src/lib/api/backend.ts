"use client";

import { z } from "zod";

import { requestApi } from "@/lib/api/client";
import { httpEnvelopeSchema } from "@/schemas/http";

export function backendPath(...segments: readonly (number | string)[]): string {
  return `/api/backend/${segments.map((segment) => encodeURIComponent(String(segment))).join("/")}`;
}

function decodeStaticPathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function backendStaticFilePath(filePath: string | null | undefined): string | null {
  if (!filePath) {
    return null;
  }

  const normalizedPath = filePath.trim().replaceAll("\\", "/").split(/[?#]/u, 1)[0] ?? "";
  const pathWithoutOrigin = normalizedPath.replace(/^https?:\/\/[^/]+/iu, "");
  const allSegments = pathWithoutOrigin.split("/").filter(Boolean).map(decodeStaticPathSegment);
  const staticfilesIndex = allSegments.findIndex((segment) => segment.toLocaleLowerCase("en-US") === "staticfiles");
  const segments = staticfilesIndex >= 0 ? allSegments.slice(staticfilesIndex + 1) : allSegments;

  if (segments.length === 0 || segments.some((segment) => segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\"))) {
    return null;
  }

  // This local route reproduces the legacy /staticfiles contract while resolving the upstream only server-side.
  return `/staticfiles/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
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
