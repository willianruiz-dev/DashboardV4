import type { CurrencyDenomination } from "@/features/denominations/schemas";
import type { PayPadStorage } from "@/features/paypads/schemas";

/**
 * Moneda de cada denominación, leída del catálogo (`/api/masters/denominations`).
 *
 * Motivo: un Pay+ puede operar VARIAS monedas (máquinas de cambio divisa COP ⇄ USD).
 * Sus denominaciones comparten el formato `denominationValue` (1, 5, 100, 1.000…), así
 * que sin moneda el dashboard mezcla pesos y dólares: un pago de USD 100 se podía
 * "planear" canónicamente con 1 × COP 100, y el total del baúl sumaba las dos monedas.
 * La separación SIEMPRE usa `idCurrency` (dato del backend); la etiqueta es presentación.
 */
export interface DenominationCurrencyInfo {
  /** `idCurrency` del catálogo; `null` = el catálogo no declara esta denominación. */
  currencyId: number | null;
  /** Etiqueta para mostrar (código corto cuando el nombre del maestro es inequívoco). */
  label: string | null;
}

const currencyCodePatterns: readonly { code: string; pattern: RegExp }[] = [
  { code: "COP", pattern: /peso|colombian|cop\b/i },
  { code: "USD", pattern: /d[oó]lar|dollar|usd\b|estadounidense/i },
];

/**
 * Código corto para la etiqueta del maestro de monedas («Dólar estadounidense» → «USD»).
 * Es sólo presentación: la lógica nunca compara etiquetas.
 */
export function currencyShortLabel(description: string | null | undefined): string | null {
  const text = description?.trim();
  if (!text) {
    return null;
  }

  if (/^[A-Za-z]{2,4}$/u.test(text)) {
    return text.toUpperCase();
  }

  for (const { code, pattern } of currencyCodePatterns) {
    if (pattern.test(text)) {
      return code;
    }
  }

  return text;
}

/** Texto de moneda para la UI: etiqueta del catálogo o el id declarado por el backend. */
export function denominationCurrencyText(info: DenominationCurrencyInfo | undefined | null): string | null {
  if (!info) {
    return null;
  }

  if (info.label) {
    return info.label;
  }

  return info.currencyId === null ? null : `Moneda ${info.currencyId}`;
}

export interface DenominationCurrencyIndexInput {
  denominations: readonly CurrencyDenomination[];
  machineCurrency?: { id: number; label: string | null } | null;
  storage: readonly Pick<PayPadStorage, "denominationValue" | "idCurrencyDenomination">[];
}

/**
 * Índice `idCurrencyDenomination` → moneda. Si el catálogo no está disponible se asume
 * la moneda de la máquina (única lectura posible sin catálogo) y se declara así.
 */
export function buildDenominationCurrencyIndex(input: DenominationCurrencyIndexInput): Map<number, DenominationCurrencyInfo> {
  const index = new Map<number, DenominationCurrencyInfo>();
  const catalogMissing = input.denominations.length === 0;

  for (const denomination of input.denominations) {
    index.set(denomination.id, {
      currencyId: denomination.idCurrency,
      label: currencyShortLabel(denomination.currency),
    });
  }

  for (const entry of input.storage) {
    if (index.has(entry.idCurrencyDenomination)) {
      continue;
    }

    index.set(
      entry.idCurrencyDenomination,
      catalogMissing
        ? { currencyId: input.machineCurrency?.id ?? null, label: input.machineCurrency?.label ?? null }
        : { currencyId: null, label: null },
    );
  }

  return index;
}

/**
 * Índice `idCurrencyDenomination` → valor canónico. El catálogo manda; el storage cubre
 * las denominaciones que la máquina tiene y el catálogo no declara. Sin esto, un detalle
 * de una denominación ausente del storage valía 0 y los importes no cuadraban.
 */
export function buildDenominationValueIndex(input: DenominationCurrencyIndexInput): Map<number, string> {
  const values = new Map<number, string>();
  for (const entry of input.storage) {
    values.set(entry.idCurrencyDenomination, entry.denominationValue);
  }
  for (const denomination of input.denominations) {
    values.set(denomination.id, denomination.value);
  }

  return values;
}

/** Cuántas monedas distintas hay entre las denominaciones indicadas. */
export function countDistinctCurrencies(
  denominationIds: Iterable<number>,
  currencyIndex: ReadonlyMap<number, DenominationCurrencyInfo>,
): number {
  const keys = new Set<number | null>();
  for (const id of denominationIds) {
    keys.add(currencyIndex.get(id)?.currencyId ?? null);
  }

  return keys.size;
}
