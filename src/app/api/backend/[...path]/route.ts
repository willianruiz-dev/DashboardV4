import { NextRequest, NextResponse } from "next/server";

import { getDashboardToken } from "@/lib/auth/session";
import { proxyBackendRequest } from "@/lib/server/backend-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BackendRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

function isAuthenticationPath(path: readonly string[]): boolean {
  return path[0]?.toLowerCase() === "auth";
}

function isUnsafeMethod(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method);
}

function firstForwardedValue(value: string | null): string | null {
  const firstValue = value?.split(",", 1)[0]?.trim();
  return firstValue || null;
}

function toOrigin(protocol: string, host: string): string | null {
  try {
    const url = new URL(`${protocol}://${host}`);

    if (
      (url.protocol !== "http:" && url.protocol !== "https:")
      || url.username
      || url.password
      || url.pathname !== "/"
      || url.search
      || url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

/**
 * `nextUrl.origin` can describe the listener (`0.0.0.0`) instead of the public
 * browser origin when Next runs behind the local/preview reverse proxy. Include
 * the request host and the proxy's public host so valid same-origin POSTs keep
 * their CSRF check without treating the listener address as the only origin.
 */
function getRequestOrigins(request: NextRequest): Set<string> {
  const origins = new Set<string>([request.nextUrl.origin]);
  const host = request.headers.get("host");
  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const forwardedProtocol = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : request.nextUrl.protocol.replace(":", "");

  for (const candidateHost of [host, forwardedHost]) {
    if (!candidateHost) {
      continue;
    }

    const origin = toOrigin(protocol, candidateHost);
    if (origin) {
      origins.add(origin);
    }
  }

  return origins;
}

function isSameOriginRequest(request: NextRequest): boolean {
  const originHeader = request.headers.get("origin");

  if (originHeader === null) {
    return true;
  }

  try {
    return getRequestOrigins(request).has(new URL(originHeader).origin);
  } catch {
    return false;
  }
}

async function proxy(request: NextRequest, context: BackendRouteContext): Promise<NextResponse> {
  const { path } = await context.params;

  if (isAuthenticationPath(path)) {
    return NextResponse.json(
      {
        message: "Usa las rutas de autenticación dedicadas.",
        statusCode: 404,
      },
      { status: 404 },
    );
  }

  if (isUnsafeMethod(request.method) && !isSameOriginRequest(request)) {
    return NextResponse.json(
      {
        message: "La solicitud no proviene del origen permitido.",
        statusCode: 403,
      },
      { status: 403 },
    );
  }

  const token = await getDashboardToken();
  if (!token) {
    return NextResponse.json(
      {
        message: "La sesión no está disponible.",
        statusCode: 401,
      },
      { status: 401 },
    );
  }

  return proxyBackendRequest(request, path, token);
}

async function options(): Promise<NextResponse> {
  return new NextResponse(null, {
    headers: {
      Allow: "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
      "Cache-Control": "no-store",
    },
    status: 204,
  });
}

export {
  proxy as DELETE,
  proxy as GET,
  proxy as HEAD,
  options as OPTIONS,
  proxy as PATCH,
  proxy as POST,
  proxy as PUT,
};
