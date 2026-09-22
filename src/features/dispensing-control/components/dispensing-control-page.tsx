"use client";

import { CircleCheck, PackageOpen, RefreshCw, TimerReset, TriangleAlert, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { usePaypads } from "@/features/paypads/hooks";
import { getPaypadDisplayName } from "@/features/paypads/paypad-display";
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
import { PayoutReconciliationSection } from "@/features/dispensing-control/components/payout-reconciliation";
import { ReconciliationCheckAlert } from "@/features/dispensing-control/components/reconciliation-check";
import { DispensingFilters, type DispensingFilterSelection } from "@/features/dispensing-control/components/dispensing-filters";
import { MetricCard } from "@/features/dispensing-control/components/metric-card";
import { computeJamDiagnostics } from "@/features/dispensing-control/dispensing-jams";
import { buildPayoutReconciliation } from "@/features/dispensing-control/dispensing-payout-reconciliation";
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
  // El análisis corre AUTOMÁTICAMENTE al seleccionar la máquina o cambiar el período
  // (el operador debe ver la alerta sin pulsar nada). La clave de la consulta incluye
  // máquina y rango, y el BFF cachea los detalles, así que volver a un período ya
  // analizado no vuelve a golpear el API legado.
  // Va ANTES de las métricas porque el barrido aporta la medición del lado del sistema por
  // moneda y por dirección del dinero (AP entra / DP sale): sin él, una máquina de cambio
  // divisa verificaba el dispensado contra `Σ returnAmount`, que sigue al aceptador.
  const jamScanRequest = useMemo<JamScanRequest | null>(() => buildJamScanRequest(metricsArgs), [metricsArgs]);
  const jamScanQuery = useDispensingJamScan(jamScanRequest);
  const hasAnalysis = jamScanQuery.data !== undefined && jamScanRequest !== null;

  const metricsQuery = useDispensingMetrics(metricsArgs, { scan: jamScanQuery.data ?? null });

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

  // Conciliación esperado/real por denominación: se deriva del MISMO barrido de detalles que
  // alimenta el motor de atascos (ninguna petición extra) y del inventario ya consultado.
  const payoutReconciliation = useMemo(
    () =>
      buildPayoutReconciliation({
        denominations: metricsQuery.denominations,
        machineCurrency: metricsQuery.machineCurrency,
        scan: jamScanQuery.data ?? null,
        storage: metricsQuery.sources.storage,
      }),
    [jamScanQuery.data, metricsQuery.denominations, metricsQuery.machineCurrency, metricsQuery.sources.storage],
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
      ? `En dispensadores por moneda (lectura del baúl): ${currencyTotals.map((entry) => `${entry.label ?? "Moneda no declarada"} ${formatDashboardMoney(entry.total)}`).join(" · ")}`
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
  // Diagnóstico del historial de arqueos: distingue «nunca se ha arqueado» de «no se pudo
  // leer» y de «los arqueos vienen sin fecha». Sin esto, un fallo de lectura del API se
  // presentaba como una acusación sobre la máquina.
  const arqueoHistory = metrics?.reconciliation.arqueoHistory ?? null;
  const tonnageError = metricsQuery.tonnageError;
  // Frescura de la lectura del baúl: el cuadre entero (dispensado = cargado − en
  // dispensadores − rechazado) y la columna «En dispensadores» salen de ese snapshot.
  const snapshotReadAtMs = metrics?.storageSnapshot.readAtMs ?? null;
  const snapshotElapsedMs = snapshotReadAtMs === null ? null : Math.max(0, metricsQuery.now.getTime() - snapshotReadAtMs);
  const machineIdentity =
    selectedPaypad === null
      ? null
      : [
          getPaypadDisplayName(selectedPaypad),
          `ID ${selectedPaypad.id}`,
          selectedPaypad.description?.trim() || null,
          selectedPaypad.office?.trim() || null,
        ].filter((part): part is string => part !== null && part !== "");
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
  // Desglose por moneda de los lados que el API sí permite atribuir (baúles y arqueo):
  // sin esto, AP/RJ/arqueo de una máquina de cambio divisa suman pesos y dólares.
  const byCurrencyText = (entries: readonly { label: string | null; total: string }[]): string =>
    entries.map((entry) => `${entry.label ?? "Moneda no declarada"} ${formatDashboardMoney(entry.total)}`).join(" · ");
  const acceptorByCurrencyNote =
    multiCurrency && (metrics?.acceptorTotalsByCurrency.length ?? 0) > 0
      ? ` · aceptador hoy por moneda: ${byCurrencyText(metrics?.acceptorTotalsByCurrency ?? [])}`
      : "";
  const rejectionByCurrencyNote =
    multiCurrency && (metrics?.rejectionTotalsByCurrency.length ?? 0) > 0
      ? ` · baúl de rechazo hoy por moneda: ${byCurrencyText(metrics?.rejectionTotalsByCurrency ?? [])}`
      : "";
  const arqueoByCurrencyNote =
    multiCurrency && (metrics?.arqueoTotalsByCurrency.length ?? 0) > 0
      ? `Arqueo base por moneda: ${byCurrencyText(
          (metrics?.arqueoTotalsByCurrency ?? []).map((entry) => ({ label: entry.label, total: entry.dp })),
        )} en dispensadores`
      : "";
  const dispensedByCurrencyNote =
    multiCurrency && (metrics?.dispensedTotalsByCurrency.length ?? 0) > 0
      ? `Dispensado por moneda: ${byCurrencyText(metrics?.dispensedTotalsByCurrency ?? [])}`
      : "";
  const loadedByCurrencyNote =
    multiCurrency && (metrics?.loadedTotalsByCurrency.length ?? 0) > 0
      ? `Cargado por moneda: ${byCurrencyText(metrics?.loadedTotalsByCurrency ?? [])}`
      : "";
  // La verificación necesita las DOS lecturas (cuadre físico y barrido de detalles): mientras
  // alguna esté en vuelo no se pinta la tarjeta, para no mostrar un estado transitorio
  // («sin período comparable» sin baúles cargados, o «no comparable» antes de llegar el detalle).
  const verificationPending = metricsQuery.isLoading || (jamScanRequest !== null && jamScanQuery.isPending);
  // En una máquina multimoneda el dispensado del período sólo es una cifra operativa por
  // moneda: el total agregado se muestra, pero no es el número que se verifica.
  const dpValue = multiCurrency && (metrics?.dispensedTotalsByCurrency.length ?? 0) > 1
    ? byCurrencyText(metrics?.dispensedTotalsByCurrency ?? [])
    : (dispensedTotal === null ? "—" : formatDashboardMoney(dispensedTotal));

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
            {/* Identidad y frescura: con varias máquinas homónimas (o dos pantallas abiertas en
                momentos distintos) el operador necesita saber DE QUÉ Pay+ y DE CUÁNDO son las
                cifras antes de compararlas con un arqueo. */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>
                Máquina: <span className="font-medium text-foreground">{machineIdentity?.join(" · ") ?? "—"}</span>
                {snapshotElapsedMs === null
                  ? null
                  : ` · Baúl leído hace ${formatElapsed(snapshotElapsedMs)}`}
                {tonnageError
                  ? " · Historial de arqueos: lectura fallida"
                  : arqueoHistory
                    ? arqueoHistory.count === 0
                      ? " · Sin arqueos en el historial del API"
                      : ` · ${arqueoHistory.count} arqueo${arqueoHistory.count === 1 ? "" : "s"} en el historial`
                    : ""}
              </p>
              <Button onClick={metricsQuery.refetchAll} size="sm" type="button" variant="outline">
                <RefreshCw aria-hidden="true" className="size-3.5" />
                Actualizar lecturas
              </Button>
            </div>
            {multiCurrency ? (
              <Alert variant="warning">
                <TriangleAlert aria-hidden="true" className="size-4" />
                <AlertTitle>Máquina multimoneda ({currencyLabels})</AlertTitle>
                <AlertDescription>
                  <span className="block">
                    Los importes de AP, RJ y el total del arqueo agregan monedas distintas y no son comparables entre sí. El inventario del
                    dispensador, el aceptador, el baúl de rechazo y el arqueo base se muestran por moneda, y la detección de atascos evalúa
                    cada moneda por separado.
                  </span>
                  <span className="mt-1 block">
                    Si la máquina recibe una moneda y entrega otra (cambio divisa), las transacciones aprobadas registran lo que ENTRA al
                    aceptador (AP): «Σ devuelto» no mide el dispensador (DP). La verificación del cuadre se hace entonces por moneda con el
                    detalle por denominación, y cuando ese detalle no está completo el panel lo declara en vez de acusar un descuadre.
                  </span>
                  {arqueoByCurrencyNote ? <span className="mt-1 block">{arqueoByCurrencyNote}.</span> : null}
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
            {/* VERIFICACIÓN: lo que el sistema registró contra el cuadre físico, POR MONEDA y
                declarando el origen de la cifra (detalle por denominación = lado DP real, o
                `Σ devuelto`, que sólo es admisible con una moneda). */}
            {check && !verificationPending ? (
              <ReconciliationCheckAlert
                baseAtIso={baseAtIso}
                check={check}
                lastLoadAt={metrics?.lastLoad.at ?? null}
                rangeLabel={rangeLabel}
              />
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
              tonnageError ? (
                <Alert variant="warning">
                  <TriangleAlert aria-hidden="true" className="size-4" />
                  <AlertTitle>No se pudo leer el historial de arqueos</AlertTitle>
                  <AlertDescription>
                    La lectura de arqueos de esta máquina falló ({tonnageError.message}). Sin ella no hay base física, pero eso NO significa
                    que la máquina nunca se haya arqueado: reintenta la lectura y, si sigue fallando, revisa «Cargues y arqueos» en la ficha
                    del Pay+.
                  </AlertDescription>
                  <Button className="mt-2" onClick={metricsQuery.refetchAll} size="sm" type="button" variant="outline">
                    <RefreshCw aria-hidden="true" className="size-3.5" />
                    Reintentar lecturas
                  </Button>
                </Alert>
              ) : (arqueoHistory?.count ?? 0) > 0 ? (
                <Alert variant="warning">
                  <TriangleAlert aria-hidden="true" className="size-4" />
                  <AlertTitle>Los arqueos leídos no sirven como base</AlertTitle>
                  <AlertDescription>
                    El API devolvió {arqueoHistory?.count} arqueo{arqueoHistory?.count === 1 ? "" : "s"} para esta máquina, pero{" "}
                    {arqueoHistory?.withoutDate === arqueoHistory?.count
                      ? "ninguno trae fecha utilizable"
                      : `${arqueoHistory?.withoutDate} sin fecha utilizable`}
                    : el cuadre físico no puede partir de ellos y la tabla muestra el inventario actual como referencia. Compáralo en
                    «Cargues y arqueos»: un arqueo sin fecha no permite calcular la salida física (DP).
                  </AlertDescription>
                  <Button className="mt-2" onClick={metricsQuery.refetchAll} size="sm" type="button" variant="outline">
                    <RefreshCw aria-hidden="true" className="size-3.5" />
                    Reintentar lecturas
                  </Button>
                </Alert>
              ) : (
                <Alert variant="warning">
                  <TriangleAlert aria-hidden="true" className="size-4" />
                  <AlertTitle>Sin arqueo base</AlertTitle>
                  <AlertDescription>
                    El historial de arqueos que consulta el panel (api/Tonnage/GetByPaypad) no devolvió registros para esta máquina
                    {machineIdentity ? ` (${machineIdentity.join(" · ")})` : ""}: con lo que hay, la salida física (DP) no es calculable y la
                    tabla muestra el inventario actual como referencia. Si en «Cargues y arqueos» sí aparecen arqueos, el problema es de
                    lectura del API, no del cuadre: reintenta y repórtalo. Si de verdad no hay ninguno, registra un arqueo en Pay+ → Arquear
                    para activar el cuadre completo.
                  </AlertDescription>
                  <Button className="mt-2" onClick={metricsQuery.refetchAll} size="sm" type="button" variant="outline">
                    <RefreshCw aria-hidden="true" className="size-3.5" />
                    Reintentar lecturas
                  </Button>
                </Alert>
              )
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={CircleCheck}
                label="AP · Aprobadas del período"
                loading={metricsQuery.isLoading && metrics === null}
                subtitle={`${metrics?.ap.count ?? 0} transacción${(metrics?.ap.count ?? 0) === 1 ? "" : "es"}${metrics?.apPhysical.at ? ` · Base: ${formatDashboardMoney(metrics.apPhysical.total ?? "0")}` : " · Sin arqueo base"} · Aceptadores hoy: ${metrics ? formatDashboardMoney(metrics.apPhysical.currentTotal) : "—"}${mixedCurrencyNote}${acceptorByCurrencyNote}`}
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
                        loadedByCurrencyNote,
                        dispensedByCurrencyNote,
                        storageByCurrencyNote,
                      ]
                        .filter((part) => part.length > 0)
                        .join(" · ")
                    : null
                }
                tone="system"
                value={dpValue}
              />
              <MetricCard
                icon={XCircle}
                label="RJ · Aprobada Error Devuelta"
                loading={metricsQuery.isLoading && metrics === null}
                subtitle={`${metrics?.rj.count ?? 0} transacción${(metrics?.rj.count ?? 0) === 1 ? "" : "es"} · Baúl rechazo hoy: ${metrics ? formatDashboardMoney(metrics.rj.currentTotal) : "—"}${metrics?.rj.physicalTotal ? ` (base: ${formatDashboardMoney(metrics.rj.physicalTotal)})` : ""}${mixedCurrencyNote}${rejectionByCurrencyNote}`}
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
              arqueoHistory={arqueoHistory}
              baseAt={metrics?.reconciliation.baseAt ?? null}
              baseSelfCheck={metrics?.reconciliation.baseSelfCheck ?? null}
              denominations={metricsQuery.denominations}
              excludedRows={metrics?.excludedRows ?? []}
              hasBase={metrics?.reconciliation.hasBase ?? false}
              identityByCurrency={metrics?.identityByCurrency ?? []}
              lastLoadAt={metrics?.lastLoad.at ?? null}
              loading={metricsQuery.isLoading && metrics === null}
              nowMs={metricsQuery.now.getTime()}
              onRefresh={metricsQuery.refetchAll}
              rangeLabel={rangeLabel}
              snapshotReadAtMs={snapshotReadAtMs}
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

            <PayoutReconciliationSection
              data={payoutReconciliation}
              loading={jamScanRequest !== null && jamScanQuery.isPending}
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
