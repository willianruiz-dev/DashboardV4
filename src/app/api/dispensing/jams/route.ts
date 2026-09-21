import { NextRequest, NextResponse } from "next/server";

import { jamScanRequestSchema } from "@/features/dispensing-control/schemas";
import { fetchJamScan } from "@/lib/server/jam-scan";
import { requireDashboardToken } from "@/lib/server/require-dashboard-token";
import { createApiRouteError } from "@/lib/server/route-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * BFF de detección de atascos.
 *
 * Problema: el API legado no expone ningún evento de atasco ni un endpoint de
 * "detalle por rango de fechas"; el detalle se pide transacción por transacción
 * (`GET Transaction/{id}/Details`). Además, `GetByDate` devuelve el conjunto
 * completo sin paginación.
 *
 * Solución sin tocar el backend .NET:
 *  1. Se reutiliza `Transaction/GetByDate` (mismo DTO legado que el buscador).
 *  2. Se priorizan las transacciones con más valor probatorio: primero las de
 *     estado con error («Aprobada Error Devuelta», «Cancelada Error Devuelta»),
 *     después las aprobadas con devolución (`returnAmount > 0`) y por último las
 *     más recientes, hasta `maxTransactions`.
 *  3. Los detalles se piden con concurrencia acotada y caché en memoria por
 *     `id` de transacción: un detalle es inmutable, así que un análisis repetido
 *     del mismo período no vuelve a golpear el API.
 *
 * El payload devuelve solo lo que el motor de atascos necesita: estado, importes
 * y por denominación la operación y la cantidad. No se expone nada de sesión.
 *
 * La lectura (transacciones + detalles + caché) vive en `@/lib/server/jam-scan`
 * porque el veredicto del inicio corre el mismo motor server-side y comparte esa caché:
 * abrir la máquina en el panel después del inicio no vuelve a pedir los detalles.
 */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json().catch(() => undefined);
    const scanRequest = jamScanRequestSchema.parse(body);
    const token = await requireDashboardToken();
    const response = await fetchJamScan({
      from: scanRequest.from,
      maxTransactions: scanRequest.maxTransactions,
      paypadId: scanRequest.paypadId,
      to: scanRequest.to,
      token,
    });

    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return createApiRouteError(error);
  }
}
