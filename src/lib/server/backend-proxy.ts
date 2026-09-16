import "server-only";

import { NextRequest, NextResponse } from "next/server";

import {
  BACKEND_API_KEY_HEADER,
  BackendConfigurationError,
  createBackendUrl,
  createStaticFilesUrl,
  getBackendConfig,
  getStaticFilesConfig,
} from "@/lib/server/backend-config";
import { getHistoryEndpoint, logHistoryResponseDiagnostic } from "@/lib/server/history-response-diagnostics";

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);
const REQUEST_HEADERS_TO_FORWARD = ["accept", "content-type", "if-none-match", "range"] as const;
// `fetch` may decode an upstream compressed representation. Its original
// Content-Length would then describe different bytes, so never relay it with the
// decoded stream sent by this BFF.
const RESPONSE_HEADERS_TO_FORWARD = [
  "accept-ranges",
  "cache-control",
  "content-disposition",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
] as const;

interface ProxyBackendRequestOptions {
  historyEndpoint?: ReturnType<typeof getHistoryEndpoint>;
  redirect?: "follow" | "manual";
}

function createForwardedHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  for (const headerName of REQUEST_HEADERS_TO_FORWARD) {
    const headerValue = request.headers.get(headerName);

    if (headerValue) {
      headers.set(headerName, headerValue);
    }
  }

  return headers;
}

function createBackendHeaders(request: NextRequest, apiKeyId: string, token: string | null): Headers {
  const headers = createForwardedHeaders(request);
  headers.set(BACKEND_API_KEY_HEADER, apiKeyId);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

function createProxyError(message: string): NextResponse {
  return NextResponse.json(
    {
      statusCode: 502,
      message,
      response: null,
    },
    {
      status: 502,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function proxyUpstreamRequest(
  request: NextRequest,
  targetUrl: URL,
  headers: Headers,
  options: ProxyBackendRequestOptions = {},
): Promise<NextResponse> {
  const { historyEndpoint = null, redirect = "manual" } = options;
  const requestInit: RequestInit = {
    cache: "no-store",
    headers,
    method: request.method,
    redirect,
  };

  if (!BODYLESS_METHODS.has(request.method)) {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) {
      requestInit.body = body;
    }
  }

  const upstreamResponse = await fetch(targetUrl, requestInit);
  await logHistoryResponseDiagnostic(historyEndpoint, upstreamResponse);

  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
  });

  for (const headerName of RESPONSE_HEADERS_TO_FORWARD) {
    const headerValue = upstreamResponse.headers.get(headerName);
    if (headerValue) {
      responseHeaders.set(headerName, headerValue);
    }
  }

  return new NextResponse(upstreamResponse.body, {
    headers: responseHeaders,
    status: upstreamResponse.status,
  });
}

export async function proxyBackendRequest(
  request: NextRequest,
  pathSegments: readonly string[],
  token: string | null,
  options: ProxyBackendRequestOptions = {},
): Promise<NextResponse> {
  try {
    const backendConfig = getBackendConfig();
    const targetUrl = createBackendUrl(backendConfig, pathSegments, request.nextUrl.search);
    return await proxyUpstreamRequest(request, targetUrl, createBackendHeaders(request, backendConfig.apiKeyId, token), {
      ...options,
      historyEndpoint: getHistoryEndpoint(pathSegments),
    });
  } catch (error) {
    if (error instanceof BackendConfigurationError) {
      return createProxyError("The Dashboard API proxy is not configured on the server.");
    }

    return createProxyError("The Dashboard API could not be reached.");
  }
}

/**
 * The old dashboard resolves IMG and LOGOIMG paths against dashboardv2.e-city.co,
 * not apidashboardv2.e-city.co. Those static files are intentionally public and
 * receive no API key or user session from this proxy.
 */
export async function proxyLegacyStaticFile(request: NextRequest, pathSegments: readonly string[]): Promise<NextResponse> {
  try {
    const staticFilesConfig = getStaticFilesConfig();
    const targetUrl = createStaticFilesUrl(staticFilesConfig, pathSegments, "");
    return await proxyUpstreamRequest(request, targetUrl, createForwardedHeaders(request), { redirect: "follow" });
  } catch (error) {
    if (error instanceof BackendConfigurationError) {
      return createProxyError("The Dashboard static-file proxy is not configured on the server.");
    }

    return createProxyError("The Dashboard static files could not be reached.");
  }
}
