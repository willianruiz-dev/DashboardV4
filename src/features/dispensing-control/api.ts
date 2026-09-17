"use client";

import {
  jamScanResponseSchema,
  returnAlertsResponseSchema,
  type JamScanRequest,
  type ReturnAlertsRequest,
} from "@/features/dispensing-control/schemas";
import { requestApi } from "@/lib/api/client";

export const dispensingQueryKeys = {
  all: ["dispensing"] as const,
  returnAlerts: (request: ReturnAlertsRequest) => ["dispensing", "return-alerts", request] as const,
  returnAlertsNone: () => ["dispensing", "return-alerts", "none"] as const,
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

/**
 * Errores de devuelta (`Aprobada Error Devuelta`) del rango consultado, por máquina.
 * La página de inicio lo sondea cada `RETURN_ALERTS_REFRESH_MS`.
 */
export function fetchDispensingReturnAlerts(payload: ReturnAlertsRequest) {
  return requestApi("/api/dispensing/return-alerts", returnAlertsResponseSchema, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}
