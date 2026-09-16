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

function shouldTryDirectImagePath(response: NextResponse, path: readonly string[]): boolean {
  if (path[0]?.toLocaleLowerCase("en-US") !== "images") {
    return false;
  }

  if (!response.ok) {
    return true;
  }

  const contentType = response.headers.get("content-type")?.toLocaleLowerCase("en-US");
  return contentType?.includes("json") === true || contentType?.includes("html") === true;
}

function discardResponseBody(response: NextResponse): void {
  // Do not await cancellation: a streamed route response can wait for the browser to
  // consume it, which would delay the direct-path compatibility request indefinitely.
  void response.body?.cancel().catch(() => undefined);
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
    const staticfilesResponse = await proxyBackendRequest(request, ["staticfiles", ...path], token, { redirect: "follow" });
    if (!shouldTryDirectImagePath(staticfilesResponse, path)) {
      return staticfilesResponse;
    }

    // Some historical IIS deployments mount the same database path directly at
    // `/images/...` rather than the `/staticfiles/images/...` virtual directory.
    // Try that server-side compatibility location only after the canonical contract
    // failed or returned an error document; neither URL nor credentials reach <img>.
    discardResponseBody(staticfilesResponse);
    return proxyBackendRequest(request, path, token, { redirect: "follow" });
  } catch (error) {
    return createApiRouteError(error);
  }
}

export {
  proxyStaticFile as GET,
  proxyStaticFile as HEAD,
};
