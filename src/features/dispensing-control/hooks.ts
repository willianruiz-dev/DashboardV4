"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { useDenominations } from "@/features/denominations/hooks";
import type { CurrencyDenomination } from "@/features/denominations/schemas";
import { analyzeDispensingJams, dispensingQueryKeys, fetchDispensingReturnAlerts } from "@/features/dispensing-control/api";
import { usePaypadLoads, usePaypadStorage, usePaypadTonnages } from "@/features/paypads/hooks";
import type { Load, PayPadStorage, Tonnage } from "@/features/paypads/schemas";
import { useTransactionSearch } from "@/features/transactions/hooks";
import type { TransactionSearchRequest, TransactionStateBucket } from "@/features/transactions/schemas";
import { localDateTimeToApiIso } from "@/lib/formatters/date";
import type { JamScanPayload } from "./dispensing-jams";
import { createDispensingMetricsInput } from "./dispensing-input";
import { computeDispensingMetrics, type DispensingMetrics } from "./dispensing-metrics";
import { buildSystemDispensedEvidence, type SystemDispensedEvidence } from "./system-dispensed";
import {
  DISPENSING_STORAGE_REFRESH_MS,
  JAM_SCAN_MAX_TRANSACTIONS,
  RETURN_ALERTS_REFRESH_MS,
  type DispensingRange,
  type DispensingTimePreset,
  type JamScanRequest,
  type ReturnAlertsRequest,
} from "./schemas";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** ISO del API (UTC) → valor `datetime-local` (zona local del navegador). */
export function apiIsoToLocalInputValue(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : toLocalInputValue(date);
}

/**
 * Rango local (datetime-local) para los presets rápidos.
 * `desde-cargue` cubre [último cargue → ahora]: es el período del arqueo operativo
 * (AP/RJ de transacciones). Requiere `lastLoadAt`; sin cargues registrados cae a Hoy.
 */
export function createPresetRange(
  preset: Exclude<DispensingTimePreset, "rango">,
  now = new Date(),
  lastLoadAt: Date | null = null,
): DispensingRange {
  if (preset === "hoy") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 0, 0);
    return { from: toLocalInputValue(from), to: toLocalInputValue(to) };
  }

  if (preset === "desde-cargue" && lastLoadAt !== null && !Number.isNaN(lastLoadAt.getTime())) {
    return { from: toLocalInputValue(lastLoadAt), to: toLocalInputValue(now) };
  }

  if (preset === "desde-cargue") {
    return createPresetRange("hoy", now);
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
  /**
   * Moneda declarada por el Pay+ seleccionado (`idCurrency` + etiqueta). Es el respaldo
   * de etiqueta cuando el catálogo de denominaciones no responde; la separación real de
   * monedas la da `idCurrency` del catálogo.
   */
  machineCurrency?: { id: number; label: string | null } | null;
  paypadId: number | null;
  to: string;
}

export interface DispensingMetricsSources {
  byState: Readonly<Record<string, TransactionStateBucket>>;
  loads: readonly Load[];
  storage: readonly PayPadStorage[];
  tonnages: readonly Tonnage[];
}

export interface DispensingMetricsQuery {
  /** Moneda declarada por el Pay+ (etiqueta de respaldo). */
  machineCurrency: { id: number; label: string | null } | null;
  denominations: CurrencyDenomination[];
  error: Error | null;
  isLoading: boolean;
  metrics: DispensingMetrics | null;
  now: Date;
  refetchAll: () => void;
  /**
   * Error de la lectura del historial de arqueos. NO es fatal (a diferencia de los demás):
   * el panel puede mostrar el inventario y los cargues sin base física, y sobre todo no debe
   * afirmar que la máquina nunca se ha arqueado cuando lo que falló fue la lectura.
   */
  tonnageError: Error | null;
  /** Datos crudos de las mismas queries, para el motor de atascos (sin refetch extra). */
  sources: DispensingMetricsSources;
  /**
   * Lado del sistema medido por los detalles de las transacciones (AP/DP por moneda), o `null`
   * sin barrido. Es la cifra que verifica el cuadre en máquinas multimoneda o de cambio divisa.
   */
  systemEvidence: SystemDispensedEvidence | null;
}

const emptySources: DispensingMetricsSources = { byState: {}, loads: [], storage: [], tonnages: [] };

/**
 * Orquestación del módulo (ver docs/DISPENSING_CONTROL_FEASIBILITY.md §5.3):
 * storage + arqueos + cargues + denominaciones por máquina, y la búsqueda de
 * transacciones del período (su `summary` se calcula sobre el conjunto
 * completo, no sobre la página visible). Todo se resuelve con queries
 * existentes, en paralelo, y se deriva en un cálculo puro memoizado.
 */
