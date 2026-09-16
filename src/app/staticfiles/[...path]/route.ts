import { NextRequest, NextResponse } from "next/server";

import { getDashboardToken } from "@/lib/auth/session";
import { proxyBackendRequest } from "@/lib/server/backend-proxy";
import { createApiRouteError } from "@/lib/server/route-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StaticFileRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

function decodePathSegment(segment: string): string {
  let decodedSegment = segment;

  // Reject traversal or path separators even if a client encoded them more than once.
  for (let index = 0; index < 4; index += 1) {
    try {
      const nextSegment = decodeURIComponent(decodedSegment);
      if (nextSegment === decodedSegment) {
        break;
      }
      decodedSegment = nextSegment;
    } catch {
      break;
    }
  }

  return decodedSegment;
}

function hasUnsafePathSegment(path: readonly string[]): boolean {
  return path.some((segment) => {
    const decodedSegment = decodePathSegment(segment);
    return decodedSegment.length === 0 || decodedSegment === "." || decodedSegment === ".." || decodedSegment.includes("/") || decodedSegment.includes("\\");
  });
}

async function proxyStaticFile(request: NextRequest, context: StaticFileRouteContext): Promise<NextResponse> {
  try {
    const { path } = await context.params;

    if (hasUnsafePathSegment(path)) {
      return NextResponse.json({ message: "La ruta del archivo no es válida.", response: null, statusCode: 400 }, { status: 400 });
    }

    // The production static endpoint is guarded by the same DashboardKeyId middleware as
    // the API. The legacy browser could rely on its co-hosted deployment, while this local
    // Next app must attach the key and session server-side without exposing either to <img>.
    const token = await getDashboardToken();
    // Follow an upstream static redirect server-side. A legacy <img> follows it in the
    // browser; doing it here preserves that behavior without exposing the target URL.
    return proxyBackendRequest(request, ["staticfiles", ...path], token, { redirect: "follow" });
  } catch (error) {
    return createApiRouteError(error);
  }
}

export {
  proxyStaticFile as GET,
  proxyStaticFile as HEAD,
};
