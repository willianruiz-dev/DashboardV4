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

    // The legacy browser fetched static assets without an Authorization header. Preserve
    // that exact request first. Some production gateways can require dashboard credentials,
    // so retry only 401/403 responses with the server-side session as a compatibility path.
    const publicResponse = await proxyBackendRequest(request, ["staticfiles", ...path], null, {
      forwardDashboardCredentials: false,
    });

    if (publicResponse.status !== 401 && publicResponse.status !== 403) {
      return publicResponse;
    }

    const token = await getDashboardToken();
    if (!token) {
      return publicResponse;
    }

    await publicResponse.body?.cancel();
    return proxyBackendRequest(request, ["staticfiles", ...path], token);
  } catch (error) {
    return createApiRouteError(error);
  }
}

export {
  proxyStaticFile as GET,
  proxyStaticFile as HEAD,
};
