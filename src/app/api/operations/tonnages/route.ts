import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { tonnageMutationSchema } from "@/features/paypads/schemas";
import { requestBackend } from "@/lib/server/backend-client";
import { requireDashboardToken } from "@/lib/server/require-dashboard-token";
import { createApiRouteError } from "@/lib/server/route-error";
import { httpEnvelopeSchema } from "@/schemas/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const finiteNumberSchema = z.number().finite();

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json().catch(() => undefined);
    const tonnage = tonnageMutationSchema.parse(body);
    const token = await requireDashboardToken();

    // The stored procedure derives its own snapshot too, while the legacy browser sends
    // these totals with the request. Keep that established payload shape.
    await requestBackend(["api", "Tonnage"], httpEnvelopeSchema(z.unknown()), {
      body: JSON.stringify({
        idPayPad: tonnage.idPayPad,
        total: finiteNumberSchema.parse(Number(tonnage.total)),
        totalAp: finiteNumberSchema.parse(Number(tonnage.totalAp)),
        totalDp: finiteNumberSchema.parse(Number(tonnage.totalDp)),
        totalRj: finiteNumberSchema.parse(Number(tonnage.totalRj)),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      token,
    });

    return NextResponse.json(
      { message: "Arqueo registrado con éxito." },
      {
        headers: { "Cache-Control": "no-store" },
        status: 200,
      },
    );
  } catch (error) {
    return createApiRouteError(error);
  }
}