export function useDispensingMetrics(
  args: DispensingMetricsArgs | null,
  options: { scan?: JamScanPayload | null } = {},
): DispensingMetricsQuery {
  const paypadId = args?.paypadId ?? null;
  // El inventario en dispensadores es un snapshot del API: sin este refresco el cuadre compara
  // las transacciones de ahora contra el baúl de cuando se abrió la página.
  const storageQuery = usePaypadStorage(paypadId, { refetchInterval: paypadId === null ? undefined : DISPENSING_STORAGE_REFRESH_MS });
  const tonnagesQuery = usePaypadTonnages(paypadId);
  const loadsQuery = usePaypadLoads(paypadId);
  const denominationsQuery = useDenominations(paypadId !== null);
  const now = useNow();

  const searchRequest = useMemo<TransactionSearchRequest | null>(() => {
    if (args === null || paypadId === null) {
      return null;
    }

    const from = localDateTimeToApiIso(args.from);
    const to = localDateTimeToApiIso(args.to, { endOfMinute: true });
    if (!from || !to) {
      return null;
    }

    return {
      from,
      page: 1,
      pageSize: 5, // solo se consume el summary; los items no se muestran aquí
      paymentType: null,
      paypadId,
      product: null,
      sortDirection: "desc",
      sortKey: "dateCreated",
      to,
    };
  }, [args, paypadId]);

  const searchQuery = useTransactionSearch(searchRequest);

  const tonnageError = tonnagesQuery.error instanceof Error ? tonnagesQuery.error : null;
  // Los arqueos NO entran en esta lista: el panel funciona sin base física y, además, su fallo
  // tiene su propio aviso («no se pudo leer el historial»), no una pantalla de error completa.
  const errors: (unknown | null)[] = [
    storageQuery.error,
    loadsQuery.error,
    searchQuery.error,
    denominationsQuery.error,
  ];
  const firstError = errors.find((error): error is Error => error instanceof Error) ?? null;

  // OJO: en TanStack Query v5 una query con `enabled: false` mantiene
  // `status: "pending"`, así que `isPending` es true aunque no haya nada cargando.
  // Sin esta guarda, "sin máquina seleccionada" se interpretaba como "cargando" y la
  // barra de filtros entera quedaba deshabilitada (la persona no podía volver a
  // elegir una máquina sin salir de la ruta).
  const isLoading =
    paypadId !== null &&
    (storageQuery.isPending ||
      tonnagesQuery.isPending ||
      loadsQuery.isPending ||
      denominationsQuery.isPending ||
      (searchRequest !== null && searchQuery.isPending));

  // Evidencia del lado del sistema (AP/DP por moneda) construida con el barrido de detalles que
  // ya hace la detección de atascos: misma ventana, mismos detalles, ninguna petición extra.
  const scan = options.scan ?? null;
  const systemEvidence = useMemo<SystemDispensedEvidence | null>(
    () =>
      paypadId === null
        ? null
        : buildSystemDispensedEvidence({
            denominations: denominationsQuery.data ?? [],
            machineCurrency: args?.machineCurrency ?? null,
            scan,
            storage: storageQuery.data ?? [],
          }),
    [args?.machineCurrency, denominationsQuery.data, paypadId, scan, storageQuery.data],
  );

  // Datos crudos de las mismas queries: alimentan el cuadre y el motor de atascos sin refetch
  // extra. Se arman ANTES del cuadre porque son su insumo.
  const sources = useMemo<DispensingMetricsSources>(
    () =>
      paypadId === null
        ? emptySources
        : {
            byState: searchQuery.data?.summary.byState ?? {},
            loads: loadsQuery.data ?? [],
            storage: storageQuery.data ?? [],
            tonnages: tonnagesQuery.data ?? [],
          },
    [paypadId, searchQuery.data, loadsQuery.data, storageQuery.data, tonnagesQuery.data],
  );

  const metrics = useMemo<DispensingMetrics | null>(() => {
    if (args === null || paypadId === null) {
      return null;
    }

    const fromIso = localDateTimeToApiIso(args.from);
    const toIso = localDateTimeToApiIso(args.to, { endOfMinute: true });
    if (!fromIso || !toIso) {
      return null;
    }

    // El insumo se arma en un único lugar puro (`dispensing-input.ts`): así que el cuadre
    // reciba TODOS los datos (arqueos incluidos) es una regresión cubierta por las fixtures.
    return computeDispensingMetrics(
      createDispensingMetricsInput({
        arqueoHistoryError: tonnageError?.message ?? null,
        cashDispensedTotal: searchQuery.data?.summary.cashDispensedTotal ?? null,
        denominations: denominationsQuery.data ?? [],
        machineCurrency: args.machineCurrency ?? null,
        now,
        rangeFrom: new Date(fromIso),
        rangeTo: new Date(toIso),
        sources,
        // `dataUpdatedAt` es 0 antes de la primera respuesta: ese caso no es una lectura vieja.
        storageReadAt: storageQuery.dataUpdatedAt > 0 ? storageQuery.dataUpdatedAt : null,
        systemEvidence,
      }),
    );
  }, [args, paypadId, searchQuery.data, denominationsQuery.data, now, sources, storageQuery.dataUpdatedAt, systemEvidence, tonnageError]);

  return {
    denominations: denominationsQuery.data ?? [],
    error: firstError,
    machineCurrency: args?.machineCurrency ?? null,
    isLoading,
    metrics,
    now,
    systemEvidence,
    refetchAll: () => {
      storageQuery.refetch();
      tonnagesQuery.refetch();
      loadsQuery.refetch();
      denominationsQuery.refetch();
      if (searchRequest !== null) {
        searchQuery.refetch();
      }
    },
    sources,
    tonnageError,
  };
}

