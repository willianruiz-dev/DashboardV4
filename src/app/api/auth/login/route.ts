import { NextRequest, NextResponse } from "next/server";

import { loginRequestSchema, loginResponseSchema } from "@/features/auth/schemas";
import { setDashboardSession } from "@/lib/auth/session";
import { encryptLegacyPassword } from "@/lib/server/password-encryption";
import { createApiRouteError } from "@/lib/server/route-error";
import { requestBackend } from "@/lib/server/backend-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    const loginRequest = loginRequestSchema.parse(body);
    const encryptedPassword = encryptLegacyPassword(loginRequest.password);
    const loginResponse = await requestBackend(["Auth", "Login"], loginResponseSchema, {
      body: JSON.stringify({
        password: encryptedPassword,
        userName: loginRequest.userName,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    await setDashboardSession(loginResponse.response);

    return NextResponse.json(
      {
        message: loginResponse.message ?? "Se inició sesión correctamente.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
        status: 200,
      },
    );
  } catch (error) {
    return createApiRouteError(error);
  }
}
