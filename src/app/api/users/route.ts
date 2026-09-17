import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { userCreateRequestSchema } from "@/features/users/schemas";
import { requestBackend } from "@/lib/server/backend-client";
import { encryptLegacyPassword } from "@/lib/server/password-encryption";
import { requireDashboardToken } from "@/lib/server/require-dashboard-token";
import { createApiRouteError } from "@/lib/server/route-error";
import { httpEnvelopeSchema } from "@/schemas/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json().catch(() => undefined);
    const newUser = userCreateRequestSchema.parse(body);
    const token = await requireDashboardToken();
    const encryptedPassword = encryptLegacyPassword(newUser.pwd);

    await requestBackend(["api", "User"], httpEnvelopeSchema(z.unknown()), {
      body: JSON.stringify({
        ...newUser,
        pwd: encryptedPassword,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      token,
    });

    return NextResponse.json(
      { message: "Usuario creado con éxito." },
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
