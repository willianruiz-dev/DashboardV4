import { z } from "zod";

export const dispensingTimePresetSchema = z.enum(["hoy", "24h", "7d", "desde-cargue", "rango"]);
export type DispensingTimePreset = z.infer<typeof dispensingTimePresetSchema>;

export const dispensingPresetLabels: Record<DispensingTimePreset, string> = {
  hoy: "Hoy",
  rango: "Rango",
  "24h": "Últimas 24 h",
  "7d": "Últimos 7 días",
  "desde-cargue": "Desde último cargue",
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
export const JAM_SCAN_MAX_TRANSACTIONS = 40;

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

/**
 * Alimentación de la alerta del inicio: transacciones `Aprobada Error Devuelta`
 * del día actual, por máquina. El sondeo lo hace el navegador (no existe contrato
 * realtime en el backend legado); el BFF acota la carga con caché corta y
 * concurrencia limitada.
 */
export const returnAlertsRequestSchema = z.object({
  from: z.string().datetime({ offset: true }),
  /** `null` = todas las máquinas. */
  paypadId: z.number().int().positive().nullable().default(null),
  to: z.string().datetime({ offset: true }),
});
export type ReturnAlertsRequest = z.infer<typeof returnAlertsRequestSchema>;

/**
 * Semáforo de «posible atasco» del inicio (ver `jam-early-warning.ts`): módulos con saldo que
 * no bajaron en el arqueo mientras el cambio salió por otras denominaciones. Es alerta
 * temprana — la confirmación por denominación la da el análisis completo con detalle.
 */
export const jamEarlyWarningSchema = z.object({
  /** Módulos que sí bajaron en el arqueo: por ahí está saliendo el cambio. */
  compensators: z
    .array(z.object({ denominationValue: z.string(), movement: z.number().int() }))
    .default([]),
  /** `null` = no se consultó el baúl (sólo se consulta cuando ya hay sospecha). */
  configuredForDispensing: z.boolean().nullable().default(null),
  demand: z.number().int().nonnegative(),
  denominationValue: z.string(),
  movement: z.number().int(),
  stock: z.number().int().nonnegative(),
});
export type JamEarlyWarningPayload = z.infer<typeof jamEarlyWarningSchema>;

export const jamEarlyWarningScreenSchema = z.object({
  arqueoFrom: z.string().nullable().default(null),
  arqueoTo: z.string().nullable().default(null),
  /** Motivo por el que el semáforo no aplica (sin arqueos, pocos pagos, multimoneda…). */
  note: z.string().nullable().default(null),
  payouts: z.number().int().nonnegative().default(0),
  warnings: z.array(jamEarlyWarningSchema).default([]),
});
export type JamEarlyWarningScreenPayload = z.infer<typeof jamEarlyWarningScreenSchema>;

export const returnAlertMachineSchema = z.object({
  approvedCount: z.number().int().nonnegative(),
  /** Monedas que la máquina trabaja hoy, según su baúl (p. ej. `["COP","USD"]`). */
  currencyLabels: z.array(z.string()).default([]),
  errorCount: z.number().int().nonnegative(),
  errorTotal: z.string(),
  /** `true` si algún importe del día no se pudo interpretar y el total queda corto. */
  errorTotalIncomplete: z.boolean().default(false),
  /**
   * `true` si la máquina opera más de una moneda: `errorTotal` suma monedas distintas y no
   * es comparable, así que la interfaz muestra «varias monedas» en lugar de un número.
   */
  errorTotalMixedCurrency: z.boolean().default(false),
  /**
   * Semáforo de posible atasco del día (una petición de arqueo por máquina con pagos, cacheada
   * 60 s). `null` = no se pudo evaluar en esta vuelta; `warnings` vacío = sin sospecha.
   */
  jamScreen: jamEarlyWarningScreenSchema.nullable().default(null),
  lastErrorAt: z.string().nullable(),
  paypadId: z.number().int().positive(),
  paypadName: z.string(),
  transactions: z.number().int().nonnegative(),
});
export type ReturnAlertMachine = z.infer<typeof returnAlertMachineSchema>;

export const returnAlertsResponseSchema = z.object({
  from: z.string(),
  generatedAt: z.string(),
  machines: z.array(returnAlertMachineSchema),
  partialFailures: z.number().int().nonnegative(),
  to: z.string(),
});
export type ReturnAlertsResponse = z.infer<typeof returnAlertsResponseSchema>;

/** Cadencia del sondeo de la alerta del inicio (no hay WebSocket: ver B-01). */
export const RETURN_ALERTS_REFRESH_MS = 30_000;
