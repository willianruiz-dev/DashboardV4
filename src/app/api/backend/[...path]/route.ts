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

function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === request.nextUrl.origin;
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
