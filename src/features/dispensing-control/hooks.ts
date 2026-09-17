"use client";

import { useEffect, useMemo, useState } from "react";

import { useDenominations } from "@/features/denominations/hooks";
import type { CurrencyDenomination } from "@/features/denominations/schemas";
import { usePaypadLoads, usePaypadStorage, usePaypadTonnages } from "@/features/paypads/hooks";
import type { Tonnage } from "@/features/paypads/schemas";
import { useTransactionSearch } from "@/features/transactions/hooks";
import type { DashboardTransaction, TransactionSearchRequest } from "@/features/transactions/schemas";
import { localDateTimeToApiIso } from "@/lib/formatters/date";
import { computeDispensingMetrics, type DispensingMetrics } from "./dispensing-metrics";
import type { DispensingRange, DispensingTimePreset } from "./schemas";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Rango local (datetime-local) para los presets rápidos. */
export function createPresetRange(preset: Exclude<DispensingTimePreset, "rango">, now = new Date()): DispensingRange {
  if (preset === "hoy") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 0, 0);
    return { from: toLocalInputValue(from), to: toLocalInputValue(to) };
  }

  const to = new Date(now);
  const from = new Date(now);
  if (preset === "24h") {
    from.setDate(from.getDate() - 1);
  } else {
    from.setDate(from.getDate() - 7);
  }

  return { from: toLocalInputValue(from), to: toLocalInputValue(to) };
}

/** Reloj que avanza solo (para "tiempo transcurrido") sin refetch de datos. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export interface DispensingMetricsArgs {
  from: string;
  page: number;
  pageSize: number;
  paypadId: number | null;
  to: string;
}

export interface DispensingSearchResult {
  items: DashboardTransaction[];
  total: number;
  transactionIds: number[];
}

export interface DispensingMetricsQuery {
  denominations: CurrencyDenomination[];
  error: Error | null;
  isLoading: boolean;
  metrics: DispensingMetrics | null;
  now: Date;
  refetchAll: () => void;
  search: DispensingSearchResult | null;
}

function createSearchRequest(args: DispensingMetricsArgs | null, page: number, pageSize: number): TransactionSearchRequest | null {
  if (args === null || args.paypadId === null) {
    return null;
  }

  const from = localDateTimeToApiIso(args.from);
  const to = localDateTimeToApiIso(args.to, { endOfMinute: true });
  if (!from || !to) {
    return null;
  }

  return {
    from,
    page,
    pageSize,
    paymentType: null,
    paypadId: args.paypadId,
    product: null,
    sortDirection: "desc",
    sortKey: "dateCreated",
    to,
  };
}

/**
 * Orquestación del módulo (ver docs/DISPENSING_CONTROL_FEASIBILITY.md §5.3):
 * storage + arqueos + cargues + denominaciones por máquina, y la búsqueda de
 * transacciones del período (su `summary` se calcula sobre el conjunto
 * completo, no sobre la página visible). Todo se resuelve con queries
 * existentes, en paralelo, y se deriva en un cálculo puro memoizado.
 */
export function useDispensingMetrics(args: DispensingMetricsArgs | null): DispensingMetricsQuery {
  const paypadId = args?.paypadId ?? null;
  const storageQuery = usePaypadStorage(paypadId);
  const tonnagesQuery = usePaypadTonnages(paypadId);
  const loadsQuery = usePaypadLoads(paypadId);
  const denominationsQuery = useDenominations(paypadId !== null);
  const now = useNow();

  // Dos consultas de búsqueda con papeles distintos:
  // - metricsRequest: página fija (1/5). El BFF calcula el summary sobre el
  //   conjunto COMPLETO del período, así que el resumen no depende de la
  //   paginación: mientras se navegan páginas, AP/RJ se sirven de cache sin
  //   parpadear (y sin peticiones extra).
  // - tableRequest: la paginación real para la tabla de transacciones.
  // Si ambas piden lo mismo (página 1, 5 resultados), react-query deduplica
  // la clave y solo hay UNA petición al BFF.
  const metricsRequest = useMemo<TransactionSearchRequest | null>(() => createSearchRequest(args, 1, 5), [args]);
  const tableRequest = useMemo<TransactionSearchRequest | null>(() => {
    if (args === null) {
      return null;
    }
    return createSearchRequest(args, args.page, args.pageSize);
  }, [args]);

  const metricsSearchQuery = useTransactionSearch(metricsRequest);
  const tableSearchQuery = useTransactionSearch(tableRequest);

  const errors: (unknown | null)[] = [
    storageQuery.error,
    tonnagesQuery.error,
    loadsQuery.error,
    metricsSearchQuery.error,
    tableSearchQuery.error,
    denominationsQuery.error,
  ];
  const firstError = errors.find((error): error is Error => error instanceof Error) ?? null;

  const isLoading =
    storageQuery.isPending ||
    tonnagesQuery.isPending ||
    loadsQuery.isPending ||
    denominationsQuery.isPending ||
    (metricsRequest !== null && metricsSearchQuery.isPending) ||
    (tableRequest !== null && tableSearchQuery.isPending);

  const metrics = useMemo<DispensingMetrics | null>(() => {
    if (args === null || paypadId === null) {
      return null;
    }

    const fromIso = localDateTimeToApiIso(args.from);
    const toIso = localDateTimeToApiIso(args.to, { endOfMinute: true });
    if (!fromIso || !toIso) {
      return null;
    }

    const rangeFrom = new Date(fromIso);
    const rangeTo = new Date(toIso);
    const tonnages = tonnagesQuery.data ?? [];
    const lastTonnage = tonnages.reduce<Tonnage | null>((best, tonnage) => {
      const time = new Date(tonnage.dateCreated ?? "").getTime();
      if (Number.isNaN(time)) {
        return best;
      }
      if (best === null) {
        return tonnage;
      }
      const bestTime = new Date(best.dateCreated ?? "").getTime();
      return Number.isNaN(bestTime) || time > bestTime ? tonnage : best;
    }, null);

    return computeDispensingMetrics({
      byState: metricsSearchQuery.data?.summary.byState ?? {},
      lastTonnage,
      loads: loadsQuery.data ?? [],
      now,
      rangeFrom,
      rangeTo,
      storage: storageQuery.data ?? [],
    });
  }, [args, paypadId, metricsSearchQuery.data, storageQuery.data, tonnagesQuery.data, loadsQuery.data, now]);

  const search =
    tableRequest !== null && tableSearchQuery.data
      ? {
          items: tableSearchQuery.data.items,
          total: tableSearchQuery.data.total,
          transactionIds: tableSearchQuery.data.transactionIds,
        }
      : null;

  return {
    denominations: denominationsQuery.data ?? [],
    error: firstError,
    isLoading,
    metrics,
    now,
    search,
    refetchAll: () => {
      storageQuery.refetch();
      tonnagesQuery.refetch();
      loadsQuery.refetch();
      denominationsQuery.refetch();
      if (metricsRequest !== null) {
        metricsSearchQuery.refetch();
      }
      if (tableRequest !== null) {
        tableSearchQuery.refetch();
      }
    },
  };
}
