import { currencyShortLabel } from "./denomination-currency";

/**
 * ¿La máquina USA hoy esta denominación? — regla compartida por el desglose de saldos y
 * el motor de atascos, para que ambos paneles nunca se contradigan.
 *
 * Motivo (caso real): el `PayPad/GetStorage` devuelve filas heredadas de denominaciones que
 * la máquina ya no trabaja. En C.C. Centro2 (solo pesos) aparecía un billete de **USD 1**
 * sin configuración, sin saldo y sin cargues, cuyo único rastro era un arqueo viejo con
 * **−6** unidades: el desglose lo mostraba como un baúl más («Entregada (DP) −6») y el motor
 * llegó a declararlo «Posible atasco». El dashboard antiguo tampoco lo muestra: su «Lista de
 * Denominaciones» filtra el catálogo por la moneda del Pay+.
 *
 * Criterio: la denominación pertenece al inventario en uso si hay CUALQUIER señal positiva
 * de que la máquina la trabaja — configuración de dispensado, umbral configurado, saldo
 * (DP/RJ/AP), cargues del período, entregas/rechazos positivos del último arqueo, o entregas
 * o intentos registrados en los detalles del período. Los valores negativos del arqueo
 * (artefactos legacy de cantidades firmadas) **no** cuentan como uso.
 */
export interface DenominationUsageSignals {
  /** Unidades del aceptador que menciona el último arqueo (firmadas). */
  acceptedLastArqueo: number | null;
  /** Saldo actual del aceptador (`apStored`). */
  acceptedStock: number;
  /** `isDispensing` de Pay+ → Configurar denominaciones. */
  configured: boolean;
  /** El período analizado la muestra entregando (detalles). */
  deliveredInPeriod: boolean;
  /** Unidades entregadas que menciona el último arqueo (firmadas, `quantityDp`). */
  deliveredLastArqueo: number | null;
  /** Saldo actual del baúl dispensador (`dpStored`). */
  dispensingStock: number;
  /** El período analizado la muestra con intentos fallidos (detalles). */
  failedInPeriod: boolean;
  /** Unidades cargadas en el período/ventana analizada. */
  loadedInPeriod: number;
  /** Umbral mínimo configurado (`minDpQuantity`). */
  minDpQuantity: number;
  /** Unidades rechazadas que menciona el último arqueo (firmadas, `quantityRj`). */
  rejectedLastArqueo: number | null;
  /** Saldo actual del baúl de rechazo (`rjStored`). */
  rejectionStock: number;
}

export function isDenominationInUse(signals: DenominationUsageSignals): boolean {
  return (
    signals.configured ||
    signals.minDpQuantity > 0 ||
    signals.dispensingStock > 0 ||
    signals.rejectionStock > 0 ||
    signals.acceptedStock > 0 ||
    signals.loadedInPeriod > 0 ||
    (signals.deliveredLastArqueo ?? 0) > 0 ||
    (signals.rejectedLastArqueo ?? 0) > 0 ||
    (signals.acceptedLastArqueo ?? 0) > 0 ||
    signals.deliveredInPeriod ||
    signals.failedInPeriod
  );
}

/** Motivo canónico de la exclusión (cada panel añade su contexto). */
export const DENOMINATION_NOT_IN_USE_REASON =
  "Sin dispensación configurada, sin saldo (DP/RJ/AP), sin cargues en el período y sin entregas positivas en el último arqueo ni en el período consultado.";

/**
 * Señales positivas de uso, en texto, para poder explicar cada fila en uso (tooltip del
 * panel). Si esta lista está vacía, la denominación está fuera del inventario en uso y su
 * lugar es la lista de excluidas.
 */