/** Rango de la selección actual en ISO UTC, tal como lo consume `Transaction/GetByDate`. */
export function buildJamScanRequest(args: DispensingMetricsArgs | null): JamScanRequest | null {
  if (args === null || args.paypadId === null) {
    return null;
  }

  const from = localDateTimeToApiIso(args.from);
  const to = localDateTimeToApiIso(args.to, { endOfMinute: true });
  if (!from || !to) {
    return null;
  }

  return { from, maxTransactions: JAM_SCAN_MAX_TRANSACTIONS, paypadId: args.paypadId, to };
}
/**
 * Análisis de atascos (manual y cacheado). `request === null` lo mantiene
 * deshabilitado: la consulta implica hasta `maxTransactions` peticiones de
 * detalle contra el API legado, así que se ejecuta solo cuando la persona lo pide.
 */
export function useDispensingJamScan(request: JamScanRequest | null) {
  return useQuery({
    enabled: request !== null,
    queryFn: () => {
      if (request === null) {
        throw new Error("No se indicó una máquina y rango para analizar atascos.");
      }
      return analyzeDispensingJams(request);
    },
    queryKey: request === null ? dispensingQueryKeys.jamScanNone() : dispensingQueryKeys.jamScan(request),
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Alertas de devoluciones del inicio. No existe contrato realtime en el backend
 * legado (ver B-01), así que el «tiempo real» es un sondeo acotado:
 *  - cada `RETURN_ALERTS_REFRESH_MS` (30 s),
 *  - solo con la pestaña visible (`refetchIntervalInBackground: false`),
 *  - y sin refetch al enfocar (`refetchOnWindowFocus: false`) para no duplicar.
 * El BFF absorbe el costo con caché corta por máquina y concurrencia limitada.
 */
export function useDispensingReturnAlerts(request: ReturnAlertsRequest | null, enabled = true) {
  return useQuery({
    enabled: enabled && request !== null,
    queryFn: () => {
      if (request === null) {
        throw new Error("No se indicó el rango para consultar los errores de devuelta.");
      }
      return fetchDispensingReturnAlerts(request);
    },
    queryKey: request === null ? dispensingQueryKeys.returnAlertsNone() : dispensingQueryKeys.returnAlerts(request),
    refetchInterval: RETURN_ALERTS_REFRESH_MS,
    // Explicito: no se sondea con la pestaña en segundo plano.
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: RETURN_ALERTS_REFRESH_MS / 2,
  });
}

/** Rango de hoy (00:00 → 23:59) listo para el BFF: la alerta es siempre del día actual. */
export function buildTodayReturnAlertsRequest(now = new Date()): ReturnAlertsRequest | null {
  const range = createPresetRange("hoy", now);
  const from = localDateTimeToApiIso(range.from);
  const to = localDateTimeToApiIso(range.to, { endOfMinute: true });
  if (!from || !to) {
    return null;
  }

  return { from, paypadId: null, to };
}

/**
 * Igual que `buildTodayReturnAlertsRequest`, pero para el día local indicado como
 * `YYYY-M-D`. El inicio usa esta variante para recalcular el rango si la pestaña
 * sigue abierta al pasar la medianoche (la alerta es siempre del día en curso).
 */
export function buildReturnAlertsRequestForDay(dayKey: string): ReturnAlertsRequest | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(dayKey);
  if (match === null) {
    return null;
  }

  const [, year, month, day] = match;
  // Mediodía del día local: evita los bordes de horario de verano al fijar 00:00 / 23:59.
  return buildTodayReturnAlertsRequest(new Date(Number(year), Number(month) - 1, Number(day), 12));
}
