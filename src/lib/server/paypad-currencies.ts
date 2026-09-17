import "server-only";

import { z } from "zod";

import { summarizeMachineCurrencies } from "@/features/dispensing-control/denomination-usage";
import { currencyShortLabel } from "@/features/dispensing-control/denomination-currency";
import { denominationSchema } from "@/features/denominations/schemas";
import { paypadStorageSchema } from "@/features/paypads/schemas";
import { requestBackend } from "@/lib/server/backend-client";
import { mapWithConcurrency } from "@/lib/server/concurrency";
import { httpEnvelopeSchema } from "@/schemas/http";

/**
 * Moneda de cada Pay+ resuelta SERVER-SIDE y cacheada, para que ninguna vista sume importes de
 * monedas distintas:
 *
 *  - `PayPad.idCurrency` (y su texto `currency`) da la moneda declarada por la máquina, gratis
 *    porque el listado de Pay+ ya se consulta en estas rutas.
 *  - El baúl (`PayPad/GetStorage`) + el catálogo de denominaciones detectan las máquinas que
 *    operan MÁS de una moneda (cambio divisa COP ⇄ USD): ahí los importes de una transacción no
 *    son atribuibles a una sola moneda y se agrupan aparte ("Varias monedas"). El catálogo se
 *    comparte con el control de dispensado (`denomination-usage.ts`).
 *
 * Los baúles se cachean 10 min (la configuración de monedas cambia rara vez) y las consultas se
 * acotan por concurrencia y por tope, para no castigar al API legado.
 */

const CATALOG_CACHE_TTL_MS = 10 * 60 * 1000;
const STORAGE_CACHE_TTL_MS = 10 * 60 * 1000;
const CONCURRENCY = 5;
const MAX_STORAGE_LOOKUPS = 12;

export interface PaypadCurrencyProfile {
  currencyId: number | null;
  /** Etiqueta corta: «COP», «USD» o el texto del maestro de monedas. */
  label: string;
  /** La máquina opera más de una moneda hoy. */
  mixed: boolean;
  /** Monedas en uso cuando la máquina es multimoneda (para el texto del grupo). */
  labels: string[];
}

export interface PaypadCurrencySource {
  currency?: string | null | undefined;
  id: number;
  idCurrency: number;
}

interface CacheEntry<TValue> {
  at: number;
  value: TValue;
}

let cachedCatalog: CacheEntry<z.infer<typeof denominationSchema>[]> | null = null;
const storageProfiles = new Map<number, CacheEntry<{ labels: string[]; mixed: boolean }>>();

async function getCatalog(token: string): Promise<z.infer<typeof denominationSchema>[]> {
  if (cachedCatalog && Date.now() - cachedCatalog.at <= CATALOG_CACHE_TTL_MS) {
    return cachedCatalog.value;
  }

  try {
    const envelope = await requestBackend(["api", "Masters", "CurrencyDenomination"], httpEnvelopeSchema(z.array(denominationSchema)), { token });
    cachedCatalog = { at: Date.now(), value: envelope.response };
    return envelope.response;
  } catch {
    // Sin catálogo se resuelve con la moneda declarada por el Pay+: se pierde la detección de
    // máquinas multimoneda, no la separación por moneda.
    return [];
  }
}

function readStorageProfile(paypadId: number): { labels: string[]; mixed: boolean } | null {
  const cached = storageProfiles.get(paypadId);
  if (!cached) {
    return null;
  }
  if (Date.now() - cached.at > STORAGE_CACHE_TTL_MS) {
    storageProfiles.delete(paypadId);
    return null;
  }
  return cached.value;
}

async function probeStorage(paypad: PaypadCurrencySource, token: string): Promise<void> {
  try {
    const envelope = await requestBackend(
      ["api", "PayPad", "GetStorage", String(paypad.id)],
      httpEnvelopeSchema(z.array(paypadStorageSchema).nullish()),
      { token },
    );
    const catalog = await getCatalog(token);
    const summary = summarizeMachineCurrencies({
      catalog: catalog.map((entry) => ({ currency: entry.currency, id: entry.id, idCurrency: entry.idCurrency })),
      fallbackCurrencyId: paypad.idCurrency,
      storage: (envelope.response ?? []).map((entry) => ({
        apStored: entry.apStored,
        dpStored: entry.dpStored,
        idCurrencyDenomination: entry.idCurrencyDenomination,
        isDispensing: entry.isDispensing,
        minDpQuantity: entry.minDpQuantity,
        rjStored: entry.rjStored,
      })),
    });
    storageProfiles.set(paypad.id, { at: Date.now(), value: { labels: summary.labels, mixed: summary.mixed } });
  } catch {
    storageProfiles.set(paypad.id, { at: Date.now(), value: { labels: [], mixed: false } });
  }
}

/**
 * Perfil de moneda de cada máquina. `probeStorage` permite decidir cuándo vale la pena consultar
 * el baúl (p. ej. la alerta del inicio lo hace sólo para máquinas con errores, y la búsqueda de
 * transacciones cuando el conjunto tiene pocas máquinas).
 */
export async function getPaypadCurrencyProfiles(
  paypads: readonly PaypadCurrencySource[],
  token: string,
  options: { maxLookups?: number; probeStorage?: boolean } = {},
): Promise<Map<number, PaypadCurrencyProfile>> {
  const maxLookups = options.maxLookups ?? MAX_STORAGE_LOOKUPS;
  const profiles = new Map<number, PaypadCurrencyProfile>();
  const declLabel = (paypad: PaypadCurrencySource): string => currencyShortLabel(paypad.currency) ?? `Moneda ${paypad.idCurrency}`;

  for (const paypad of paypads) {
    profiles.set(paypad.id, { currencyId: paypad.idCurrency, label: declLabel(paypad), labels: [declLabel(paypad)], mixed: false });
  }

  if (options.probeStorage === false) {
    return profiles;
  }

  const candidates = paypads.slice(0, maxLookups);
  await mapWithConcurrency(candidates, CONCURRENCY, async (paypad) => {
    if (readStorageProfile(paypad.id) === null) {
      await probeStorage(paypad, token);
    }
  });

  for (const paypad of candidates) {
    const stored = readStorageProfile(paypad.id);
    if (!stored) {
      continue;
    }

    const current = profiles.get(paypad.id);
    profiles.set(paypad.id, {
      currencyId: current?.currencyId ?? paypad.idCurrency,
      // La etiqueta del catálogo es la más fiable; la declarada por el Pay+ queda de respaldo.
      label: stored.labels[0] ?? current?.label ?? declLabel(paypad),
      labels: stored.labels.length > 0 ? stored.labels : [declLabel(paypad)],
      mixed: stored.mixed,
    });
  }

  return profiles;
}
