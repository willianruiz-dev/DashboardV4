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

/**
 * Detección de atascos: el navegador pide al BFF un análisis acotado de detalles
 * por transacción (`Transaction/{id}/Details`) dentro del período elegido.
 * El tope existe porque el API legado no pagina y cada detalle es una petición:
 * la ventana se limita a las transacciones más relevantes (error devuelta primero)
 * y el resultado indica si quedó truncado.
 */
export const JAM_SCAN_MAX_TRANSACTIONS = 60;

export const jamScanRequestSchema = z.object({
  from: z.string().datetime({ offset: true }),
  maxTransactions: z.number().int().min(5).max(100).default(JAM_SCAN_MAX_TRANSACTIONS),
  paypadId: z.number().int().positive(),
  to: z.string().datetime({ offset: true }),
});
export type JamScanRequest = z.infer<typeof jamScanRequestSchema>;

/**
 * Cantidad de detalle con signo: la evidencia autenticada de Prueba1 mostró
 * cantidades negativas en detalles históricos que el dashboard legado muestra.
 */
const jamSignedQuantitySchema = z
  .union([z.number().int(), z.string().trim().regex(/^-?\d+$/)])
  .transform((value) => String(value));

export const jamScanDetailSchema = z.object({
  denominationId: z.number().int().positive().nullable(),
  operation: z.string().nullable(),
  operationId: z.number().int().nullable(),
  quantity: jamSignedQuantitySchema,
});

export const jamScanTransactionSchema = z.object({
  dateCreated: z.string().nullable(),
  details: z.array(jamScanDetailSchema),
  id: z.number().int().positive(),
  incomeAmount: z.string(),
  realAmount: z.string(),
  returnAmount: z.string(),
  stateTransaction: z.string().nullable().transform((value) => value ?? ""),
  totalAmount: z.string(),
});

export const jamScanResponseSchema = z.object({
  detailsFailures: z.number().int().nonnegative(),
  /** Detalles recibidos con forma inesperada (se normalizaron, no se descartaron). */
  detailsMalformed: z.number().int().nonnegative().default(0),
  detailsRequests: z.number().int().nonnegative(),
  /** Motivos sanitizados de los fallos, para diagnosticar sin acceso al servidor. */
  failureReasons: z.array(z.string()).default([]),
  generatedAt: z.string(),
  maxTransactions: z.number().int().positive(),
  scannedFrom: z.string().nullable(),
  scannedTo: z.string().nullable(),
  /** Transacciones ordenadas de más reciente a más antigua. */
  transactions: z.array(jamScanTransactionSchema),
  truncated: z.boolean(),
});
export type JamScanResponse = z.infer<typeof jamScanResponseSchema>;
