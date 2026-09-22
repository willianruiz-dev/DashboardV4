"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { Fragment } from "react";

import { BackendStaticImage } from "@/components/shared/backend-static-image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CurrencyDenomination } from "@/features/denominations/schemas";
import type {
  DispensingArqueoHistory,
  DispensingBaseSelfCheck,
  DispensingCurrencyIdentity,
  DispensingCurrencyTotal,
  DispensingDenominationRow,
} from "@/features/dispensing-control/dispensing-metrics";
import { formatElapsed, LOW_BALANCE_TOLERANCE } from "@/features/dispensing-control/dispensing-metrics";
import { DISPENSING_STORAGE_STALE_MS } from "@/features/dispensing-control/schemas";
import { backendStaticFilePath } from "@/lib/files/backend-static-path";
import { formatDashboardDateTime } from "@/lib/formatters/date";
import { formatDashboardMoney } from "@/lib/formatters/money";
import { cn } from "@/lib/utils";

interface LowBalanceAlertProps {
  balance: number;
  minDpQuantity: number;
}

/** Alerta de fila: baúl agotándose (saldo por debajo del umbral configurado). */
export function LowBalanceAlert({ balance, minDpQuantity }: LowBalanceAlertProps) {
  return (
    <Alert variant="warning" className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 shadow-none">
      <span className="flex items-center gap-2">
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
        <AlertTitle>Baúl agotándose</AlertTitle>
      </span>
      <AlertDescription>
        Saldo de {balance} unidades · umbral {minDpQuantity + LOW_BALANCE_TOLERANCE}. Programar cargue o revisar el inventario del dispensador.
      </AlertDescription>
    </Alert>
  );
}

interface DenominationTableProps {
  /**
   * Lo que se LLEYÓ del historial de arqueos (nº de arqueos, id del base, arqueos sin fecha).
   * Sirve para que «arqueo base» sea verificable contra «Cargues y arqueos» en vez de un dato
   * sin origen visible.
   */
  arqueoHistory?: DispensingArqueoHistory | null;
  /** Fecha del arqueo base (`null` = sin arqueo base utilizable). */
  baseAt?: string | null;
  /** Totales valorizados del cuadre del período (por moneda cuando hay varias). */
  totals: { dispensed: string; loaded: string; rejected: string; storage: string };
  /** Validación del arqueo base contra sus propios totales (null = no comparable). */
  baseSelfCheck?: DispensingBaseSelfCheck | null;
  denominations: readonly CurrencyDenomination[];
  /** Filas del storage que no son inventario en uso: se explican, no se ocultan. */
  excludedRows?: readonly DispensingDenominationRow[];
  hasBase?: boolean;
  /**
   * Identidad del cuadre POR MONEDA. En una máquina multimoneda la suma de las cuatro
   * columnas mezcla pesos y dólares: cada moneda cierra por separado (y sólo si tuvo cargue).
   */
  identityByCurrency?: readonly DispensingCurrencyIdentity[];
  /** Fecha del último cargue (`null` = sin cargues: sin cuadre desde el cargue). */
  lastLoadAt?: string | null;
  loading?: boolean;
  /** Reloj actual (ms epoch) para decir hace cuánto se leyó el baúl. */
  nowMs?: number | null;
  /** Refresca el snapshot del baúl (storage) sin recargar la página. */
  onRefresh?: (() => void) | null;
  /** Momento (ms epoch) en que el tablero leyó el baúl; `null` = lectura no disponible. */
  snapshotReadAtMs?: number | null;
  rangeLabel: string;
  rows: readonly DispensingDenominationRow[];
  /** Inventario por moneda: sólo se usa para advertir que los totales no se suman. */
  totalsByCurrency?: readonly DispensingCurrencyTotal[];
}

function denominationImage(denominations: readonly CurrencyDenomination[], row: DispensingDenominationRow): { alt: string; img: string | null; value: string } {
  const meta = denominations.find((item) => item.id === row.denominationId);
  const value = meta?.value?.trim() || row.denominationValue;
  return { alt: `Billete de ${formatDashboardMoney(value)}`, img: meta?.img ?? null, value };
}

function rejectionDeltaText(delta: number | null): string | null {
  if (delta === null) {
    return null;
  }
  if (delta === 0) {
    return "sin cambio desde la base";
  }
  if (delta < 0) {
    // El baúl se vació después del arqueo: esas unidades salieron por mantenimiento o extracción,
    // no por el dispensador, y por eso no entran al dispensado del período.
    return `${delta} desde la base (baúl vaciado: no cuenta como dispensado)`;
  }
  return `+${delta} desde la base`;
}

