import { z } from "zod";

export const dispensingTimePresetSchema = z.enum(["hoy", "24h", "7d", "rango"]);
export type DispensingTimePreset = z.infer<typeof dispensingTimePresetSchema>;

export const dispensingPresetLabels: Record<DispensingTimePreset, string> = {
  hoy: "Hoy",
  rango: "Rango",
  "24h": "Últimas 24 h",
  "7d": "Últimos 7 días",
};

/** Rango como valores de `datetime-local` (precisión de minuto, zona local). */
export interface DispensingRange {
  from: string;
  to: string;
}

/** Umbral máximo del rango personalizado: evita respuestas pesadas del API por máquina. */
export const MAX_CUSTOM_RANGE_DAYS = 31;
