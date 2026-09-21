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
  // Inventario del dispensador por moneda (la tabla lo declara cuando hay más de una).
  const currencyTotals = metrics?.storageTotalsByCurrency ?? [];
  const storageByCurrencyNote =
    currencyTotals.length > 1
      ? `Virtual hoy por moneda: ${currencyTotals.map((entry) => `${entry.label ?? "Moneda no declarada"} ${formatDashboardMoney(entry.total)}`).join(" · ")}`
      : "";
  // Cuadre del período: cargado = dispensado + rechazado + en dispensadores.
  const loadedTotal = metrics?.dp.loadedTotal ?? "0";
  const dispensedTotal = metrics?.dp.dispensedTotal ?? null;
  const rejectedTotal = metrics?.dp.rejectedTotal ?? "0";
  const storageTotal = metrics?.dp.storageTotal ?? "0";
  const arqueoTotal = metrics?.dp.arqueoTotal ?? null;
  const check = metrics?.reconciliationCheck ?? null;
  // Auditoría: si el arqueo de referencia tenía inventario previo, el dispensado "real"
  // (contando ese inventario) es mayor que el del período. Se declara, no se suma.
  const priorStock = (metrics?.rows ?? []).reduce((total, row) => total + (row.stockAtPeriodStart ?? 0), 0);
  const multiCurrency = metrics?.multiCurrency ?? false;
  const currencyLabels = (metrics?.currencyLabels ?? []).join(", ");
  // Se declara en las tarjetas para que nadie lea un total agregado como si fuera
  // comparable: para eso está el desglose por moneda.
  const mixedCurrencyNote = multiCurrency ? " · suma monedas distintas (no comparable)" : "";
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
  // Cuando el período elegido no tiene cargues, la verificación contra el sistema NO aplica:
  // el registro del sistema cubre el período y la auditoría del arqueo arranca días antes.
  // El aviso explica las dos ventanas en vez de acusar un descuadre inexistente.
  const notComparableNote =
    baseAtIso === null
      ? ""
      : metrics?.lastLoad.at
        ? `: la auditoría del arqueo arranca el ${formatDashboardDateTime(baseAtIso)} y el último cargue fue el ${formatDashboardDateTime(metrics.lastLoad.at)}`
        : `: la auditoría del arqueo arranca el ${formatDashboardDateTime(baseAtIso)}, antes del período`;

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
            {/* VERIFICACIÓN: lo que el sistema registró haber devuelto (Σ returnAmount) contra
                el dispensado del período. Es la medición independiente que valida el cuadre. */}
            {check && check.systemTotal !== null ? (
              check.best === null ? (
                /* Sin cargues en el período la comparación NO aplica: el registro del sistema
                   cubre el período y la auditoría del arqueo cubre desde la base (días antes).
                   Antes se mostraba como «hay dinero sin registro», que era una falsa alarma
                   (caso real Pay+ Inder 1 mirando «Hoy» con el último cargue de hace días). */
                <Alert>
                  <TimerReset aria-hidden="true" className="size-4" />
                  <AlertTitle>Sin período comparable para verificar</AlertTitle>
                  <AlertDescription>
                    <span className="block">
                      Sistema (Σ devuelto de {check.transactionCount} transacción(es) aprobadas):{" "}
                      <strong>{formatDashboardMoney(check.systemTotal)}</strong>
                      {check.fromArqueoTotal === null
                        ? ""
                        : ` · entregado desde la base del arqueo: ${formatDashboardMoney(check.fromArqueoTotal)}`}
                    </span>
                    <span className="mt-1 block">
                      {rangeLabel} no tiene cargues, así que «cargado − en dispensadores − rechazado» no es calculable: no hay dispensado
                      del período que comparar y las dos cifras de arriba miden ventanas distintas{notComparableNote}. Su diferencia
                      {" "}no es un descuadre. Para cuadrar el tramo completo usa el preset «Desde último cargue».
                    </span>
                  </AlertDescription>
                </Alert>
              ) : (
              <Alert variant={check.best === "ninguno" ? "warning" : "default"}>
                <CircleCheck aria-hidden="true" className="size-4" />
                <AlertTitle>
                  {check.best === "periodo"
                    ? "El dispensado coincide con lo que el sistema registró"
                    : check.best === "arqueo"
                      ? "Sólo cuadra contando el inventario previo del arqueo"
                      : "El dispensado no coincide con lo que el sistema registró"}
                </AlertTitle>
                <AlertDescription>
                  <span className="block">
                    Sistema (Σ devuelto de {check.transactionCount} transacción(es) aprobadas): <strong>{formatDashboardMoney(check.systemTotal)}</strong>
                    {" · "}
                    Dispensado del período: <strong>{check.fromPeriodTotal === null ? "no calculable" : formatDashboardMoney(check.fromPeriodTotal)}</strong>
                    {check.differences.periodo === null ? "" : ` (diferencia ${formatDashboardMoney(check.differences.periodo)})`}
                    {check.fromArqueoTotal !== null && check.fromArqueoTotal !== check.fromPeriodTotal
                      ? ` · contando el inventario previo del arqueo: ${formatDashboardMoney(check.fromArqueoTotal)}${
                          check.differences.arqueo === null ? "" : ` (diferencia ${formatDashboardMoney(check.differences.arqueo)})`
                        }`
                      : ""}
                  </span>
                  <span className="mt-1 block">
                    {check.best === "periodo"
                      ? "El cuadre cierra: cargado − en dispensadores − rechazado explica lo entregado a clientes."
                      : check.best === "arqueo"
                        ? "El inventario previo del arqueo sí pasó por el dispensador: revisa si el baúl se cargó sobre saldo existente o si esas unidades se retiraron en mantenimiento."
                        : "Hay dinero sin registro en una de las dos partes: revisa cargues no registrados, retiros manuales o el estado de los baúles."}
                  </span>
                </AlertDescription>
              </Alert>
              )
            ) : null}
            {baseOlderThanPeriod && baseAtIso && physicalFromIso ? (
              <Alert>
                <PackageOpen aria-hidden="true" className="size-4" />
                <AlertTitle>Referencia del arqueo: el período ({rangeLabel}) empieza después de la base</AlertTitle>
                <AlertDescription>
                  La «Entregada» de la tabla es la del último cargue ({formatDashboardDateTime(metrics?.lastLoad.at ?? null)}) y no cambia con el
                  filtro, igual que los saldos de los baúles. La referencia del arqueo base del {formatDashboardDateTime(baseAtIso)} (columna
                  Inicial y subtítulo) abarca desde ese arqueo, anterior al período; AP y RJ sí cubren solo desde el{" "}
                  {formatDashboardDateTime(physicalFromIso)}.
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
                label="DP · Dispensado en el período"
                loading={metricsQuery.isLoading && metrics === null}
                subtitle={
                  metrics
                    ? [
                        `Cargado ${formatDashboardMoney(loadedTotal)} − rechazado ${formatDashboardMoney(rejectedTotal)} − en dispensadores ${formatDashboardMoney(storageTotal)}`,
                        priorStock > 0
                          ? `el arqueo de referencia tenía ${priorStock} unidad(es) previas: contándolas saldrían ${formatDashboardMoney(arqueoTotal ?? "0")}`
                          : "",
                        mixedCurrencyNote.trim(),
                        storageByCurrencyNote,
                      ]
                        .filter((part) => part.length > 0)
                        .join(" · ")
                    : null
                }
                tone="system"
                value={dispensedTotal === null ? "—" : formatDashboardMoney(dispensedTotal)}
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
              totals={{ dispensed: dispensedTotal ?? "0", loaded: loadedTotal, rejected: rejectedTotal, storage: storageTotal }}
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
              Fuentes: transacciones del período (AP/RJ, valor neto = ingresado − devuelto) · cargues del período + baúles actuales (DP:
              dispensado = cargado − en dispensadores − rechazado; se verifica contra Σ devuelto del sistema) · arqueos como referencia de
              apertura.
              El umbral de alerta por denominación se configura en Pay+ → Configurar denominaciones (mínimo DP); la tolerancia del arqueo legacy añade 10 unidades.
            </p>
          </>
        )
      ) : null}
    </div>
  );
}
