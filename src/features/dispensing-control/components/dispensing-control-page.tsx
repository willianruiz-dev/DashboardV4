"use client";

import { CircleCheck, PackageOpen, TimerReset, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { usePaypads } from "@/features/paypads/hooks";
import { isSuperAdminRole } from "@/lib/roles/super-admin";
import {
  buildJamScanRequest,
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

export function DispensingControlPage() {
  const session = useDashboardSession();
  // Guard de nivel SuperAdmin resuelto en el frontend por nombre de rol
  // (mismo patrón que la página de Usuarios con "root"): sin operaciones de
  // datos ni cambios al API. Ver docs/DISPENSING_CONTROL_FEASIBILITY.md §3.
  const canAccess = isSuperAdminRole(session.role.role ?? session.user.role);
  const canReadPaypads = hasPermission(session, "ReadPayPads");
  const paypadsQuery = usePaypads(canAccess && canReadPaypads);

  const [selection, setSelection] = useState<DispensingFilterSelection | null>(null);
  const paypadId = selection?.paypadId ?? null;
  const metricsArgs = useMemo(
    () =>
      selection === null || selection.paypadId === null
        ? null
        : { from: selection.range.from, paypadId: selection.paypadId, to: selection.range.to },
    [selection],
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
        loads: metricsQuery.sources.loads,
        scan: jamScanQuery.data ?? null,
        rangeFrom: metricsArgs === null ? null : localDateTimeToApiIso(metricsArgs.from),
        rangeTo: metricsArgs === null ? null : localDateTimeToApiIso(metricsArgs.to, { endOfMinute: true }),
        storage: metricsQuery.sources.storage,
        tonnages: metricsQuery.sources.tonnages,
      }),
    [jamScanQuery.data, metricsArgs, metricsQuery.sources],
  );

  function handleApply(next: DispensingFilterSelection): void {
    setSelection(next);
  }

  if (!canAccess) {
    return <ForbiddenState description="El control de dispensado es exclusivo de usuarios con rol SuperAdmin." />;
  }

  const metrics = metricsQuery.metrics;
  const rangeLabel = selection ? dispensingPresetLabels[selection.preset] : "";
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
          disabled={metricsQuery.isLoading && selection !== null}
          onApply={handleApply}
          paypadId={paypadId}
          paypads={paypadsQuery.data ?? []}
        />
      ) : null}

      {selection?.paypadId === null ? (
        <EmptyState
          description="Elige una máquina para ver AP, DP, RJ, el último cargue y el estado de los baúles por denominación."
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
                    ? `Último arqueo: ${formatDashboardDateTime(metrics.dp.at)}`
                    : metrics
                      ? `Sin arqueo · inventario: ${formatDashboardMoney(metrics.dp.storageTotal)}`
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

            <JamDiagnosticsSection
              analysisCurrent={hasAnalysis}
              diagnostics={jamDiagnostics}
              error={jamScanQuery.isError && jamScanQuery.error instanceof Error ? jamScanQuery.error : null}
              isAnalyzing={jamScanQuery.isFetching}
              onAnalyze={() => void jamScanQuery.refetch()}
              onRetry={() => void jamScanQuery.refetch()}
              rangeLabel={rangeLabel}
            />

            <DenominationTable
              denominations={metricsQuery.denominations}
              loading={metricsQuery.isLoading && metrics === null}
              rangeLabel={rangeLabel}
              rows={metrics?.rows ?? []}
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
