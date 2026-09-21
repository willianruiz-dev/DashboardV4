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
import type { DispensingCurrencyTotal, DispensingDenominationRow } from "@/features/dispensing-control/dispensing-metrics";
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
  /** Fecha del arqueo base (`null` = la máquina nunca se arqueó: Inicial/Entregada no calculables). */
  baseAt?: string | null;
  denominations: readonly CurrencyDenomination[];
  /** Filas del storage que no son inventario en uso: se explican, no se ocultan. */
  excludedRows?: readonly DispensingDenominationRow[];
  hasBase?: boolean;
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

export function DenominationTable({
  baseAt = null,
  denominations,
  excludedRows = [],
  hasBase = true,
  loading = false,
  rangeLabel,
  rows,
  totalsByCurrency = [],
}: DenominationTableProps) {
  const lowRows = rows.filter((row) => row.low);
  const shortageRows = rows.filter((row) => row.shortage);
  // Máquina de cambio divisa: los importes de monedas distintas no se suman entre sí.
  const multiCurrency = rows.some((row) => row.currencyId !== (rows[0]?.currencyId ?? null));

  return (
    <Card className="animate-rise overflow-hidden p-0">
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Desglose por denominaciones</h2>
            <p className="text-sm text-muted-foreground">
              {hasBase ? (
                <>
                  Inicial: arqueo base del {formatDashboardDateTime(baseAt)} · Cargada: desde el arqueo · Entregada: salida física
                  (inicial + cargada − saldo) · Rechazo: baúl actual · Saldo: dispensador hoy.
                </>
              ) : (
                <>
                  Sin arqueo base: Inicial y Entregada no son calculables · Cargada del período ({rangeLabel}) · Rechazo y Saldo:
                  inventario actual. Registra un arqueo para el cuadre completo.
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
                    <TableHead className="text-right">Inicial (base)</TableHead>
                    <TableHead className="text-right">Cargada ({hasBase ? "desde base" : rangeLabel})</TableHead>
                    <TableHead className="text-right">Entregada (física)</TableHead>
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
                            {hasBase ? (
                              <span className="font-numeric font-medium text-slate-600 dark:text-slate-300">{row.initialDp}</span>
                            ) : (
                              <span className="font-numeric text-muted-foreground" title="Sin arqueo base">—</span>
                            )}
                            {row.negativeReport ? (
                              <span className="block text-xs text-amber-600 dark:text-amber-400" title={row.negativeReport}>arqueo negativo, se toma 0</span>
                            ) : null}
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            <span className="font-numeric font-medium text-blue-600 dark:text-blue-400">{row.loadedSinceBase}</span>
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            {row.delivered === null ? (
                              <span className="font-numeric text-muted-foreground" title="Sin arqueo base: la salida física no es calculable">—</span>
                            ) : row.shortage ? (
                              <span
                                className="font-numeric font-semibold text-red-600 dark:text-red-400"
                                title={`El conteo subió ${-row.delivered} unidad(es) desde la base: posible cargue sin registrar o descuadre previo.`}
                              >
                                {row.delivered}
                              </span>
                            ) : (
                              <span
                                className="font-numeric font-medium text-emerald-600 dark:text-emerald-400"
                                title={`${row.initialDp} inicial + ${row.loadedSinceBase} cargada − ${row.balance} saldo`}
                              >
                                {row.delivered}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            <span className="font-numeric font-medium text-red-500 dark:text-red-400">{row.rejected}</span>
                            <span className="block text-xs text-muted-foreground">{formatDashboardMoney(row.rejectedValue)}</span>
                            {deltaText ? (
                              <span
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
                      <div><dt className="text-xs text-muted-foreground">Inicial</dt><dd className="font-numeric font-medium">{hasBase ? row.initialDp : "—"}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Cargada</dt><dd className="font-numeric font-medium text-blue-600 dark:text-blue-400">{row.loadedSinceBase}</dd></div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Entregada</dt>
                        <dd className={cn("font-numeric font-medium", row.delivered === null ? "text-muted-foreground" : row.shortage ? "font-semibold text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                          {row.delivered === null ? "—" : row.delivered}
                        </dd>
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
