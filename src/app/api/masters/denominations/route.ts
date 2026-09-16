import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { denominationServerMutationSchema } from "@/features/denominations/schemas";
import { requestBackend } from "@/lib/server/backend-client";
import { requireDashboardToken } from "@/lib/server/require-dashboard-token";
import { createApiRouteError } from "@/lib/server/route-error";
import { httpEnvelopeSchema } from "@/schemas/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const integerSchema = z.number().int().nonnegative().safe();

async function saveDenomination(request: NextRequest, method: "POST" | "PUT"): Promise<NextResponse> {
  try {
    const body: unknown = await request.json().catch(() => undefined);
    const denomination = denominationServerMutationSchema.parse(body);
    const token = await requireDashboardToken();

    await requestBackend(["api", "Masters", "CurrencyDenomination"], httpEnvelopeSchema(z.unknown()), {
      body: JSON.stringify({
        ...denomination,
        value: integerSchema.parse(Number(denomination.value)),
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method,
      token,
    });

    return NextResponse.json(
      { message: "Denominación guardada con éxito." },
      {
        headers: { "Cache-Control": "no-store" },
        status: 200,
      },
    );
  } catch (error) {
    return createApiRouteError(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return saveDenomination(request, "POST");
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  return saveDenomination(request, "PUT");
}
