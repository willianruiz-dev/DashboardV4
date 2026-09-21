"use client";

import { CircleCheck, PackageOpen, TimerReset, TriangleAlert, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { usePaypads } from "@/features/paypads/hooks";
import { isSuperAdminRole } from "@/lib/roles/super-admin";
import { currencyShortLabel } from "@/features/dispensing-control/denomination-currency";
import {
  apiIsoToLocalInputValue,
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

  // Último cargue de la máquina (para el preset «Desde último cargue» y la pista de
  // período). Se deriva de los mismos cargues del cuadre: sin refetch extra.
  // (Antes del guard: los hooks no pueden ir tras un retorno condicional.)
  const lastLoadIso = useMemo(() => {
    let best: string | null = null;
    let bestTime = Number.NEGATIVE_INFINITY;
    for (const load of metricsQuery.sources.loads) {
      const time = new Date(load.dateCreated ?? "").getTime();
      if (!Number.isNaN(time) && time > bestTime) {
        best = load.dateCreated ?? null;
        bestTime = time;
      }
    }
    return best;
  }, [metricsQuery.sources.loads]);
  const lastLoadLocal = lastLoadIso ? apiIsoToLocalInputValue(lastLoadIso) : null;

  // Pista operativa: si el último cargue quedó fuera del período elegido (p. ej. Hoy),
  // AP/RJ no cubren todo lo vendido desde el cargue: el arqueo completo pide el preset.
  const lastLoadOutsideRange = useMemo(() => {
    if (selection === null || lastLoadIso === null || selection.preset === "desde-cargue") {
      return false;
    }
    const from = localDateTimeToApiIso(selection.range.from);
    const to = localDateTimeToApiIso(selection.range.to, { endOfMinute: true });
    if (!from || !to) {
      return false;
    }
    const loadTime = new Date(lastLoadIso).getTime();
    const fromTime = new Date(from).getTime();
    const toTime = new Date(to).getTime();
    return !Number.isNaN(loadTime) && (loadTime < fromTime || loadTime > toTime);
  }, [selection, lastLoadIso]);

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
  // Salida del período del cargue: la cifra operativa (nunca supera lo cargado).
  const loadOutflowTotals = metrics?.loadOutflowTotalsByCurrency ?? [];
  const loadOutflowBreakdown =
    loadOutflowTotals.length > 1
      ? loadOutflowTotals.map((entry) => `${entry.label ?? "Moneda no declarada"} ${formatDashboardMoney(entry.total)}`).join(" · ")
      : null;
  const baseOutflowTotal = metrics?.dp.baseOutflowTotal ?? null;
  // Fila con saldo mayor que lo cargado: el cargue no explica el inventario actual
  // (cargue sin registrar). Se declara en la tarjeta, no se esconde.
  const loadOutflowInconsistent = (metrics?.rows ?? []).some((row) => (row.deliveredFromLoad ?? 0) < 0);
  const multiCurrency = metrics?.multiCurrency ?? false;
  const currencyLabels = (metrics?.currencyLabels ?? []).join(", ");
  // Se declara en las tarjetas para que nadie lea un total agregado como si fuera
  // comparable: para eso está el desglose por moneda.
  const mixedCurrencyNote = multiCurrency ? " · suma monedas distintas (no comparable)" : "";
  const dpOutflowTotal = metrics?.dp.outflowTotal ?? null;
  const hasArqueoBase = metrics?.reconciliation.hasBase ?? false;
  const lastLoadElapsed = metrics?.lastLoad.elapsedMs ?? null;
  // El cuadre físico NO depende del filtro: va del arqueo base a hoy. Cuando el período
  // elegido empieza después del arqueo base, las columnas físicas abarcan más tiempo que
  // AP/RJ — el caso real «Desde último cargue» posterior al arqueo, que hace ver una
  // «Entregada» mayor que lo cargado. Se explica en vez de dejarlo a interpretación.
  const baseAtIso = metrics?.reconciliation.baseAt ?? null;
  const physicalFromIso = selection === null ? null : localDateTimeToApiIso(selection.range.from);
  const physicalBaseTime = baseAtIso === null ? Number.NaN : new Date(baseAtIso).getTime();
  const physicalFromTime = physicalFromIso === null ? Number.NaN : new Date(physicalFromIso).getTime();
  const baseOlderThanPeriod =
    hasArqueoBase && !Number.isNaN(physicalBaseTime) && !Number.isNaN(physicalFromTime) && physicalFromTime > physicalBaseTime;

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
          lastLoadAt={lastLoadLocal}
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
            {multiCurrency ? (
              <Alert variant="warning">
                <TriangleAlert aria-hidden="true" className="size-4" />
                <AlertTitle>Máquina multimoneda ({currencyLabels})</AlertTitle>
                <AlertDescription>
                  Los importes de AP, RJ y el total del arqueo agregan monedas distintas y no son comparables entre sí. El inventario del
                  dispensador se muestra por moneda en el desglose, y la detección de atascos evalúa cada moneda por separado.
                </AlertDescription>
              </Alert>
            ) : null}
            {lastLoadOutsideRange && lastLoadIso ? (
              <Alert>
                <TimerReset aria-hidden="true" className="size-4" />
                <AlertTitle>El último cargue está fuera del período ({rangeLabel})</AlertTitle>
                <AlertDescription>
                  Fue el {formatDashboardDateTime(lastLoadIso)}: AP y RJ solo cubren {rangeLabel}. Para el arqueo operativo completo
                  (desde el último cargue hasta hoy) usa el preset «Desde último cargue».
                </AlertDescription>
              </Alert>
            ) : null}
            {baseOlderThanPeriod && baseAtIso && physicalFromIso ? (
              <Alert>
                <PackageOpen aria-hidden="true" className="size-4" />
                <AlertTitle>El cuadre físico abarca desde el arqueo base, no desde el período ({rangeLabel})</AlertTitle>
                <AlertDescription>
                  Inicial, Cargada y Entregada van del arqueo base del {formatDashboardDateTime(baseAtIso)} hasta el inventario de hoy; AP y RJ
                  cubren solo desde el {formatDashboardDateTime(physicalFromIso)}. Por eso la «Entregada» puede superar lo cargado en el período:
                  parte de los billetes ya estaban en el dispensador cuando se hizo el arqueo. Cada columna muestra su ecuación para auditarla.
                </AlertDescription>
              </Alert>
            ) : null}
            {!hasArqueoBase && metrics && !metricsQuery.isLoading ? (
              <Alert variant="warning">
                <TriangleAlert aria-hidden="true" className="size-4" />
                <AlertTitle>Sin arqueo base</AlertTitle>
                <AlertDescription>
                  Esta máquina nunca se ha arqueado: la salida física (DP) no es calculable y la tabla muestra el inventario actual como
                  referencia. Registra un arqueo en Pay+ → Arquear para activar el cuadre completo.
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={CircleCheck}
                label="AP · Aprobadas del período"
                loading={metricsQuery.isLoading && metrics === null}
                subtitle={`${metrics?.ap.count ?? 0} transacción${(metrics?.ap.count ?? 0) === 1 ? "" : "es"}${metrics?.apPhysical.at ? ` · Base: ${formatDashboardMoney(metrics.apPhysical.total ?? "0")}` : " · Sin arqueo base"} · Aceptadores hoy: ${metrics ? formatDashboardMoney(metrics.apPhysical.currentTotal) : "—"}${mixedCurrencyNote}`}
                tone="approved"
                value={metrics ? formatDashboardMoney(metrics.ap.total) : "—"}
              />
              <MetricCard
                icon={PackageOpen}
                label="DP · Salida desde el último cargue"
                loading={metricsQuery.isLoading && metrics === null}
                subtitle={
                  metrics?.lastLoad.at
                    ? `Cargada desde el ${formatDashboardDateTime(metrics.lastLoad.at)}: ${formatDashboardMoney(metrics.reconciliation.loadsSinceLastLoadTotal)} · Inventario hoy: ${formatDashboardMoney(metrics.dp.storageTotal)}${loadOutflowInconsistent ? " · hay baúles con más saldo que lo cargado (revisa cargues sin registrar)" : ""}${loadOutflowBreakdown ? ` · por moneda: ${loadOutflowBreakdown}` : ""}${mixedCurrencyNote}${baseOutflowTotal ? ` · desde arqueo (referencia): ${formatDashboardMoney(baseOutflowTotal)}` : ""}`
                    : metrics
                      ? `Sin cargues registrados · inventario hoy${currencyBreakdown ? " por moneda" : ""}: ${currencyBreakdown ?? formatDashboardMoney(metrics.dp.storageTotal)}`
                      : null
                }
                tone="system"
                value={dpOutflowTotal === null ? "—" : formatDashboardMoney(dpOutflowTotal)}
              />
              <MetricCard
                icon={XCircle}
                label="RJ · Aprobada Error Devuelta"
                loading={metricsQuery.isLoading && metrics === null}
                subtitle={`${metrics?.rj.count ?? 0} transacción${(metrics?.rj.count ?? 0) === 1 ? "" : "es"} · Baúl rechazo hoy: ${metrics ? formatDashboardMoney(metrics.rj.currentTotal) : "—"}${metrics?.rj.physicalTotal ? ` (base: ${formatDashboardMoney(metrics.rj.physicalTotal)})` : ""}${mixedCurrencyNote}`}
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
                (inicial/cargada/entregada/rechazo/saldo) y debajo la detección de atascos. */}
            <DenominationTable
              baseAt={metrics?.reconciliation.baseAt ?? null}
              baseSelfCheck={metrics?.reconciliation.baseSelfCheck ?? null}
              denominations={metricsQuery.denominations}
              excludedRows={metrics?.excludedRows ?? []}
              hasBase={metrics?.reconciliation.hasBase ?? false}
              lastLoadAt={metrics?.lastLoad.at ?? null}
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
              Fuentes: transacciones del período (AP/RJ, valor neto = ingresado − devuelto) · arqueo base + cargues desde la base + inventario
              actual (cuadre físico DP: entregada = inicial + cargada − saldo; rechazo = baúl actual con su delta).
              El umbral de alerta por denominación se configura en Pay+ → Configurar denominaciones (mínimo DP); la tolerancia del arqueo legacy añade 10 unidades.
            </p>
          </>
        )
      ) : null}
    </div>
  );
}
