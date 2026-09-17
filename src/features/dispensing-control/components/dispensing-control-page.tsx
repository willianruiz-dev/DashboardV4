"use client";

import { CircleCheck, PackageOpen, TimerReset, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { usePaypads } from "@/features/paypads/hooks";
import { isSuperAdminRole } from "@/lib/roles/super-admin";
import { currencyShortLabel } from "@/features/dispensing-control/denomination-currency";
import {
  buildJamScanRequest,
  createPresetRange,
  useDispensingJamScan,
  useDispensingMetrics,
} from "@/features/dispensing-control/hooks";
import {
  DenominationTable,
} from "@/features/dispensing-control/components/denomination-table";
import { JamDiagnosticsSection } from "@/features/dispensing-control/components/jam-diagnostics";
import { DispensingFilters, type DispensingFilterSelection } from "@/features/dispensing-control/components/dispensing-filters";
import { MetricCard } from "@/features/dispensing-control/components/metric-card";
import { computeJamDiagnostics } from "@/features/dispensing-control/dispensing-jams";
import { formatElapsed } from "@/features/dispensing-control/dispensing-metrics";
import { dispensingPresetLabels, type JamScanRequest } from "@/features/dispensing-control/schemas";
import { formatDashboardDateTime, localDateTimeToApiIso } from "@/lib/formatters/date";
import { formatDashboardMoney } from "@/lib/formatters/money";

interface DispensingControlPageProps {
  /** Máquina preseleccionada (p. ej. al llegar desde la alerta del inicio). */
  initialPaypadId?: number | null;
}

export function DispensingControlPage({ initialPaypadId = null }: DispensingControlPageProps) {
  const session = useDashboardSession();
  // Guard de nivel SuperAdmin resuelto en el frontend por nombre de rol
  // (mismo patrón que la página de Usuarios con "root"): sin operaciones de
  // datos ni cambios al API. Ver docs/DISPENSING_CONTROL_FEASIBILITY.md §3.
  const canAccess = isSuperAdminRole(session.role.role ?? session.user.role);
  const canReadPaypads = hasPermission(session, "ReadPayPads");
  const paypadsQuery = usePaypads(canAccess && canReadPaypads);

  // Preselección desde la URL (alerta del inicio): el estado inicial se deriva de la prop
  // (no de un efecto) para no provocar renders en cascada; el operador puede cambiarla.
  const [selection, setSelection] = useState<DispensingFilterSelection | null>(() =>
    initialPaypadId === null
      ? null
      : { paypadId: initialPaypadId, preset: "hoy", range: createPresetRange("hoy") },
  );
  const paypadId = selection?.paypadId ?? null;
  // Moneda de la máquina seleccionada: etiqueta de respaldo cuando el catálogo de
  // denominaciones no responde (la separación real de monedas usa `idCurrency`).
  const selectedPaypad = selection === null ? null : (paypadsQuery.data?.find((paypad) => paypad.id === selection.paypadId) ?? null);
  const metricsArgs = useMemo(
    () =>
      selection === null || selection.paypadId === null
        ? null
        : {
            from: selection.range.from,
            machineCurrency: selectedPaypad ? { id: selectedPaypad.idCurrency, label: currencyShortLabel(selectedPaypad.currency) } : null,
            paypadId: selection.paypadId,
            to: selection.range.to,
          },
    [selection, selectedPaypad],
  );
  const metricsQuery = useDispensingMetrics(metricsArgs);

  // El análisis corre AUTOMÁTICAMENTE al seleccionar la máquina o cambiar el período
  // (el operador debe ver la alerta sin pulsar nada). La clave de la consulta incluye
  // máquina y rango, y el BFF cachea los detalles, así que volver a un período ya
  // analizado no vuelve a golpear el API legado.
  const jamScanRequest = useMemo<JamScanRequest | null>(() => buildJamScanRequest(metricsArgs), [metricsArgs]);
  const jamScanQuery = useDispensingJamScan(jamScanRequest);
  const hasAnalysis = jamScanQuery.data !== undefined && jamScanRequest !== null;

  const jamDiagnostics = useMemo(
    () =>
      computeJamDiagnostics({
        byState: metricsQuery.sources.byState,
        denominations: metricsQuery.denominations,
        loads: metricsQuery.sources.loads,
        machineCurrency: metricsQuery.machineCurrency,
        scan: jamScanQuery.data ?? null,
        rangeFrom: metricsArgs === null ? null : localDateTimeToApiIso(metricsArgs.from),
        rangeTo: metricsArgs === null ? null : localDateTimeToApiIso(metricsArgs.to, { endOfMinute: true }),
        storage: metricsQuery.sources.storage,
        tonnages: metricsQuery.sources.tonnages,
      }),
    [jamScanQuery.data, metricsArgs, metricsQuery.denominations, metricsQuery.machineCurrency, metricsQuery.sources],
  );

  function handleApply(next: DispensingFilterSelection): void {
    setSelection(next);
  }

  if (!canAccess) {
    return <ForbiddenState description="El control de dispensado es exclusivo de usuarios con rol SuperAdmin." />;
  }

  const metrics = metricsQuery.metrics;
  const rangeLabel = selection ? dispensingPresetLabels[selection.preset] : "";
  // Máquina de cambio divisa (COP ⇄ USD): los importes de cada moneda no se suman.
  const currencyTotals = metrics?.storageTotalsByCurrency ?? [];
  const currencyBreakdown =
    currencyTotals.length > 1
      ? currencyTotals.map((entry) => `${entry.label ?? "Moneda no declarada"} ${formatDashboardMoney(entry.total)}`).join(" · ")
      : null;
  const dpTotal = metrics?.dp.total ?? null;
  const lastLoadElapsed = metrics?.lastLoad.elapsedMs ?? null;

  return (
    <div className="grid gap-6">
      <PageHeader
        description="Control operativo del dispensado por máquina: valores aprobados (AP), realmente entregados (DP) y devueltos por error (RJ), tiempo desde el último cargue y saldos de baúl por denominación con alertas de umbral."
        title="Control de dispensado"
      />

      {!canReadPaypads ? (
        <ForbiddenState description="Tu rol no tiene permiso para listar los Pay+ requeridos por el control de dispensado." />
      ) : null}
      {canReadPaypads && paypadsQuery.isPending ? <ListSkeleton rows={2} /> : null}
      {canReadPaypads && !paypadsQuery.isPending && paypadsQuery.isError ? (
        <ErrorState
          description={paypadsQuery.error instanceof Error ? paypadsQuery.error.message : "No fue posible cargar las máquinas."}
          onRetry={() => void paypadsQuery.refetch()}
        />
      ) : null}
      {canReadPaypads && !paypadsQuery.isPending && !paypadsQuery.isError && (paypadsQuery.data?.length ?? 0) === 0 ? (
        <EmptyState description="No hay máquinas Pay+ registradas para consultar." title="No hay Pay+" />
      ) : null}

      {canReadPaypads && !paypadsQuery.isPending && !paypadsQuery.isError && (paypadsQuery.data?.length ?? 0) > 0 ? (
        <DispensingFilters
          disabled={paypadId !== null && metricsQuery.isLoading}
          onApply={handleApply}
          paypadId={paypadId}
          paypads={paypadsQuery.data ?? []}
        />
      ) : null}

      {canReadPaypads && !paypadsQuery.isPending && !paypadsQuery.isError && (paypadsQuery.data?.length ?? 0) > 0 && paypadId === null ? (
        <EmptyState
          description="Busca y elige una máquina en el selector de arriba para ver AP, DP, RJ, el último cargue, el desglose por denominaciones y la detección de atascos."
          title="Selecciona una máquina"
        />
      ) : null}

      {selection !== null && selection.paypadId !== null ? (
        metricsQuery.error !== null && !metricsQuery.isLoading ? (
          <ErrorState
            description={metricsQuery.error.message}
            onRetry={metricsQuery.refetchAll}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={CircleCheck}
                label="AP · Aprobadas del período"
                loading={metricsQuery.isLoading && metrics === null}
                subtitle={`${metrics?.ap.count ?? 0} transacción${(metrics?.ap.count ?? 0) === 1 ? "" : "es"}${metrics?.apPhysical.at ? ` · Arqueo: ${formatDashboardMoney(metrics.apPhysical.total ?? "0")}` : ""}`}
                tone="approved"
                value={metrics ? formatDashboardMoney(metrics.ap.total) : "—"}
              />
              <MetricCard
                icon={PackageOpen}
                label="DP · Real entregado"
                loading={metricsQuery.isLoading && metrics === null}
                subtitle={
                  metrics?.dp.at
                    ? `Último arqueo: ${formatDashboardDateTime(metrics.dp.at)}${currencyBreakdown ? ` (total del backend; no separable por moneda) · inventario actual por moneda: ${currencyBreakdown}` : ""}`
                    : metrics
                      ? `Sin arqueo · inventario${currencyBreakdown ? " por moneda" : ""}: ${currencyBreakdown ?? formatDashboardMoney(metrics.dp.storageTotal)}`
                      : null
                }
                tone="system"
                value={dpTotal === null ? "—" : formatDashboardMoney(dpTotal)}
              />
              <MetricCard
                icon={XCircle}
                label="RJ · Aprobada Error Devuelta"
                loading={metricsQuery.isLoading && metrics === null}
                subtitle={`${metrics?.rj.count ?? 0} transacción${(metrics?.rj.count ?? 0) === 1 ? "" : "es"}${metrics?.rj.physicalTotal ? ` · Baúl rechazo: ${formatDashboardMoney(metrics.rj.physicalTotal)}` : ""}`}
                tone="cancelled"
                value={metrics ? formatDashboardMoney(metrics.rj.total) : "—"}
              />
              <MetricCard
                icon={TimerReset}
                label="Último cargue"
                loading={metricsQuery.isLoading && metrics === null}
                subtitle={
                  metrics?.lastLoad.at
                    ? `El ${formatDashboardDateTime(metrics.lastLoad.at)}${metrics.lastLoad.total ? ` · ${formatDashboardMoney(metrics.lastLoad.total)}` : ""}`
                    : "Sin cargues registrados"
                }
                tone="neutral"
                value={lastLoadElapsed === null ? "—" : `hace ${formatElapsed(lastLoadElapsed)}`}
              />
            </div>

            {/* Orden pedido por operación: primero el desglose por denominaciones
                (cargada/entregada/rechazada/saldo) y debajo la detección de atascos. */}
            <DenominationTable
              denominations={metricsQuery.denominations}
              loading={metricsQuery.isLoading && metrics === null}
              rangeLabel={rangeLabel}
              rows={metrics?.rows ?? []}
              totalsByCurrency={metrics?.storageTotalsByCurrency ?? []}
            />

            <JamDiagnosticsSection
              analysisCurrent={hasAnalysis}
              diagnostics={jamDiagnostics}
              error={jamScanQuery.isError && jamScanQuery.error instanceof Error ? jamScanQuery.error : null}
              isAnalyzing={jamScanQuery.isFetching}
              onAnalyze={() => void jamScanQuery.refetch()}
              onRetry={() => void jamScanQuery.refetch()}
              rangeLabel={rangeLabel}
            />

            <p className="text-xs text-muted-foreground">
              Fuentes: transacciones del período (AP/RJ, valor neto = ingresado − devuelto) · último arqueo y almacenamiento del Pay+ (DP, saldos de baúl) · cargues registrados (período y último).
              El umbral de alerta por denominación se configura en Pay+ → Configurar denominaciones (mínimo DP); la tolerancia del arqueo legacy añade 10 unidades.
            </p>
          </>
        )
      ) : null}
    </div>
  );
}
