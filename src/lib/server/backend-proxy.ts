import "server-only";

import { NextRequest, NextResponse } from "next/server";

import {
  BACKEND_API_KEY_HEADER,
  BackendConfigurationError,
  createBackendUrl,
  getBackendConfig,
} from "@/lib/server/backend-config";

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);
const REQUEST_HEADERS_TO_FORWARD = ["accept", "content-type", "if-none-match", "range"] as const;
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
  forwardDashboardCredentials?: boolean;
}

function createUpstreamHeaders(
  request: NextRequest,
  apiKeyId: string,
  token: string | null,
  forwardDashboardCredentials: boolean,
): Headers {
  const headers = new Headers();

  if (forwardDashboardCredentials) {
    headers.set(BACKEND_API_KEY_HEADER, apiKeyId);
  }

  for (const headerName of REQUEST_HEADERS_TO_FORWARD) {
    const headerValue = request.headers.get(headerName);

    if (headerValue) {
      headers.set(headerName, headerValue);
    }
  }

  if (forwardDashboardCredentials && token) {
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

export async function proxyBackendRequest(
  request: NextRequest,
  pathSegments: readonly string[],
  token: string | null,
  { forwardDashboardCredentials = true }: ProxyBackendRequestOptions = {},
): Promise<NextResponse> {
  try {
    const backendConfig = getBackendConfig();
    const targetUrl = createBackendUrl(backendConfig, pathSegments, request.nextUrl.search);
    const requestInit: RequestInit = {
      cache: "no-store",
      headers: createUpstreamHeaders(request, backendConfig.apiKeyId, token, forwardDashboardCredentials),
      method: request.method,
      redirect: "manual",
    };

    if (!BODYLESS_METHODS.has(request.method)) {
      const body = await request.arrayBuffer();
      if (body.byteLength > 0) {
        requestInit.body = body;
      }
    }

    const upstreamResponse = await fetch(targetUrl, requestInit);
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
  } catch (error) {
    if (error instanceof BackendConfigurationError) {
      return createProxyError("The Dashboard API proxy is not configured on the server.");
    }

    return createProxyError("The Dashboard API could not be reached.");
  }
}
