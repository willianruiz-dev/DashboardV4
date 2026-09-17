/**
 * Normalización de la respuesta de `Transaction/{id}/Details`.
 *
 * El DTO legacy `TransactionDetailDto` declara `IdTransaction`,
 * `IdCurrencyDenomination`, `CurrencyDenomination`, `IdTypeOperation` y `Quantity`
 * como enteros y `TypeOperation` como string nullable. El dashboard antiguo consume
 * esos valores tal cual; aquí se NORMALIZAN en lugar de rechazarse, porque una
 * diferencia de forma no puede volver a dejar ciego el diagnóstico de atascos
 * (un `z.string()` sobre `CurrencyDenomination` provocó 30/30 fallos en producción).
 *
 * Reglas: cualquier valor no interpretable se convierte en `null` (o `"0"` en la
 * cantidad) y se cuenta como `malformed`; la petición solo se considera fallida si
 * el HTTP falló.
 */

export interface NormalizedTransactionDetail {
  denominationId: number | null;
  operation: string | null;
  operationId: number | null;
  quantity: string;
}

export interface NormalizedDetails {
  details: NormalizedTransactionDetail[];
  malformed: number;
}

export function normalizeInteger(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  return null;
}

export function normalizeText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Extrae el arreglo de detalles de un envelope `{ response: [...] }`, de un arreglo o de `response: null`. */
export function extractDetailEntries(payload: unknown): readonly unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload === "object" && payload !== null && "response" in payload) {
    const response = (payload as { response?: unknown }).response;
    return Array.isArray(response) ? response : [];
  }

  return [];
}

export function normalizeTransactionDetails(entries: readonly unknown[]): NormalizedDetails {
  let malformed = 0;
  const details: NormalizedTransactionDetail[] = [];

  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) {
      malformed += 1;
      continue;
    }

    const record = entry as Record<string, unknown>;
    const denominationId = normalizeInteger(record.idCurrencyDenomination);
    const operationId = normalizeInteger(record.idTypeOperation);
    const quantity = normalizeInteger(record.quantity);
    const operation = normalizeText(record.typeOperation);
    const validDenomination = denominationId !== null && denominationId > 0;

    if (!validDenomination || quantity === null) {
      malformed += 1;
    }

    details.push({
      denominationId: validDenomination ? denominationId : null,
      operation,
      operationId,
      quantity: String(quantity ?? 0),
    });
  }

  return { details, malformed };
}
