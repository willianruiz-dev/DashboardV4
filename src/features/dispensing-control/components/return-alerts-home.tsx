"use client";

import { BellRing, CircleCheck, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { buildReturnAlertsRequestForDay, useDispensingReturnAlerts, useNow } from "@/features/dispensing-control/hooks";
import { RETURNED_ERROR_STATE } from "@/features/dispensing-control/dispensing-jams";
import { RETURN_ALERTS_REFRESH_MS, type ReturnAlertMachine } from "@/features/dispensing-control/schemas";
import { formatElapsed } from "@/features/dispensing-control/dispensing-metrics";
import { formatDashboardMoney } from "@/lib/formatters/money";

/**
 * Alerta del inicio, por máquina y del **día actual**, con sondeo periódico (no existe
 * contrato realtime en el backend legado, ver B-01). Se alimenta del BFF
 * `/api/dispensing/return-alerts`, que resuelve todas las máquinas server-side con caché
 * corta y concurrencia limitada. Trae dos cosas:
 *
 *  1. Errores de devuelta (`Aprobada Error Devuelta`) del día.
 *  2. Semáforo de «posible atasco»: módulos con saldo que no bajaron en el arqueo mientras el
 *     cambio salió por otras denominaciones (caso real Pay+ Inder 2, que sólo entrega monedas
 *     de 100 y no genera ningún error). El semáforo no usa el detalle de cada transacción; por
 *     eso el texto remite al análisis completo del control de dispensado.
 *
 * Cuando el conteo de una máquina sube entre dos vueltas del sondeo se emite un aviso
 * emergente: es la alerta «por encima de todo» sin salir del inicio.
 */
export function ReturnAlertsHomeSection() {
  const session = useDashboardSession();
  const canReadTransactions = hasPermission(session, "ReadTransactions");
  const canReadPaypads = hasPermission(session, "ReadPayPads");
  const enabled = canReadTransactions && canReadPaypads;

  const now = useNow(RETURN_ALERTS_REFRESH_MS);
  // La clave del rango es el día local: el rango 00:00 → 23:59 solo se recalcula
  // si la página sigue abierta al pasar la medianoche.
  const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const request = useMemo(() => buildReturnAlertsRequestForDay(dayKey), [dayKey]);
  const alertsQuery = useDispensingReturnAlerts(request, enabled);

  const machines = useMemo(() => alertsQuery.data?.machines ?? [], [alertsQuery.data]);
  const withErrors = machines.filter((machine) => machine.errorCount > 0);
  const totalErrors = withErrors.reduce((total, machine) => total + machine.errorCount, 0);
  // Tarjetas del MOTOR (mismo texto que el panel de control de dispensado) y alerta temprana
  // (semáforo por arqueo) para las máquinas que aún no tienen veredicto del motor.
  const withVerdicts = machines.filter((machine) => (machine.jamVerdict?.incidents.length ?? 0) > 0);
  const verdictCount = withVerdicts.reduce((total, machine) => total + (machine.jamVerdict?.incidents.length ?? 0), 0);
  const withJams = machines.filter(
    (machine) => (machine.jamVerdict?.incidents.length ?? 0) === 0 && (machine.jamScreen?.warnings.length ?? 0) > 0,
  );
  const totalJams = withJams.reduce((total, machine) => total + (machine.jamScreen?.warnings.length ?? 0), 0);
  const previousCounts = useRef<Map<number, number> | null>(null);
  // Valor: las denominaciones ya avisadas por máquina («|» = separador), para no repetir el aviso.
  const previousJams = useRef<Map<number, string> | null>(null);

  // Aviso emergente cuando aparece un error NUEVO mientras la página está abierta.
  useEffect(() => {
    if (alertsQuery.data === undefined) {
      return;
    }

    const current = new Map(machines.map((machine) => [machine.paypadId, machine.errorCount]));
    const previous = previousCounts.current;
    previousCounts.current = current;
    if (previous === null) {
      return;
    }

    for (const machine of machines) {
      const before = previous.get(machine.paypadId) ?? 0;
      if (machine.errorCount > before) {
        const difference = machine.errorCount - before;
        const amount = machine.errorTotalMixedCurrency
          ? `importe en varias monedas${machine.currencyLabels.length > 0 ? ` (${machine.currencyLabels.join(", ")})` : ""}`
          : formatDashboardMoney(machine.errorTotal);
        toast.warning(`${machine.paypadName}: ${difference} error(es) de devuelta`, {
          description: `${machine.errorCount} en total hoy · ${amount}. Revisa el control de dispensado.`,
          duration: 10_000,
        });
      }
    }
  }, [alertsQuery.data, machines]);

  // Aviso emergente cuando aparece un «posible atasco» NUEVO. El texto es el del motor cuando
  // ya hay veredicto (mismo diagnóstico del panel) y el del semáforo cuando es alerta temprana.
  useEffect(() => {
    if (alertsQuery.data === undefined) {
      return;
    }

    const current = new Map(
      machines.map((machine) => {
        const keys = (machine.jamVerdict?.incidents ?? []).map(
          (incident) => `${incident.level}:${incident.denominationValue ?? incident.title}`,
        );
        if (keys.length === 0) {
          keys.push(...(machine.jamScreen?.warnings ?? []).map((warning) => `temprana:${warning.denominationValue}`));
        }
        return [machine.paypadId, keys.join("|")];
      }),
    );
    const previous = previousJams.current;
    previousJams.current = current;
    if (previous === null) {
      return;
    }

    for (const machine of machines) {
      const known = new Set((previous.get(machine.paypadId) ?? "").split("|").filter((value) => value.length > 0));
      const freshVerdicts = (machine.jamVerdict?.incidents ?? []).filter(
        (incident) => !known.has(`${incident.level}:${incident.denominationValue ?? incident.title}`),
      );
      const freshWarnings = machine.jamVerdict
        ? []
        : (machine.jamScreen?.warnings ?? []).filter((warning) => !known.has(`temprana:${warning.denominationValue}`));
      const fresh = [
        ...freshVerdicts.map((incident) => incident.title),
        ...freshWarnings.map((warning) => `Posible atasco en la denominación ${warning.denominationValue}`),
      ];
      if (fresh.length === 0) {
        continue;
      }
      toast.warning(`${machine.paypadName}: ${fresh.join(" · ")}`, {
        description: machine.jamVerdict?.headline ?? "Alerta temprana por arqueo: el cambio está saliendo por otras denominaciones.",
        duration: 10_000,
      });
    }
  }, [alertsQuery.data, machines]);

  if (!enabled) {
    return null;
  }

  const generatedAt = alertsQuery.data?.generatedAt ?? null;
  const elapsed = generatedAt === null ? null : Math.max(0, now.getTime() - new Date(generatedAt).getTime());

  return (
    <Card className="animate-rise overflow-hidden">
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <BellRing aria-hidden="true" className="size-4 text-amber-600 dark:text-amber-400" />
              Alertas de hoy · errores de devuelta ({RETURNED_ERROR_STATE}) y posible atasco
            </h2>
            <p className="text-sm text-muted-foreground">
              Se actualiza solo cada {Math.round(RETURN_ALERTS_REFRESH_MS / 1000)} s (solo con esta pestaña visible) y muestra
              únicamente la fecha actual.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {verdictCount > 0 ? (
              <Badge className="gap-1.5" variant="destructive">
                <TriangleAlert aria-hidden="true" className="size-3.5" />
                {verdictCount} atasco{verdictCount === 1 ? "" : "s"} en {withVerdicts.length} máquina
                {withVerdicts.length === 1 ? "" : "s"}
              </Badge>
            ) : null}
            {totalJams > 0 ? (
              <Badge className="gap-1.5" variant="warning">
                <TriangleAlert aria-hidden="true" className="size-3.5" />
                {totalJams} alerta{totalJams === 1 ? "" : "s"} temprana{totalJams === 1 ? "" : "s"} en {withJams.length} máquina
                {withJams.length === 1 ? "" : "s"}
              </Badge>
            ) : null}
            {totalErrors > 0 ? (
              <Badge className="gap-1.5" variant="warning">
                <TriangleAlert aria-hidden="true" className="size-3.5" />
                {totalErrors} en {withErrors.length} máquina{withErrors.length === 1 ? "" : "s"}
              </Badge>
            ) : alertsQuery.isSuccess ? (
              <Badge className="gap-1.5" variant="secondary">
                <CircleCheck aria-hidden="true" className="size-3.5" />
                Sin errores hoy
              </Badge>
            ) : null}
            <Button disabled={alertsQuery.isFetching} onClick={() => void alertsQuery.refetch()} size="sm" type="button" variant="outline">
              {alertsQuery.isFetching ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="size-4" />}
              Actualizar
            </Button>
          </div>
        </div>

        {alertsQuery.isPending ? (
          <div aria-busy="true" aria-label="Consultando errores de devuelta" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : alertsQuery.isError ? (
          <Alert role="alert" variant="destructive">
            <TriangleAlert aria-hidden="true" className="size-4" />
            <AlertTitle>No fue posible consultar los errores de devuelta</AlertTitle>
            <AlertDescription className="grid gap-3">
              <span>{alertsQuery.error instanceof Error ? alertsQuery.error.message : "El servicio no respondió."}</span>
              <div>
                <Button onClick={() => void alertsQuery.refetch()} type="button" variant="outline">
                  Reintentar
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {withVerdicts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {withVerdicts.map((machine) => (
                  <MachineVerdictCard key={machine.paypadId} machine={machine} nowMs={now.getTime()} />
                ))}
              </div>
            ) : null}

            {withJams.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {withJams.map((machine) => (
                  <MachineJamCard key={machine.paypadId} machine={machine} />
                ))}
              </div>
            ) : null}

            {withErrors.length === 0 ? (
              <Alert>
                <CircleCheck aria-hidden="true" className="size-4" />
                <AlertTitle>Ninguna máquina registra errores de devuelta hoy</AlertTitle>
                <AlertDescription>
                  Se consultaron {machines.length} máquina{machines.length === 1 ? "" : "s"} del día en curso.
                  {withJams.length > 0
                    ? " El semáforo de atascos sí encontró evidencia: revisa las tarjetas de arriba."
                    : ""}
                  {alertsQuery.data && alertsQuery.data.partialFailures > 0
                    ? ` ${alertsQuery.data.partialFailures} máquina(s) no respondieron en esta vuelta.`
                    : ""}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {withErrors.map((machine) => (
                  <MachineAlertCard key={machine.paypadId} machine={machine} nowMs={now.getTime()} />
                ))}
              </div>
            )}
          </>
        )}

        <p className="text-xs text-muted-foreground">
          {alertsQuery.isSuccess && elapsed !== null
            ? `Última consulta: hace ${formatElapsed(elapsed)}${generatedAt ? ` (${new Date(generatedAt).toLocaleTimeString("es-CO")})` : ""}. `
            : ""}
          Fuente: transacciones del día en curso por máquina, filtradas por estado «{RETURNED_ERROR_STATE}». El veredicto de
          atasco es el MISMO motor del control de dispensado («Transaction/{"{id}"}/Details», «PayPad/GetStorage»,
          «Tonnage/GetByPaypad», «Load/GetByPaypad»), calculado en el servidor y reutilizado 10 min; se analiza una máquina
          por vuelta en segundo plano, así que puede tardar unas vueltas en aparecer. Mientras no haya veredicto, la alerta
          temprana compara los arqueos del día con los pagos. Al abrir una tarjeta se consulta esa máquina en el panel.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Veredicto del motor: el mismo diagnóstico del panel de control de dispensado (título, detalle,
 * evidencia y acción sugerida), con su momento de cálculo. Aparece cuando el barrido del inicio
 * ya analizó la máquina.
 */
function MachineVerdictCard({ machine, nowMs }: { machine: ReturnAlertMachine; nowMs: number }) {
  const verdict = machine.jamVerdict;
  if (verdict === null || verdict.incidents.length === 0) {
    return null;
  }

  const href = `/dashboard/transactions/dispensing-control?paypad=${machine.paypadId}`;
  const levelLabel: Record<string, string> = {
    confirmado: "Atasco confirmado",
    probable: "Atasco probable",
    sospecha: "Posible atasco",
    sin_evidencia: "Sin evidencia",
  };
  const primaryLevel = verdict.level ?? verdict.incidents[0]?.level ?? "sospecha";
  const analyzedElapsed = Math.max(0, nowMs - new Date(verdict.analyzedAt).getTime());

  return (
    <Link
      className="grid gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift dark:border-destructive/40 dark:bg-destructive/10"
      href={href}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" title={machine.paypadName}>{machine.paypadName}</p>
          <p className="text-xs text-muted-foreground">ID {machine.paypadId}</p>
        </div>
        <Badge className="gap-1.5" variant={primaryLevel === "sospecha" ? "warning" : "destructive"}>
          <TriangleAlert aria-hidden="true" className="size-3.5" />
          {levelLabel[primaryLevel] ?? primaryLevel}
        </Badge>
      </div>

      <p className="text-sm font-semibold text-destructive dark:text-red-300">{verdict.headline}</p>

      {verdict.incidents.slice(0, 2).map((incident) => (
        <div className="grid gap-0.5" key={`${incident.denominationValue ?? incident.title}-${incident.level}`}>
          <p className="text-xs font-medium">{incident.title}</p>
          <p className="text-xs text-muted-foreground">{incident.detail}</p>
          {incident.evidence.length === 0 ? null : (
            <ul className="ml-4 list-disc text-xs text-muted-foreground">
              {incident.evidence.slice(0, 2).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <p className="text-xs text-muted-foreground">
        Motor: {verdict.analyzedTransactions} transacción(es) y {verdict.payouts} pago(s) analizados hace{" "}
        {formatElapsed(analyzedElapsed)}
        {verdict.truncated ? " · análisis truncado (hay movimientos fuera de la ventana)" : ""}
        {verdict.blind ? " · el detalle no respondió: diagnóstico incompleto" : ""}.
      </p>
      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Confirmar en el control de dispensado →</span>
    </Link>
  );
}

/**
 * Ventana de arqueos legible. Con sólo la hora, un intervalo que cruza de medianoche se ve
 * invertido («11:30:47 a. m. → 10:21:56 a. m.»); con la fecha por delante se lee correcto.
 */
function formatArqueoWindow(fromIso: string, toIso: string): string {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return `${fromIso} → ${toIso}`;
  }

  const sameDay =
    from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth() && from.getDate() === to.getDate();
  if (sameDay) {
    return `${from.toLocaleTimeString("es-CO")} → ${to.toLocaleTimeString("es-CO")}`;
  }

  const compact = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
  });
  return `${compact.format(from)} → ${compact.format(to)}`;
}

/**
 * Explicación del movimiento de un módulo. El número que importa es el NETO (descontados los
 * cargues): si la máquina se recargó entre los dos arqueos, la caída bruta puede ser ≤ 0 aunque
 * el módulo haya entregado, y decir sólo «no bajó en el arqueo» produce falsos positivos en las
 * máquinas recién cargadas.
 */
function warningDescription(warning: {
  demand: number;
  grossMovement: number;
  loadedAfterArqueo: number;
  loadedUnits: number;
  netMovement: number;
}): string {
  const units = (value: number) => new Intl.NumberFormat("es-CO").format(value);
  const parts: string[] = [];

  if (warning.loadedUnits > 0) {
    // Una máquina recargada entre los dos arqueos tiene movimiento bruto ≤ 0 aunque haya
    // entregado: lo que decide es el NETO. El texto muestra ambos para que el operador pueda
    // verificarlo contra «Cargues y arqueos» sin tener que confiar en la conclusión.
    parts.push(
      `Se le cargaron ${units(warning.loadedUnits)} unidad(es) entre los arqueos (movimiento bruto ${
        warning.grossMovement > 0 ? "+" : "−"
      }${units(Math.abs(warning.grossMovement))}); con el cargue descontado la caída neta es ${units(warning.netMovement)}, o sea que no entregó ninguna`,
    );
  } else if (warning.grossMovement === 0) {
    parts.push("El baúl quedó igual entre los dos arqueos: no entregó ninguna");
  } else {
    parts.push(`El baúl creció ${units(Math.abs(warning.grossMovement))} unidad(es) entre los arqueos sin cargue registrado: no entregó ninguna`);
  }

  if (warning.loadedAfterArqueo > 0) {
    parts.push(
      `además se le cargaron ${units(warning.loadedAfterArqueo)} unidad(es) después del último arqueo (el saldo mostrado las incluye)`,
    );
  }

  return `${parts.join("; ")}.`;
}

/**
 * Semáforo de atasco: por denominación, el módulo que conserva saldo, no entregó unidades netas
 * en el arqueo (descontados los cargues) y podía usarse en los pagos posteriores al último
 * cargue, mientras el cambio salió por otras denominaciones.
 */
function MachineJamCard({ machine }: { machine: ReturnAlertMachine }) {
  const screen = machine.jamScreen;
  if (screen === null || screen.warnings.length === 0) {
    return null;
  }

  const href = `/dashboard/transactions/dispensing-control?paypad=${machine.paypadId}`;
  // Con sólo la hora, un intervalo que cruza de día se lee al revés («11:30 a. m. → 10:21 a. m.»):
  // cuando los dos arqueos no son del mismo día se muestra la fecha completa.
  const arqueo =
    screen.arqueoFrom === null || screen.arqueoTo === null
      ? null
      : `Arqueos ${formatArqueoWindow(screen.arqueoFrom, screen.arqueoTo)} · ${screen.payouts} pago(s) con devolución${
          screen.loadsKnown ? "" : " · cargues no legibles"
        }`;

  return (
    <Link
      className="grid gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift dark:border-destructive/30 dark:bg-destructive/10"
      href={href}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" title={machine.paypadName}>{machine.paypadName}</p>
          <p className="text-xs text-muted-foreground">ID {machine.paypadId}</p>
        </div>
        <Badge className="gap-1.5" variant="destructive">
          <TriangleAlert aria-hidden="true" className="size-3.5" />
          {screen.warnings.length} posible{screen.warnings.length === 1 ? "" : "s"} atasco{screen.warnings.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="grid gap-2">
        {screen.warnings.map((warning) => (
          <div className="grid gap-0.5" key={warning.denominationValue}>
            <p className="text-sm font-semibold text-destructive dark:text-red-300">
              Denominación {warning.denominationValue}
            </p>
            <p className="text-xs text-muted-foreground">
              {warningDescription(warning)}{" "}
              {warning.demand} pago(s) {warning.loadedUnits > 0 ? "posteriores a ese cargue" : "del período"} podían usarla y el baúl conserva{" "}
              {warning.stock} unidad(es).
              {warning.configuredForDispensing === false ? " Configuración: «No dispensa»." : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              El cambio está saliendo con{" "}
              {warning.compensators.map((compensator) => `${compensator.denominationValue} (${compensator.movement} u. netas)`).join(", ")}.
            </p>
          </div>
        ))}
      </div>

      {arqueo === null ? null : <p className="text-xs text-muted-foreground">{arqueo}</p>}
      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Analizar en el control de dispensado →</span>
    </Link>
  );
}

function MachineAlertCard({ machine, nowMs }: { machine: ReturnAlertMachine; nowMs: number }) {
  // `nowMs` viene del reloj del componente (useNow) para no leer la hora durante el render.
  const lastErrorElapsed = machine.lastErrorAt === null ? null : Math.max(0, nowMs - new Date(machine.lastErrorAt).getTime());
  const href = `/dashboard/transactions/dispensing-control?paypad=${machine.paypadId}`;

  return (
    <Link
      className="grid gap-2 rounded-lg border border-amber-200/80 bg-amber-50/50 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift dark:border-amber-500/25 dark:bg-amber-500/5"
      href={href}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" title={machine.paypadName}>{machine.paypadName}</p>
          <p className="text-xs text-muted-foreground">ID {machine.paypadId}</p>
        </div>
        <Badge className="gap-1.5" variant="warning">
          <TriangleAlert aria-hidden="true" className="size-3.5" />
          {machine.errorCount}
        </Badge>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {/* Una máquina puede operar COP y USD (cambio divisa): sumar sus importes daría un
            número no comparable, así que en ese caso se declara en lugar de mostrarlo. */}
        {machine.errorTotalMixedCurrency ? (
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            Importe en varias monedas{machine.currencyLabels.length > 0 ? ` (${machine.currencyLabels.join(", ")})` : ""}
          </span>
        ) : (
          <span className="font-numeric text-lg font-semibold text-amber-700 dark:text-amber-300">
            {formatDashboardMoney(machine.errorTotal)}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {machine.transactions} transacción(es) hoy
          {machine.errorTotalIncomplete && !machine.errorTotalMixedCurrency ? " · importe parcial (hay importes ilegibles)" : ""}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {lastErrorElapsed === null
          ? "Sin marca de tiempo del último error."
          : `Último error: hace ${formatElapsed(lastErrorElapsed)}`}
      </p>
      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Ver control de dispensado →</span>
    </Link>
  );
}
