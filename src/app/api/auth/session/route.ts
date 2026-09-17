import { NextResponse } from "next/server";

import { clearDashboardSession, getDashboardSession } from "@/lib/auth/session";
import { createApiRouteError } from "@/lib/server/route-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  try {
    const dashboardSession = await getDashboardSession();

    if (!dashboardSession) {
      await clearDashboardSession();
      return NextResponse.json(
        {
          message: "La sesión no está disponible.",
          statusCode: 401,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
          status: 401,
        },
      );
    }

    return NextResponse.json(dashboardSession, {
      headers: {
        "Cache-Control": "no-store",
      },
      status: 200,
    });
  } catch (error) {
    return createApiRouteError(error);
  }
}
