"use client";

import { TriangleAlert } from "lucide-react";
import { Fragment } from "react";

import { BackendStaticImage } from "@/components/shared/backend-static-image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CurrencyDenomination } from "@/features/denominations/schemas";
import type {
  DispensingBaseSelfCheck,
  DispensingCurrencyTotal,
  DispensingDenominationRow,
} from "@/features/dispensing-control/dispensing-metrics";
import { LOW_BALANCE_TOLERANCE } from "@/features/dispensing-control/dispensing-metrics";
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
  /** Fecha del arqueo base (`null` = la máquina nunca se arqueó: Inicial y cuadre desde la base no calculables). */
  baseAt?: string | null;
  /** Validación del arqueo base contra sus propios totales (null = no comparable). */
  baseSelfCheck?: DispensingBaseSelfCheck | null;
  denominations: readonly CurrencyDenomination[];
  /** Filas del storage que no son inventario en uso: se explican, no se ocultan. */
  excludedRows?: readonly DispensingDenominationRow[];
  hasBase?: boolean;
  /** Fecha del último cargue (`null` = sin cargues: sin cuadre desde el cargue). */
  lastLoadAt?: string | null;
  loading?: boolean;
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
  return `${delta > 0 ? "+" : ""}${delta} desde la base`;
}

/** La ecuación del cuadre del CARGUE, visible: cargué N, quedan M ⇒ salieron N − M. */
function loadEquation(row: DispensingDenominationRow): string {
  return `${row.loadedSinceLastLoad} − ${row.balance}`;
}

/**
 * Explicación de la cifra operativa: la salida del período del cargue se reparte entre
 * clientes y el baúl de rechazo (lo que quedó en el rechazo salió del dispensador pero
 * NO llegó al cliente; ya está descontado del saldo).
 */
function loadDeliveredExplanation(row: DispensingDenominationRow): string {
  const base = `Salida desde el último cargue: ${row.loadedSinceLastLoad} cargada(s) − ${row.balance} en el baúl hoy = ${row.deliveredFromLoad ?? 0} unidad(es).`;
  const rejectedDelta = row.rejectedDelta ?? 0;
  if (rejectedDelta > 0) {
    return `${base} Incluye ${rejectedDelta} unidad(es) que quedaron en el baúl de rechazo: ≈${(row.deliveredFromLoad ?? 0) - rejectedDelta} llegaron a clientes.`;
  }
  return base;
}

/** La ecuación del cuadre DESDE EL ARQUEO, como referencia secundaria. */
function baseEquation(row: DispensingDenominationRow): string {
  return `${row.initialDp} + ${row.loadedSinceBase} − ${row.balance}`;
}

function baseDeliveredExplanation(row: DispensingDenominationRow): string {
  return `Salida desde el arqueo base: ${row.initialDp} que había en el baúl al arquear + ${row.loadedSinceBase} cargues posteriores − ${row.balance} saldo = ${row.deliveredFromBase ?? 0}. Incluye lo que ya estaba en el baúl antes de tu cargue; por eso puede superar lo cargado.`;
}

