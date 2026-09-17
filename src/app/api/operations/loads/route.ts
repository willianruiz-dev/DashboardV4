import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { loadMutationSchema } from "@/features/paypads/schemas";
import { requestBackend } from "@/lib/server/backend-client";
import { requireDashboardToken } from "@/lib/server/require-dashboard-token";
import { createApiRouteError } from "@/lib/server/route-error";
import { httpEnvelopeSchema } from "@/schemas/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const integerSchema = z.number().int().nonnegative().safe();

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json().catch(() => undefined);
    const load = loadMutationSchema.parse(body);
    const token = await requireDashboardToken();

    await requestBackend(["api", "Load"], httpEnvelopeSchema(z.unknown()), {
      body: JSON.stringify({
        details: load.details.map((detail) => ({
          denominationValue: integerSchema.parse(Number(detail.denominationValue)),
          idCurrencyDenomination: detail.idCurrencyDenomination,
          quantity: integerSchema.parse(Number(detail.quantity)),
        })),
        idPayPad: load.idPayPad,
        totalLoaded: integerSchema.parse(Number(load.totalLoaded)),
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      token,
    });

    return NextResponse.json(
      { message: "Cargue registrado con éxito." },
      {
        headers: { "Cache-Control": "no-store" },
        status: 200,
      },
    );
  } catch (error) {
    return createApiRouteError(error);
  }
}
