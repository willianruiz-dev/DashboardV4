import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { paypadStorageMutationSchema } from "@/features/paypads/schemas";
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
    const storages = z.array(paypadStorageMutationSchema).parse(body);
    const token = await requireDashboardToken();

    await requestBackend(["api", "PayPad", "CreateStorage"], httpEnvelopeSchema(z.unknown()), {
      body: JSON.stringify(
        storages.map((storage) => ({
          ...storage,
          minDpQuantity: integerSchema.parse(Number(storage.minDpQuantity)),
        })),
      ),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      token,
    });

    return NextResponse.json(
      { message: "Configuración de almacenamiento actualizada." },
      {
        headers: { "Cache-Control": "no-store" },
        status: 200,
      },
    );
  } catch (error) {
    return createApiRouteError(error);
  }
}
