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
import type { DispensingDenominationRow } from "@/features/dispensing-control/dispensing-metrics";
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
  loading?: boolean;
  rangeLabel: string;
  rows: readonly DispensingDenominationRow[];
}

function denominationImage(denominations: readonly CurrencyDenomination[], row: DispensingDenominationRow): { alt: string; img: string | null; value: string } {
  const meta = denominations.find((item) => item.id === row.denominationId);
  const value = meta?.value?.trim() || row.denominationValue;
  return { alt: `Billete de ${formatDashboardMoney(value)}`, img: meta?.img ?? null, value };
}

export function DenominationTable({ denominations, loading = false, rangeLabel, rows }: DenominationTableProps) {
  const lowRows = rows.filter((row) => row.low);

  return (
    <Card className="animate-rise overflow-hidden p-0">
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Desglose por denominaciones</h2>
            <p className="text-sm text-muted-foreground">
              Cargada: acumulado del período ({rangeLabel}) · Entregada/Rechazada: último arqueo (sin arqueo, inventario actual) · Saldo: dispensador (DP).
            </p>
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
                              <span className="font-numeric text-sm font-semibold">{formatDashboardMoney(image.value)}</span>
                            </div>
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            <span className="font-numeric font-medium text-blue-600 dark:text-blue-400">{row.loadedInRange}</span>
                          </TableCell>
                          <TableCell className={cn("text-right align-top", tinted)}>
                            <span className="font-numeric font-medium text-emerald-600 dark:text-emerald-400">{row.delivered}</span>
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
                              <Badge variant="secondary">OK</Badge>
                            )}
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
                        <p className="font-numeric font-semibold">{formatDashboardMoney(image.value)}</p>
                        <p className="text-xs text-muted-foreground">{row.isDispensing ? "Dispensadora" : "No dispensa"}</p>
                      </div>
                      {row.low ? null : <Badge className="ml-auto" variant="secondary">OK</Badge>}
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div><dt className="text-xs text-muted-foreground">Cargada</dt><dd className="font-numeric font-medium text-blue-600 dark:text-blue-400">{row.loadedInRange}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Entregada</dt><dd className="font-numeric font-medium text-emerald-600 dark:text-emerald-400">{row.delivered}</dd></div>
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
      </CardContent>
    </Card>
  );
}
