import { NextResponse } from "next/server";

import { logoutResponseSchema } from "@/features/auth/schemas";
import { clearDashboardSession, getDashboardToken } from "@/lib/auth/session";
import { BackendApiError, requestBackend } from "@/lib/server/backend-client";
import { createApiRouteError } from "@/lib/server/route-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  const token = await getDashboardToken();

  try {
    if (token) {
      await requestBackend(["Auth", "Logout"], logoutResponseSchema, {
        method: "GET",
        token,
      });
    }
  } catch (error) {
    if (!(error instanceof BackendApiError && (error.status === 401 || error.status === 403))) {
      return createApiRouteError(error);
    }
  } finally {
    await clearDashboardSession();
  }

  return NextResponse.json(
    {
      message: "La sesión se cerró correctamente.",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 200,
    },
  );
}
