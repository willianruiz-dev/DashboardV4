import { NextRequest, NextResponse } from "next/server";

import { proxyLegacyStaticFile } from "@/lib/server/backend-proxy";
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

    // IMG, LOGOIMG and IMG_DENOM store `/images/...`. The legacy dashboard resolves
    // `/staticfiles${path}` against dashboardv2.e-city.co, where the real file store
    // is mounted. Keep that origin server-side and return only same-origin bytes.
    return proxyLegacyStaticFile(request, ["staticfiles", ...path]);
  } catch (error) {
    return createApiRouteError(error);
  }
}

export {
  proxyStaticFile as GET,
  proxyStaticFile as HEAD,
};