/** El cuadre del período, visible: cargado − en dispensadores hoy − rechazado. */
function dispensedEquation(row: DispensingDenominationRow): string {
  const rejectPart = row.rejectedInPeriod;
  return rejectPart > 0
    ? `${row.loadedInPeriod} − ${row.balance} − ${rejectPart}`
    : `${row.loadedInPeriod} − ${row.balance}`;
}

function dispensedExplanation(row: DispensingDenominationRow): string {
  const rejectPart = row.rejectedInPeriod;
  const closing = `${row.dispensedInPeriod ?? 0} dispensados + ${rejectPart} rechazados + ${row.balance} en el dispensador = ${row.loadedInPeriod} cargados`;
  const reference =
    row.stockAtPeriodStart !== null && row.stockAtPeriodStart > 0
      ? ` OJO: el arqueo al inicio del período reportaba ${row.stockAtPeriodStart} unidad(es) en el baúl; si esas unidades se entregaron a clientes, el dispensado real sería mayor (${row.dispensedFromArqueo ?? "—"} contando el inventario previo).`
      : "";
  return `Dispensado en el período = cargado − en dispensadores hoy − rechazado = ${row.dispensedInPeriod ?? 0}. Cierra: ${closing}.${reference}`;
}

/** Trazabilidad de la columna «Cargada»: cargues con fecha y cantidad. */
/** Importe de `unidades × valor de la denominación`. */
function unitsValue(denominationValue: string, units: number): string {
  const value = Number(denominationValue);
  return Number.isFinite(value) ? String(value * units) : "0";
}

function loadsTraceText(row: DispensingDenominationRow): string | undefined {
  if (row.loadsSinceBaseTrace.length === 0) {
    return undefined;
  }

  const detail = row.loadsSinceBaseTrace
    .map((entry) => `${entry.at ? formatDashboardDateTime(entry.at) : "sin fecha"} (${entry.quantity})`)
    .join(" · ");
  return `Cargues desde el arqueo base: ${detail}`;
}

function loadsTraceCaption(row: DispensingDenominationRow): string | null {
  const { length } = row.loadsSinceBaseTrace;
  if (length === 0) {
    return null;
  }
  if (length === 1) {
    return row.loadsSinceBaseTrace[0]?.at ? formatDashboardDateTime(row.loadsSinceBaseTrace[0].at) : null;
  }
  return `${length} cargues`;
}

