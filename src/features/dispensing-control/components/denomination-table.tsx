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
  denominations: readonly CurrencyDenomination[];
  /** Filas del storage que no son inventario en uso: se explican, no se ocultan. */
  excludedRows?: readonly DispensingDenominationRow[];
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

export function DenominationTable({ denominations, excludedRows = [], loading = false, rangeLabel, rows, totalsByCurrency = [] }: DenominationTableProps) {
  const lowRows = rows.filter((row) => row.low);
  // Máquina de cambio divisa: los importes de monedas distintas no se suman entre sí.
  const multiCurrency = rows.some((row) => row.currencyId !== (rows[0]?.currencyId ?? null));

  return (
    <Card className="animate-rise overflow-hidden p-0">
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Desglose por denominaciones</h2>
            <p className="text-sm text-muted-foreground">
              Cargada: acumulado del período ({rangeLabel}) · Entregada/Rechazada: último arqueo (sin arqueo, inventario actual) · Saldo: dispensador (DP).
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
          {lowRows.length > 0 ? (
            <Badge variant="warning" className="gap-1.5">
              <TriangleAlert aria-hidden="true" className="size-3.5" />
              {lowRows.length} denominación{lowRows.length === 1 ? "" : "es"} por debajo del umbral
            </Badge>
          ) : null}
        </div>

        {loading ? (
          <div aria-busy="true" aria-label="Cargando denominaciones" className="grid gap-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta máquina aún no tiene denominaciones configuradas (módulo Pay+ → Configurar denominaciones).
          </p>
        ) : (
          <>
            {/* Desktop: tabla con Alert warning integrada bajo cada fila afectada */}
            <div className="hidden overflow-hidden rounded-lg border border-slate-200/80 lg:block dark:border-slate-800">
              <Table aria-label="Desglose de denominaciones por baúl">
                <TableHeader>
                  <TableRow>
                    <TableHead>Billete</TableHead>
                    <TableHead className="text-right">Cargada ({rangeLabel})</TableHead>
                    <TableHead className="text-right">Entregada (DP)</TableHead>
                    <TableHead className="text-right">Rechazada (RJ)</TableHead>
                    <TableHead className="text-right">Saldo actual</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const image = denominationImage(denominations, row);
                    const tinted = row.low ? "bg-amber-50/50 dark:bg-amber-500/5" : "";
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
                            <span className="font-numeric font-medium text-blue-600 dark:text-blue-400">{row.loadedInRange}</span>
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            <span className="font-numeric font-medium text-emerald-600 dark:text-emerald-400">{row.delivered}</span>
                            {row.negativeReport ? (
                              <span className="block text-xs text-amber-600 dark:text-amber-400" title={row.negativeReport}>arqueo negativo, se muestra 0</span>
                            ) : null}
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            <span className="font-numeric font-medium text-red-500 dark:text-red-400">{row.rejected}</span>
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            <span className="font-numeric font-semibold">{row.balance}</span>
                            <span className="block text-xs text-muted-foreground">{formatDashboardMoney(row.balanceValue)}</span>
                          </TableCell>
                          <TableCell className={cn("align-top", tinted)}>
                            {row.low ? (
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
                                con saldo, con cargue o con entregas), no por herencia. */}
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

            {/* Móvil: una card por denominación con su alerta integrada */}
            <div className="grid gap-3 lg:hidden">
              {rows.map((row) => {
                const image = denominationImage(denominations, row);
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
                        <p className="text-xs text-muted-foreground">{row.isDispensing ? "Dispensadora" : "No dispensa"}</p>
                      </div>
                      {row.low ? null : <Badge className="ml-auto" variant="secondary">OK</Badge>}
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div><dt className="text-xs text-muted-foreground">Cargada</dt><dd className="font-numeric font-medium text-blue-600 dark:text-blue-400">{row.loadedInRange}</dd></div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Entregada</dt>
                        <dd className="font-numeric font-medium text-emerald-600 dark:text-emerald-400">{row.delivered}</dd>
                        {row.negativeReport ? <dd className="text-xs text-amber-600 dark:text-amber-400">arqueo negativo</dd> : null}
                      </div>
                      <div><dt className="text-xs text-muted-foreground">Rechazada</dt><dd className="font-numeric font-medium text-red-500 dark:text-red-400">{row.rejected}</dd></div>
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
            listan con el motivo, igual que el panel de atascos. Antes aparecían en la tabla
            como un baúl más, con un «Entregada (DP) −6» de un arqueo viejo. */}
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
              Se excluyen sólo cuando no hay ninguna señal de que la máquina las trabaje (ni configuración, ni saldo, ni cargues, ni entregas
              positivas). Si esa denominación sí debe dispensar, configúrala en Pay+ → Configurar denominaciones y registra su cargue.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