/** Trazabilidad de la columna «Cargada»: cargues con fecha y cantidad. */
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
  baseAt = null,
  baseSelfCheck = null,
  denominations,
  excludedRows = [],
  hasBase = true,
  lastLoadAt = null,
  loading = false,
  rangeLabel,
  rows,
  totalsByCurrency = [],
}: DenominationTableProps) {
  const lowRows = rows.filter((row) => row.low);
  const shortageRows = rows.filter((row) => row.shortage);
  // El cuadre operativo es el del CARGUE (nunca supera lo cargado). El cuadre desde el
  // arqueo queda como referencia: incluye lo que ya estaba en el baúl al arquear.
  const hasLoadBase = lastLoadAt !== null && rows.some((row) => row.deliveredFromLoad !== null);
  // Máquina de cambio divisa: los importes de monedas distintas no se suman entre sí.
  const multiCurrency = rows.some((row) => row.currencyId !== (rows[0]?.currencyId ?? null));

  return (
    <Card className="animate-rise overflow-hidden p-0">
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Desglose por denominaciones</h2>
            <p className="text-sm text-muted-foreground">
              {hasLoadBase ? (
                <>
                  Entregada: salida desde el último cargue del {formatDashboardDateTime(lastLoadAt)} (cargada − saldo hoy; nunca supera lo
                  cargado) · Cargada: unidades del cargue · Rechazo y Saldo: baúles hoy. Referencia del arqueo base
                  {hasBase ? ` (del ${formatDashboardDateTime(baseAt)})` : ""}: columna Inicial y subtítulo de la Entregada — incluye lo que ya
                  estaba en el baúl al arquear. El filtro de período sólo mueve AP/RJ.
                </>
              ) : hasBase ? (
                <>
                  Sin cargues registrados: el cuadre se muestra desde el arqueo base del {formatDashboardDateTime(baseAt)} (inicial + cargada −
                  saldo) · Rechazo y Saldo: baúles hoy.
                </>
              ) : (
                <>
                  Sin cargues ni arqueo base: Inicial y Entregada no son calculables · Cargada del período ({rangeLabel}) · Rechazo y Saldo:
                  inventario actual. Registra el cargue y un arqueo para el cuadre completo.
                </>
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
          <div className="flex flex-wrap gap-2">
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
            {/* Desktop: tabla con Alert warning integrada bajo cada fila afectada */}
            <div className="hidden overflow-hidden rounded-lg border border-slate-200/80 lg:block dark:border-slate-800">
              <Table aria-label="Desglose de denominaciones por baúl">
                <TableHeader>
                  <TableRow>
                    <TableHead>Billete</TableHead>
                    <TableHead className="text-right">{hasLoadBase ? "Inicial (arqueo → cargue)" : "Inicial (base)"}</TableHead>
                    <TableHead className="text-right">Cargada ({hasLoadBase ? "último cargue" : hasBase ? "desde base" : rangeLabel})</TableHead>
                    <TableHead className="text-right">Entregada ({hasLoadBase ? "desde cargue" : "física"})</TableHead>
                    <TableHead className="text-right">Rechazo (RJ)</TableHead>
                    <TableHead className="text-right">Saldo actual</TableHead>
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
                            {!hasBase ? (
                              <span className="font-numeric text-muted-foreground" title="Sin arqueo base">—</span>
                            ) : row.stockAtLastLoad !== null ? (
                              // Puente entre ambos cuadres: lo que el baúl tenía al cargar.
                              // «84 al cargar + 140 tuyos − 11 hoy = 213 desde el arqueo», y
                              // «140 − 11 = 129» es la salida atribuible a tu cargue. Nunca
                              // es un conteo a mano: sale del arqueo y de los cargues.
                              <span
                                className="font-numeric font-medium text-slate-600 dark:text-slate-300"
                                title={`Unidades en el baúl cuando se hizo el último cargue (arqueo base ${row.initialDp} + cargues intermedios). No es un conteo a mano: sale del arqueo y de los cargues registrados.`}
                              >
                                {row.stockAtLastLoad}
                              </span>
                            ) : (
                              <span className="font-numeric font-medium text-slate-600 dark:text-slate-300">{row.initialDp}</span>
                            )}
                            {hasBase ? (
                              <span className="block text-xs text-muted-foreground">arqueo: {row.initialDp}</span>
                            ) : null}
                            {row.negativeReport ? (
                              <span className="block text-xs text-amber-600 dark:text-amber-400" title={row.negativeReport}>arqueo negativo, se toma 0</span>
                            ) : null}
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            <span
                              className="font-numeric font-medium text-blue-600 dark:text-blue-400"
                              title={loadsTraceText(row) ?? "Sin cargues posteriores al arqueo base para esta denominación"}
                            >
                              {hasLoadBase ? row.loadedSinceLastLoad : row.loadedSinceBase}
                            </span>
                            {hasLoadBase && loadsTraceCaption(row) ? (
                              <span className="block text-xs text-muted-foreground">{loadsTraceCaption(row)}</span>
                            ) : null}
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            {hasLoadBase && row.deliveredFromLoad !== null ? (
                              <>
                                <span
                                  className={cn(
                                    "font-numeric",
                                    row.deliveredFromLoad < 0
                                      ? "font-semibold text-red-600 dark:text-red-400"
                                      : "font-medium text-emerald-600 dark:text-emerald-400",
                                  )}
                                  title={loadDeliveredExplanation(row)}
                                >
                                  {row.deliveredFromLoad}
                                </span>
                                {/* La ecuación a la vista: la Entregada no es un dato suelto. */}
                                <span className="block text-xs text-muted-foreground">{loadEquation(row)}</span>
                                {row.deliveredFromLoad < 0 ? (
                                  <span className="block text-xs text-red-600 dark:text-red-400">
                                    el saldo supera lo cargado: revisa cargues sin registrar
                                  </span>
                                ) : null}
                                {hasBase && row.deliveredFromBase !== null ? (
                                  <span className="block text-xs text-muted-foreground" title={baseDeliveredExplanation(row)}>
                                    desde arqueo: <span className="font-numeric">{row.deliveredFromBase}</span> ({baseEquation(row)})
                                  </span>
                                ) : null}
                              </>
                            ) : row.deliveredFromBase === null ? (
                              <span
                                className="font-numeric text-muted-foreground"
                                title="Sin cargues ni arqueo base: la salida no es calculable"
                              >
                                —
                              </span>
                            ) : (
                              <>
                                <span
                                  className={cn(
                                    "font-numeric",
                                    row.shortage ? "font-semibold text-red-600 dark:text-red-400" : "font-medium text-emerald-600 dark:text-emerald-400",
                                  )}
                                  title={baseDeliveredExplanation(row)}
                                >
                                  {row.deliveredFromBase}
                                </span>
                                <span className="block text-xs text-muted-foreground">{baseEquation(row)}</span>
                                {row.shortage ? (
                                  <span className="block text-xs text-red-600 dark:text-red-400">
                                    el conteo subió: posible cargue sin registrar
                                  </span>
                                ) : null}
                              </>
                            )}
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            <span
                              className="font-numeric font-medium text-red-500 dark:text-red-400"
                              title="Unidades que la máquina reporta hoy en el baúl de rechazo (no en el dispensador)."
                            >
                              {row.rejected}
                            </span>
                            <span className="block text-xs text-muted-foreground">{formatDashboardMoney(row.rejectedValue)}</span>
                            {deltaText ? (
                              <span
                                title="Entradas al baúl de rechazo desde el arqueo base: salieron del dispensador, así que están DENTRO de la columna Entregada."
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
                            <span className="font-numeric font-semibold">{row.balance}</span>
                            <span className="block text-xs text-muted-foreground">{formatDashboardMoney(row.balanceValue)}</span>
                          </TableCell>
                          <TableCell className={cn("align-top", tinted)}>
                            {row.shortage ? (
                              <Badge
                                title="El conteo físico subió desde la base: revisa cargues sin registrar antes de conciliar."
                                variant="destructive"
                                className="gap-1.5"
                              >
                                <TriangleAlert aria-hidden="true" className="size-3.5" />
                                Revisar conteo
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
                            {/* Una fila de otra moneda que SÍ está en uso se declara como tal:
                                si aparece, es porque la máquina la trabaja hoy (configurada,
                                con saldo, con cargue o con existencias), no por herencia. */}
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
                            <TableCell colSpan={7} className="p-2">
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

            {/* Móvil: una card por denominación con su alerta integrada */}
            <div className="grid gap-3 lg:hidden">
              {rows.map((row) => {
                const image = denominationImage(denominations, row);
                const deltaText = rejectionDeltaText(row.rejectedDelta);
                return (
                  <div className="grid gap-3 rounded-lg border border-slate-200/80 p-4 transition-shadow duration-300 hover:shadow-lift dark:border-slate-800" key={row.denominationId}>
                    <div className="flex items-center gap-3">
                      <BackendStaticImage
                        alt={image.alt}
                        height={40}
                        src={backendStaticFilePath(image.img)}
                        width={64}
                      />
                      <div className="min-w-0">
                        <p className="font-numeric font-semibold">
                          {row.currencyLabel ? <span className="mr-1 text-xs font-medium text-muted-foreground">{row.currencyLabel}</span> : null}
                          {formatDashboardMoney(image.value)}
                        </p>
                        <p className="text-xs text-muted-foreground" title={row.inUseReasons.length > 0 ? `En uso por: ${row.inUseReasons.join(", ")}` : undefined}>
                          {row.isDispensing ? "Dispensadora" : "No dispensa"}
                        </p>
                      </div>
                      <div className="ml-auto flex flex-col items-end gap-1">
                        {row.shortage ? (
                          <Badge variant="destructive">Revisar</Badge>
                        ) : row.low ? null : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                        {row.foreignCurrency ? (
                          <Badge title={`La moneda de este baúl (${row.currencyLabel ?? "no declarada"}) no es la del Pay+`} variant="outline">
                            Otra moneda
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs text-muted-foreground">{hasLoadBase ? "Inicial (arqueo → cargue)" : "Inicial"}</dt>
                        <dd className="font-numeric font-medium">
                          {!hasBase ? "—" : row.stockAtLastLoad !== null ? row.stockAtLastLoad : row.initialDp}
                        </dd>
                        {hasBase ? <dd className="text-xs text-muted-foreground">arqueo: {row.initialDp}</dd> : null}
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Cargada</dt>
                        <dd className="font-numeric font-medium text-blue-600 dark:text-blue-400" title={loadsTraceText(row)}>
                          {hasLoadBase ? row.loadedSinceLastLoad : row.loadedSinceBase}
                        </dd>
                        {loadsTraceCaption(row) ? <dd className="text-xs text-muted-foreground">{loadsTraceCaption(row)}</dd> : null}
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Entregada</dt>
                        {hasLoadBase && row.deliveredFromLoad !== null ? (
                          <>
                            <dd className={cn("font-numeric font-medium", row.deliveredFromLoad < 0 ? "font-semibold text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                              {row.deliveredFromLoad}
                            </dd>
                            <dd className="text-xs text-muted-foreground">{loadEquation(row)}</dd>
                            {hasBase && row.deliveredFromBase !== null ? (
                              <dd className="text-xs text-muted-foreground" title={baseDeliveredExplanation(row)}>
                                desde arqueo: <span className="font-numeric">{row.deliveredFromBase}</span> ({baseEquation(row)})
                              </dd>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <dd className={cn("font-numeric font-medium", row.deliveredFromBase === null ? "text-muted-foreground" : row.shortage ? "font-semibold text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                              {row.deliveredFromBase === null ? "—" : row.deliveredFromBase}
                            </dd>
                            {row.deliveredFromBase !== null ? <dd className="text-xs text-muted-foreground">{baseEquation(row)}</dd> : null}
                          </>
                        )}
                        {row.negativeReport ? <dd className="text-xs text-amber-600 dark:text-amber-400">arqueo negativo</dd> : null}
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Rechazo</dt>
                        <dd className="font-numeric font-medium text-red-500 dark:text-red-400">{row.rejected}</dd>
                        {deltaText ? <dd className="text-xs text-muted-foreground">{deltaText}</dd> : null}
                      </div>
                      <div><dt className="text-xs text-muted-foreground">Saldo</dt><dd className="font-numeric font-semibold">{row.balance}</dd></div>
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
