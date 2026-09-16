import { NextRequest, NextResponse } from "next/server";

import { proxyBackendRequest } from "@/lib/server/backend-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BackendRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function proxy(request: NextRequest, context: BackendRouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyBackendRequest(request, path);
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
