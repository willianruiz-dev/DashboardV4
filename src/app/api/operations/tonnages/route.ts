import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { tonnageMutationSchema } from "@/features/paypads/schemas";
import { requestBackend } from "@/lib/server/backend-client";
import { requireDashboardToken } from "@/lib/server/require-dashboard-token";
import { createApiRouteError } from "@/lib/server/route-error";
import { httpEnvelopeSchema } from "@/schemas/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json().catch(() => undefined);
    const tonnage = tonnageMutationSchema.parse(body);
    const token = await requireDashboardToken();

    // SP_CreateTonnage derives totals and denomination detail from server-side Pay+ storage.
    await requestBackend(["api", "Tonnage"], httpEnvelopeSchema(z.unknown()), {
      body: JSON.stringify(tonnage),
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
