import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { userChangePasswordRequestSchema } from "@/features/users/schemas";
import { requestBackend } from "@/lib/server/backend-client";
import { encryptLegacyPassword } from "@/lib/server/password-encryption";
import { requireDashboardToken } from "@/lib/server/require-dashboard-token";
import { createApiRouteError } from "@/lib/server/route-error";
import { httpEnvelopeSchema } from "@/schemas/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json().catch(() => undefined);
    const passwordChange = userChangePasswordRequestSchema.parse(body);
    const token = await requireDashboardToken();

    await requestBackend(["api", "User", "ChangePwd"], httpEnvelopeSchema(z.unknown()), {
      body: JSON.stringify({
        document: passwordChange.document,
        newPwd: encryptLegacyPassword(passwordChange.newPwd),
        oldPwd: encryptLegacyPassword(passwordChange.oldPwd),
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
      token,
    });

    return NextResponse.json(
      { message: "Contraseña actualizada con éxito." },
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
