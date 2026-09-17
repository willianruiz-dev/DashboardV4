"use client";

import { jamScanResponseSchema, type JamScanRequest } from "@/features/dispensing-control/schemas";
import { requestApi } from "@/lib/api/client";

export const dispensingQueryKeys = {
  all: ["dispensing"] as const,
  jamScan: (request: JamScanRequest) => ["dispensing", "jams", request] as const,
  jamScanNone: () => ["dispensing", "jams", "none"] as const,
};

/**
 * Análisis acotado de detalles por transacción para atribuir atascos por
 * denominación. Es una acción explícita (no se dispara sola) porque implica
 * una petición por transacción contra el API legado; el BFF acota la ventana,
 * limita la concurrencia y cachea detalles inmutables.
 */
export function analyzeDispensingJams(payload: JamScanRequest) {
  return requestApi("/api/dispensing/jams", jamScanResponseSchema, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}
