import { NextRequest, NextResponse } from "next/server";

import { proxyBackendRequest } from "@/lib/server/backend-proxy";
import { requireDashboardToken } from "@/lib/server/require-dashboard-token";
import { createApiRouteError } from "@/lib/server/route-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StaticFileRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

function hasUnsafePathSegment(path: readonly string[]): boolean {
  return path.some((segment) => segment.length === 0 || segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\"));
}

async function proxyStaticFile(request: NextRequest, context: StaticFileRouteContext): Promise<NextResponse> {
  try {
    const { path } = await context.params;

    if (hasUnsafePathSegment(path)) {
      return NextResponse.json({ message: "La ruta del archivo no es válida.", response: null, statusCode: 400 }, { status: 400 });
    }

    const token = await requireDashboardToken();
    return proxyBackendRequest(request, ["staticfiles", ...path], token);
  } catch (error) {
    return createApiRouteError(error);
  }
}

export {
  proxyStaticFile as GET,
  proxyStaticFile as HEAD,
};