export function DenominationTable({
  arqueoHistory = null,
  baseAt = null,
  baseSelfCheck = null,
  denominations,
  excludedRows = [],
  hasBase = true,
  identityByCurrency = [],
  lastLoadAt = null,
  loading = false,
  nowMs = null,
  onRefresh = null,
  rangeLabel,
  rows,
  snapshotReadAtMs = null,
  totals,
  totalsByCurrency = [],
}: DenominationTableProps) {
  const { dispensed: dispensedTotal, loaded: loadedTotal, rejected: rejectedTotal, storage: storageTotal } = totals;
  const lowRows = rows.filter((row) => row.low);
  const shortageRows = rows.filter((row) => row.shortage);
  // Máquina de cambio divisa: los importes de monedas distintas no se suman entre sí.
  const multiCurrency = rows.some((row) => row.currencyId !== (rows[0]?.currencyId ?? null));
  // Frescura del snapshot: el cuadre entero (dispensado = cargado − en dispensadores −
  // rechazado) sale de la misma lectura del baúl. Sin decirlo, dos pantallas que leen el
  // mismo API en momentos distintos parecen contradecirse.
  const snapshotElapsedMs =
    snapshotReadAtMs === null || nowMs === null ? null : Math.max(0, nowMs - snapshotReadAtMs);
  const snapshotStale = snapshotElapsedMs !== null && snapshotElapsedMs > DISPENSING_STORAGE_STALE_MS;
  const snapshotText =
    snapshotElapsedMs === null
      ? null
      : snapshotStale
        ? `Lectura del baúl: hace ${formatElapsed(snapshotElapsedMs)} · puede no coincidir con la máquina (actualiza la lectura antes de arquear)`
        : `Lectura del baúl: hace ${formatElapsed(snapshotElapsedMs)}`;

  return (
    <Card className="animate-rise overflow-hidden p-0">
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Desglose por denominaciones</h2>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Cargado = dispensado + rechazado + en dispensadores</span>. El período ({rangeLabel})
              manda el «Cargado»; «En dispensadores» es lo que la máquina reportó en la última lectura del tablero y «Rechazado» lo que quedó en el
              baúl de rechazo
              {lastLoadAt ? ` (último cargue: ${formatDashboardDateTime(lastLoadAt)})` : ""}.
              {hasBase ? (
                <>
                  {" "}Arqueo base: {arqueoHistory?.baseId ? `#${arqueoHistory.baseId}` : "no identificado"} del {formatDashboardDateTime(baseAt)}
                  {arqueoHistory && arqueoHistory.count > 0
                    ? ` (${arqueoHistory.count} arqueo${arqueoHistory.count === 1 ? "" : "s"} del historial de esta máquina)`
                    : ""}
                  {arqueoHistory && arqueoHistory.withoutDate > 0
                    ? `; ${arqueoHistory.withoutDate} sin fecha utilizable quedaron fuera`
                    : ""}
                  .
                </>
              ) : (
                " Sin arqueo de apertura, el inventario previo no es auditable: registra un arqueo antes de cargar."
              )}
              {multiCurrency ? " Cada baúl indica su moneda: los importes de monedas distintas no se suman." : ""}
            </p>
            {multiCurrency && totalsByCurrency.length > 1 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Inventario por moneda:{" "}
                {totalsByCurrency
                  .map((entry) => `${entry.label ?? "Moneda no declarada"} ${formatDashboardMoney(entry.total)}`)
                  .join(" · ")}
              </p>
            ) : null}
            {/* Validación del punto de partida: un arqueo cuyos detalles no explican sus
                totales produce un cuadre que nunca va a cuadrar. Se declara aquí. */}
            {hasBase && baseSelfCheck ? (
              <p className={cn("mt-1 text-xs", baseSelfCheck.matches ? "text-muted-foreground" : "text-amber-600 dark:text-amber-400")}>
                {baseSelfCheck.matches ? (
                  <>
                    Arqueo base verificado contra sus propios totales: sus detalles suman {formatDashboardMoney(baseSelfCheck.details.dp)} en
                    dispensadores y {formatDashboardMoney(baseSelfCheck.details.rj)} en rechazo.
                  </>
                ) : (
                  <>
                    El arqueo base no cuadra consigo mismo: sus detalles suman {formatDashboardMoney(baseSelfCheck.details.dp)} en dispensadores y{" "}
                    {formatDashboardMoney(baseSelfCheck.details.rj)} en rechazo, pero el arqueo declara {formatDashboardMoney(baseSelfCheck.declared.dp)}{" "}
                    en dispensadores y {formatDashboardMoney(baseSelfCheck.declared.rj)} en rechazo. Compáralo en «Cargues y arqueos»: el cuadre
                    físico usa los detalles por denominación, así que una base inconsistente explica cualquier descuadre posterior.
                  </>
                )}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onRefresh ? (
              <Button
                onClick={onRefresh}
                size="sm"
                title="Vuelve a leer el baúl (dispensadores, aceptador y rechazo) en el API y rehace el cuadre."
                type="button"
                variant="ghost"
              >
                <RefreshCw aria-hidden="true" className="size-3.5" />
                Actualizar lectura
              </Button>
            ) : null}
            {shortageRows.length > 0 ? (
              <Badge variant="destructive" className="gap-1.5" title="El conteo físico subió desde la base: posible cargue sin registrar o descuadre previo.">
                <TriangleAlert aria-hidden="true" className="size-3.5" />
                {shortageRows.length} conteo{shortageRows.length === 1 ? "" : "s"} por encima de la base
              </Badge>
            ) : null}
            {lowRows.length > 0 ? (
              <Badge variant="warning" className="gap-1.5">
                <TriangleAlert aria-hidden="true" className="size-3.5" />
                {lowRows.length} denominación{lowRows.length === 1 ? "" : "es"} por debajo del umbral
              </Badge>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div aria-busy="true" aria-label="Cargando denominaciones" className="grid gap-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {excludedRows.length > 0
              ? "Ninguna denominación de esta máquina está en uso con los datos actuales: revisa abajo las que quedaron fuera y por qué."
              : "Esta máquina aún no tiene denominaciones configuradas (módulo Pay+ → Configurar denominaciones)."}
          </p>
        ) : (
          <>
            {/* El cuadre del período, valorizado: cargado = dispensado + rechazado + en
                dispensadores. Cada columna se puede auditar por separado. */}
            <div className="grid gap-1 rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/40 sm:grid-cols-4">
              <div title="Cargues registrados dentro del período consultado (api/Load/GetByPaypad, campo totalLoaded sumado del período).">
                <p className="text-xs text-muted-foreground">Cargado ({rangeLabel})</p>
                <p className="font-numeric font-semibold text-blue-600 dark:text-blue-400">{formatDashboardMoney(loadedTotal)}</p>
              </div>
              <div title="Calculado en vivo: cargado − en dispensadores hoy − rechazado del período (no está almacenado en ninguna parte).">
                <p className="text-xs text-muted-foreground">Dispensado (clientes)</p>
                <p className="font-numeric font-semibold text-emerald-600 dark:text-emerald-400">{formatDashboardMoney(dispensedTotal)}</p>
              </div>
              <div title="Baúl de rechazo reportado por la máquina HOY (api/PayPad/GetStorage, rjStored) menos lo que había al inicio del período.">
                <p className="text-xs text-muted-foreground">Rechazado</p>
                <p className="font-numeric font-semibold text-red-500 dark:text-red-400">{formatDashboardMoney(rejectedTotal)}</p>
              </div>
              <div title="Saldo del dispensador que la máquina reportó en la última lectura (api/PayPad/GetStorage, dpStored). El mismo API que lee el diálogo «Realizar arqueo»: si allí aparecen otras unidades, esa lectura es de otro momento.">
                <p className="text-xs text-muted-foreground">En dispensadores (reportado por la máquina)</p>
                <p className="font-numeric font-semibold">{formatDashboardMoney(storageTotal)}</p>
                {snapshotText ? (
                  <p className={cn("text-xs", snapshotStale ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>{snapshotText}</p>
                ) : null}
              </div>
              {multiCurrency && identityByCurrency.length > 0 ? (
                /* Una máquina multimoneda no cierra en agregado: cierra POR MONEDA. */
                <div className="grid gap-1 sm:col-span-4">
                  {identityByCurrency.map((entry) => (
                    <p className="text-xs text-muted-foreground" key={entry.currencyId === null ? "none" : String(entry.currencyId)}>
                      <strong className="text-foreground">{entry.label ?? "Moneda no declarada"}</strong>
                      {entry.hasLoad ? (
                        <>
                          : {formatDashboardMoney(entry.dispensed)} dispensados + {formatDashboardMoney(entry.rejected)} rechazados +{" "}
                          {formatDashboardMoney(entry.storage)} en dispensadores = {formatDashboardMoney(entry.loaded)} cargados.
                        </>
                      ) : (
                        <>
                          : sin cargues de esta moneda en el período, así que no hay dispensado que despejar (en dispensadores hoy{" "}
                          {formatDashboardMoney(entry.storage)}).
                        </>
                      )}
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Los totales de arriba ({formatDashboardMoney(loadedTotal)} cargados, {formatDashboardMoney(dispensedTotal)} dispensados)
                    suman monedas distintas: son referencia, no una cifra comparable.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground sm:col-span-4">
                  Cierra: {formatDashboardMoney(dispensedTotal)} + {formatDashboardMoney(rejectedTotal)} + {formatDashboardMoney(storageTotal)} ={" "}
                  {formatDashboardMoney(loadedTotal)} cargados.
                </p>
              )}
              <p className="text-xs text-muted-foreground sm:col-span-4">
                Origen de los datos: cargues <span className="font-mono">api/Load/GetByPaypad</span> · baúles de dispensadores y rechazo{" "}
                <span className="font-mono">api/PayPad/GetStorage</span> · arqueo de referencia <span className="font-mono">api/Tonnage/GetByPaypad</span> ·
                verificación <span className="font-mono">api/Transaction/GetByDate</span>. El «Dispensado» es el único valor calculado
                (cargado − en dispensadores − rechazado); los demás los entrega el API tal cual.
              </p>
            </div>

            <div className="hidden overflow-hidden rounded-lg border border-slate-200/80 lg:block dark:border-slate-800">
              <Table aria-label="Desglose de denominaciones por baúl">
                <TableHeader>
                  <TableRow>
                    <TableHead>Billete</TableHead>
                    <TableHead className="text-right" title={`Cargues dentro del período consultado (${rangeLabel}).`}>Cargado</TableHead>
                    <TableHead className="text-right" title="Dispensado = cargado − en dispensadores hoy − rechazado.">Dispensado</TableHead>
                    <TableHead className="text-right" title="Baúl de rechazo hoy y su cambio desde el arqueo.">Rechazado (RJ)</TableHead>
                    <TableHead className="text-right" title="Saldo del dispensador que la máquina reportó en la última lectura del tablero (dpStored).">En dispensadores</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const image = denominationImage(denominations, row);
                    const tinted = row.low ? "bg-amber-50/50 dark:bg-amber-500/5" : "";
                    const deltaText = rejectionDeltaText(row.rejectedDelta);
                    return (
                      <Fragment key={row.denominationId}>
                        <TableRow>
                          <TableCell className={cn("align-top", tinted)}>
                            <div className="flex items-center gap-3">
                              <BackendStaticImage
                                alt={image.alt}
                                height={40}
                                src={backendStaticFilePath(image.img)}
                                width={64}
                              />
                              <span className="font-numeric text-sm font-semibold">
                                {row.currencyLabel ? (
                                  <span className="mr-1.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-secondary-foreground">{row.currencyLabel}</span>
                                ) : null}
                                {formatDashboardMoney(image.value)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            <span className="font-numeric font-medium text-blue-600 dark:text-blue-400" title={loadsTraceText(row) ?? "Sin cargues en el período para esta denominación"}>
                              {row.loadedInPeriod}
                            </span>
                            <span className="block text-xs text-muted-foreground">{formatDashboardMoney(unitsValue(row.denominationValue, row.loadedInPeriod))}</span>
                            {loadsTraceCaption(row) ? <span className="block text-xs text-muted-foreground">{loadsTraceCaption(row)}</span> : null}
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            {row.dispensedInPeriod === null ? (
                              <span className="font-numeric text-muted-foreground" title="Sin cargues en el período: el dispensado no es calculable">—</span>
                            ) : (
                              <>
                                <span
                                  className={cn("font-numeric font-semibold", row.dispensedInPeriod < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}
                                  title={dispensedExplanation(row)}
                                >
                                  {row.dispensedInPeriod}
                                </span>
                                <span className="block text-xs text-muted-foreground">{dispensedEquation(row)}</span>
                                <span className="block text-xs text-muted-foreground">{formatDashboardMoney(unitsValue(row.denominationValue, row.dispensedInPeriod))}</span>
                                {row.dispensedInPeriod < 0 ? (
                                  <span className="block text-xs text-red-600 dark:text-red-400">
                                    hay inventario previo sin cargue en el período: revisa el arqueo de inicio
                                  </span>
                                ) : null}
                              </>
                            )}
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            <span className="font-numeric font-medium text-red-500 dark:text-red-400" title="Unidades en el baúl de rechazo hoy.">
                              {row.rejected}
                            </span>
                            <span className="block text-xs text-muted-foreground">{formatDashboardMoney(row.rejectedValue)}</span>
                            {deltaText ? (
                              <span
                                title="Cambio del baúl de rechazo desde el arqueo de referencia: ese dinero salió del dispensador y está descontado del dispensado."
                                className={cn(
                                  "block text-xs",
                                  (row.rejectedDelta ?? 0) > 0
                                    ? "text-red-500 dark:text-red-400"
                                    : (row.rejectedDelta ?? 0) < 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-muted-foreground",
                                )}
                              >
                                {deltaText}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            <span className="font-numeric font-semibold" title="Saldo del dispensador que reporta la máquina (dpStored) en la última lectura del tablero.">
                              {row.balance}
                            </span>
                            <span className="block text-xs text-muted-foreground">{formatDashboardMoney(row.balanceValue)}</span>
                          </TableCell>
                          <TableCell className={cn("align-top", tinted)}>
                            {row.dispensedInPeriod !== null && row.dispensedInPeriod < 0 ? (
                              <Badge
                                title="El baúl tiene más unidades que las cargadas en el período: el inventario previo no viene de un cargue. Registra un arqueo de apertura."
                                variant="destructive"
                                className="gap-1.5"
                              >
                                <TriangleAlert aria-hidden="true" className="size-3.5" />
                                Inventario previo
                              </Badge>
                            ) : row.low ? (
                              <Badge variant="warning" className="gap-1.5">
                                <TriangleAlert aria-hidden="true" className="size-3.5" />
                                Baúl agotándose
                              </Badge>
                            ) : (
                              <Badge title={row.inUseReasons.length > 0 ? `En uso por: ${row.inUseReasons.join(", ")}` : undefined} variant="secondary">
                                OK
                              </Badge>
                            )}
                            {row.foreignCurrency ? (
                              <Badge
                                className="mt-1 flex w-fit"
                                title={`La moneda de este baúl (${row.currencyLabel ?? "no declarada"}) no es la del Pay+${row.inUseReasons.length > 0 ? `. En uso por: ${row.inUseReasons.join(", ")}` : ""}`}
                                variant="outline"
                              >
                                Otra moneda
                              </Badge>
                            ) : null}
                          </TableCell>
                        </TableRow>
                        {row.low ? (
                          <TableRow className="border-b bg-amber-50/40 dark:bg-amber-500/5">
                            <TableCell colSpan={6} className="p-2">
                              <LowBalanceAlert balance={row.balance} minDpQuantity={row.minDpQuantity} />
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Móvil: una card por denominación */}
            <div className="grid gap-3 lg:hidden">
              {rows.map((row) => {
                const image = denominationImage(denominations, row);
                const deltaText = rejectionDeltaText(row.rejectedDelta);
                return (
                  <div className="grid gap-3 rounded-lg border border-slate-200/80 p-4 dark:border-slate-800" key={row.denominationId}>
                    <div className="flex items-center gap-3">
                      <BackendStaticImage alt={image.alt} height={40} src={backendStaticFilePath(image.img)} width={64} />
                      <div className="min-w-0">
                        <p className="font-numeric font-semibold">
                          {row.currencyLabel ? <span className="mr-1 text-xs font-medium text-muted-foreground">{row.currencyLabel}</span> : null}
                          {formatDashboardMoney(image.value)}
                        </p>
                        <p className="text-xs text-muted-foreground">{row.isDispensing ? "Dispensadora" : "No dispensa"}</p>
                      </div>
                      <div className="ml-auto flex flex-col items-end gap-1">
                        {row.dispensedInPeriod !== null && row.dispensedInPeriod < 0 ? (
                          <Badge variant="destructive">Inventario previo</Badge>
                        ) : row.low ? null : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                      </div>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs text-muted-foreground">Cargado</dt>
                        <dd className="font-numeric font-medium text-blue-600 dark:text-blue-400" title={loadsTraceText(row)}>{row.loadedInPeriod}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Dispensado</dt>
                        <dd className={cn("font-numeric font-medium", row.dispensedInPeriod === null ? "text-muted-foreground" : row.dispensedInPeriod < 0 ? "font-semibold text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                          {row.dispensedInPeriod === null ? "—" : row.dispensedInPeriod}
                        </dd>
                        {row.dispensedInPeriod !== null ? <dd className="text-xs text-muted-foreground">{dispensedEquation(row)}</dd> : null}
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Rechazado</dt>
                        <dd className="font-numeric font-medium text-red-500 dark:text-red-400">{row.rejected}</dd>
                        {deltaText ? <dd className="text-xs text-muted-foreground">{deltaText}</dd> : null}
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">En dispensadores</dt>
                        <dd className="font-numeric font-semibold">{row.balance}</dd>
                        <dd className="text-xs text-muted-foreground">{formatDashboardMoney(row.balanceValue)}</dd>
                      </div>
                    </dl>
                    {row.low ? <LowBalanceAlert balance={row.balance} minDpQuantity={row.minDpQuantity} /> : null}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Filas del storage que NO son inventario de la máquina hoy (p. ej. el billete de
            USD 1 que solo vive en `PayPad/GetStorage` con todo en cero). No se ocultan: se
            listan con el motivo, igual que el panel de atascos. */}
        {!loading && excludedRows.length > 0 ? (
          <div className="grid gap-1 rounded-lg border border-dashed border-slate-300/80 p-3 dark:border-slate-700">
            <p className="text-xs font-medium">
              Denominaciones fuera del inventario en uso · no se muestran en el desglose ({excludedRows.length})
            </p>
            <ul className="grid gap-1 text-xs text-muted-foreground">
              {excludedRows.map((row) => (
                <li key={row.denominationId}>
                  • <span className="font-medium text-foreground">{row.currencyLabel ? `${row.currencyLabel} ` : ""}{formatDashboardMoney(row.denominationValue)}</span>: {row.excludedReason}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Se excluyen sólo cuando no hay ninguna señal de que la máquina las trabaje (ni configuración, ni saldo, ni cargues, ni existencias
              positivas). Si esa denominación sí debe dispensar, configúrala en Pay+ → Configurar denominaciones y registra su cargue.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
