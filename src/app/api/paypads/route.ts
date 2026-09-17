import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { paypadCreateRequestSchema } from "@/features/paypads/schemas";
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
    const paypad = paypadCreateRequestSchema.parse(body);
    const token = await requireDashboardToken();

    await requestBackend(["api", "PayPad"], httpEnvelopeSchema(z.unknown()), {
      body: JSON.stringify({
        ...paypad,
        pwd: encryptLegacyPassword(paypad.pwd),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      token,
    });

    return NextResponse.json(
      { message: "Pay+ creado con éxito." },
      {
        headers: { "Cache-Control": "no-store" },
        status: 200,
      },
    );
  } catch (error) {
    return createApiRouteError(error);
  }
}