export function describeDenominationUsage(signals: DenominationUsageSignals): string[] {
  const reasons: string[] = [];
  if (signals.configured) {
    reasons.push("dispensación configurada");
  }
  if (signals.minDpQuantity > 0) {
    reasons.push(`umbral mínimo configurado (${signals.minDpQuantity})`);
  }
  if (signals.dispensingStock > 0) {
    reasons.push(`${signals.dispensingStock} unidad(es) en el baúl dispensador`);
  }
  if (signals.rejectionStock > 0) {
    reasons.push(`${signals.rejectionStock} unidad(es) en el baúl de rechazo`);
  }
  if (signals.acceptedStock > 0) {
    reasons.push(`${signals.acceptedStock} unidad(es) en el aceptador`);
  }
  if (signals.loadedInPeriod > 0) {
    reasons.push(`${signals.loadedInPeriod} unidad(es) cargadas en el período`);
  }
  if ((signals.deliveredLastArqueo ?? 0) > 0) {
    reasons.push(`${signals.deliveredLastArqueo} entregada(s) en el último arqueo`);
  }
  if ((signals.rejectedLastArqueo ?? 0) > 0) {
    reasons.push(`${signals.rejectedLastArqueo} rechazada(s) en el último arqueo`);
  }
  if ((signals.acceptedLastArqueo ?? 0) > 0) {
    reasons.push(`${signals.acceptedLastArqueo} aceptada(s) en el último arqueo`);
  }
  if (signals.deliveredInPeriod) {
    reasons.push("entregas registradas en el período");
  }
  if (signals.failedInPeriod) {
    reasons.push("intentos fallidos registrados en el período");
  }

  return reasons;
}

interface MachineCurrencyCatalogEntry {
  currency: string | null | undefined;
  id: number;
  idCurrency: number;
}

interface MachineCurrencyStorageEntry {
  apStored: string;
  dpStored: string;
  idCurrencyDenomination: number;
  isDispensing: boolean;
  minDpQuantity: string;
  rjStored: string;
}

/**
 * Monedas que la máquina trabaja hoy, según su baúl (`PayPad/GetStorage`) y el catálogo.
 *
 * Se usa donde NO hay arqueos ni cargues a mano (p. ej. la alerta del inicio) para saber si
 * un importe agregado suma monedas distintas. Sólo cuentan los baúles con alguna señal de
 * uso (configurados, con saldo o con umbral): una fila heredada —el billete de USD 1 de
 * C.C. Centro2, sin configuración y con todo en cero— no convierte a la máquina en
 * multimoneda. Una moneda no declarada en el catálogo cae a `fallbackCurrencyId`.
 */
export function summarizeMachineCurrencies(input: {
  catalog: readonly MachineCurrencyCatalogEntry[];
  fallbackCurrencyId: number | null;
  storage: readonly MachineCurrencyStorageEntry[];
}): { labels: string[]; mixed: boolean; unknownCurrencyCount: number } {
  const currencyById = new Map(input.catalog.map((entry) => [entry.id, entry.idCurrency]));
  const labelById = new Map(input.catalog.map((entry) => [entry.id, currencyShortLabel(entry.currency)]));
  const labels = new Set<string>();
  const currencyIds = new Set<number>();
  let unknownCurrencyCount = 0;

  for (const entry of input.storage) {
    const inUse = isDenominationInUse({
      acceptedLastArqueo: null,
      acceptedStock: toNumber(entry.apStored),
      configured: entry.isDispensing,
      deliveredInPeriod: false,
      deliveredLastArqueo: null,
      dispensingStock: toNumber(entry.dpStored),
      failedInPeriod: false,
      loadedInPeriod: 0,
      minDpQuantity: toNumber(entry.minDpQuantity),
      rejectedLastArqueo: null,
      rejectionStock: toNumber(entry.rjStored),
    });
    if (!inUse) {
      continue;
    }

    const currencyId = currencyById.get(entry.idCurrencyDenomination) ?? input.fallbackCurrencyId;
    if (currencyId === null || currencyId === undefined) {
      unknownCurrencyCount += 1;
      continue;
    }

    currencyIds.add(currencyId);
    const label = labelById.get(entry.idCurrencyDenomination) ?? (currencyId === input.fallbackCurrencyId ? "moneda del Pay+" : null);
    if (label) {
      labels.add(label);
    }
  }

  return { labels: [...labels], mixed: currencyIds.size > 1, unknownCurrencyCount };
}

function toNumber(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
