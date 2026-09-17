import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { paypadChangePasswordRequestSchema } from "@/features/paypads/schemas";
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
    const passwords = paypadChangePasswordRequestSchema.parse(body);
    const token = await requireDashboardToken();

    await requestBackend(["api", "PayPad", "ChangePwd"], httpEnvelopeSchema(z.unknown()), {
      body: JSON.stringify({
        document: passwords.document,
        newPwd: encryptLegacyPassword(passwords.newPwd),
        oldPwd: encryptLegacyPassword(passwords.oldPwd),
      }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
      token,
    });

    return NextResponse.json(
      { message: "Contraseña de Pay+ actualizada con éxito." },
      {
        headers: { "Cache-Control": "no-store" },
        status: 200,
      },
    );
  } catch (error) {
    return createApiRouteError(error);
  }
}
