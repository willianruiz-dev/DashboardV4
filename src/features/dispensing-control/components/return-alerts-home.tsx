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
 * Alerta del inicio: errores de devuelta (`Aprobada Error Devuelta`) del **día actual**,
 * por máquina, con sondeo periódico (no existe contrato realtime en el backend legado,
 * ver B-01). Se alimenta del BFF `/api/dispensing/return-alerts`, que resuelve todas las
 * máquinas server-side con caché corta y concurrencia limitada.
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
  const previousCounts = useRef<Map<number, number> | null>(null);

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
              Errores de devuelta de hoy · {RETURNED_ERROR_STATE}
            </h2>
            <p className="text-sm text-muted-foreground">
              Se actualiza solo cada {Math.round(RETURN_ALERTS_REFRESH_MS / 1000)} s (solo con esta pestaña visible) y muestra
              únicamente la fecha actual.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
        ) : withErrors.length === 0 ? (
          <Alert>
            <CircleCheck aria-hidden="true" className="size-4" />
            <AlertTitle>Ninguna máquina registra errores de devuelta hoy</AlertTitle>
            <AlertDescription>
              Se consultaron {machines.length} máquina{machines.length === 1 ? "" : "s"} del día en curso.
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

        <p className="text-xs text-muted-foreground">
          {alertsQuery.isSuccess && elapsed !== null
            ? `Última consulta: hace ${formatElapsed(elapsed)}${generatedAt ? ` (${new Date(generatedAt).toLocaleTimeString("es-CO")})` : ""}. `
            : ""}
          Fuente: transacciones del día en curso por máquina, filtradas por estado «{RETURNED_ERROR_STATE}». Al abrir una tarjeta se
          consulta esa máquina en el control de dispensado.
        </p>
      </CardContent>
    </Card>
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
