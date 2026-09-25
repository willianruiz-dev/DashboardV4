"use client";

import { CircleCheck, CircleHelp, PackageX, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  payoutStateLabels,
  type PayoutDenominationState,
  type PayoutReconciliation,
} from "@/features/dispensing-control/dispensing-payout-reconciliation";
import { formatDashboardDateTime } from "@/lib/formatters/date";
import { formatDashboardMoney, multiplyMoneyString } from "@/lib/formatters/money";
import { cn } from "@/lib/utils";

/**
 * Conciliación POR DENOMINACIÓN: lo que el valor de cada devolución pedía contra lo que el
 * detalle confirma entregado, con la causa probable separada en tres situaciones que la
 * operación NO puede mezclar:
 *
 *   1. no había inventario  → AGOTADO (programar cargue; no es un atasco)
 *   2. había inventario y no dispensó → revisar el módulo
 *   3. entregó lo esperado → correcto
 *
 * Es una lectura distinta de la del motor de atascos: aquí no se puntúa evidencia, se muestra
 * la diferencia y se dice a quién preguntarle. Las limitaciones del API van declaradas abajo,
 * no escondidas.
 */

const stateTone: Record<PayoutDenominationState, "default" | "destructive" | "secondary" | "warning"> = {
  correcto: "secondary",
  no_entrego_con_saldo: "destructive",
  sin_atribucion: "warning",
  sin_inventario: "warning",
  sin_plan: "secondary",
  sin_saldo: "warning",
  sobre_entrega: "default",
};

const stateIcon: Record<PayoutDenominationState, typeof CircleCheck> = {
  correcto: CircleCheck,
  no_entrego_con_saldo: TriangleAlert,
  sin_atribucion: CircleHelp,
  sin_inventario: CircleHelp,
  sin_plan: CircleHelp,
  sin_saldo: PackageX,
  sobre_entrega: CircleCheck,
};

function units(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

function differenceText(difference: number): string {
  if (difference === 0) {
    return "0";
  }

  return difference > 0 ? `+${units(difference)}` : `−${units(Math.abs(difference))}`;
}

interface PayoutReconciliationSectionProps {
  data: PayoutReconciliation;
  /** Sin transacciones con detalle analizadas no hay nada que conciliar. */
  loading?: boolean;
  rangeLabel: string;
}

export function PayoutReconciliationSection({ data, loading = false, rangeLabel }: PayoutReconciliationSectionProps) {
  const incomplete = data.transactions.filter((transaction) => !transaction.complete);
  const disputed = data.byDenomination.filter(
    (row) => row.state === "no_entrego_con_saldo" || row.state === "sin_atribucion" || row.state === "sin_inventario",
  );
  const exhausted = data.byDenomination.filter((row) => row.state === "sin_saldo");

  return (
    <Card className="animate-rise overflow-hidden p-0">
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">Conciliación por denominación: esperado vs. dispensado</h2>
            <p className="text-sm text-muted-foreground">
              Por cada devolución se reconstruye el plan (qué denominaciones debería haber usado el valor) y se compara con lo que el
              detalle confirma entregado al cliente. Las operaciones <span className="font-medium text-foreground">Reject/Rechazo</span> se
              muestran aparte como RJ y no se suman a «Dispensado». Periodo:{" "}
              {rangeLabel}.
            </p>
          </div>
          <Badge className="gap-1.5" variant={incomplete.length > 0 ? "warning" : "secondary"}>
            {incomplete.length > 0 ? <TriangleAlert aria-hidden="true" className="size-3.5" /> : <CircleCheck aria-hidden="true" className="size-3.5" />}
            {data.analyzedTransactions} devolución(es) analizada(s) · {data.completeTransactions} exacta(s)
          </Badge>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Conciliando el detalle del período…</p>
        ) : data.analyzedTransactions === 0 ? (
          <p className="text-sm text-muted-foreground">
            El período no tiene devoluciones con detalle analizable: sin plan ni resultado no hay nada que conciliar (revisa que el período
            incluya transacciones con devolución).
          </p>
        ) : (
          <>
            <div className="grid gap-2 rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/40">
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  Devoluciones completas:{" "}
                  <span className="font-numeric font-semibold text-emerald-600 dark:text-emerald-400">{data.completeTransactions}</span>
                </span>
                <span>
                  Incompletas:{" "}
                  <span className={cn("font-numeric font-semibold", incomplete.length > 0 ? "text-red-500 dark:text-red-400" : "")}>
                    {incomplete.length}
                  </span>
                </span>
                <span>
                  Faltante valorizado:{" "}
                  <span className={cn("font-numeric font-semibold", data.missingTotal !== "0" ? "text-red-500 dark:text-red-400" : "")}>
                    {formatDashboardMoney(data.missingTotal)}
                  </span>
                </span>
                <span>
                  Rechazo detectado en detalles (RJ):{" "}
                  <span className="font-numeric font-semibold text-red-500 dark:text-red-400">
                    {formatDashboardMoney(data.rejectedTotal)}
                  </span>
                </span>
              </p>
              {/* Las tres situaciones que la operación debe poder distinguir (§11 del modelo). */}
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Inventario en cero</span> = agotamiento (programar cargue).{" "}
                <span className="font-medium text-foreground">Inventario con unidades y sin dispensar</span> = revisar el módulo del
                dispensador. <span className="font-medium text-foreground">Entregado exacto</span> = correcto, aunque la combinación haya sido
                otra válida.
              </p>
            </div>

            {disputed.length > 0 || exhausted.length > 0 ? (
              <Alert variant={disputed.length > 0 ? "warning" : "default"}>
                {disputed.length > 0 ? (
                  <TriangleAlert aria-hidden="true" className="size-4" />
                ) : (
                  <PackageX aria-hidden="true" className="size-4" />
                )}
                <AlertTitle>
                  {disputed.length > 0
                    ? `${disputed.length} denominación(es) no entregaron teniendo saldo`
                    : `${exhausted.length} denominación(es) agotadas (sin saldo)`}
                </AlertTitle>
                <AlertDescription>
                  {disputed.length > 0
                    ? `${disputed
                        .map(
                          (row) =>
                            `${row.currencyLabel ? `${row.currencyLabel} ` : ""}${formatDashboardMoney(row.denominationValue)} (${units(
                              row.missingUnits,
                            )} unidad(es), saldo ${units(row.stock)})`,
                        )
                        .join(" · ")}. Cruzar con el análisis de atascos antes de concluir: el estado del dispositivo no queda registrado en el API, sólo el resultado de la entrega.`
                    : `${exhausted
                        .map(
                          (row) =>
                            `${row.currencyLabel ? `${row.currencyLabel} ` : ""}${formatDashboardMoney(row.denominationValue)} (faltaron ${units(
                              row.missingUnits,
                            )})`,
                        )
                        .join(" · ")}. No es un atasco: el inventario que el sistema considera disponible está en cero, hay que cargar la denominación y confirmar con arqueo.`}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="hidden overflow-hidden rounded-lg border border-slate-200/80 lg:block dark:border-slate-800">
              <Table aria-label="Conciliación por denominación">
                <TableHeader>
                  <TableRow>
                    <TableHead>Denominación</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Dispensado</TableHead>
                    <TableHead className="text-right">Rechazado (RJ)</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead className="text-right">Faltó</TableHead>
                    <TableHead className="text-right">Saldo del baúl</TableHead>
                    <TableHead>Diagnóstico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byDenomination.map((row) => {
                    const Icon = stateIcon[row.state];
                    return (
                      <TableRow
                        className={cn(row.state === "no_entrego_con_saldo" ? "bg-red-50/40 dark:bg-red-500/5" : "")}
                        key={row.denominationId}
                      >
                        <TableCell className="align-top">
                          <span className="font-numeric text-sm font-semibold">
                            {row.currencyLabel ? (
                              <span className="mr-1.5 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-secondary-foreground">
                                {row.currencyLabel}
                              </span>
                            ) : null}
                            {formatDashboardMoney(row.denominationValue)}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {row.expectedTransactions.length > 0
                              ? `en ${row.expectedTransactions.length} devolución(es)`
                              : "el valor no la exigía"}
                            {row.configuredForDispensing ? "" : " · no configurada para dispensar"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right align-top font-numeric">{units(row.expectedUnits)}</TableCell>
                        <TableCell className="text-right align-top font-numeric text-emerald-600 dark:text-emerald-400">
                          {units(row.dispensedUnits)}
                        </TableCell>
                        <TableCell className="text-right align-top">
                          <span className={cn("font-numeric", row.rejectedUnits > 0 ? "font-semibold text-red-500 dark:text-red-400" : "text-muted-foreground")}>
                            {units(row.rejectedUnits)}
                          </span>
                          {row.rejectedUnits > 0 ? <span className="block text-xs text-muted-foreground">{formatDashboardMoney(multiplyMoneyString(row.unitValue, String(row.rejectedUnits)))}</span> : null}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right align-top font-numeric",
                            row.differenceUnits > 0 ? "text-red-500 dark:text-red-400" : row.differenceUnits < 0 ? "text-amber-600 dark:text-amber-400" : "",
                          )}
                        >
                          {differenceText(row.differenceUnits)}
                        </TableCell>
                        <TableCell className="text-right align-top">
                          {row.missingUnits > 0 ? (
                            <>
                              <span className="font-numeric font-semibold text-red-500 dark:text-red-400">{units(row.missingUnits)}</span>
                              <span className="block text-xs text-muted-foreground">{formatDashboardMoney(row.missingValue)}</span>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right align-top">
                          <span className="font-numeric">{units(row.stock)}</span>
                          <span className="block text-xs text-muted-foreground">umbral {units(row.minDpQuantity)}</span>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge className="mb-1 gap-1.5" variant={stateTone[row.state]}>
                            <Icon aria-hidden="true" className="size-3.5" />
                            {payoutStateLabels[row.state]}
                          </Badge>
                          <span className="block text-xs text-muted-foreground">{row.reading}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-2 lg:hidden">
              {data.byDenomination.map((row) => {
                const Icon = stateIcon[row.state];
                return (
                  <div className="rounded-lg border border-slate-200/80 p-3 dark:border-slate-800" key={row.denominationId}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-numeric text-sm font-semibold">
                        {row.currencyLabel ? `${row.currencyLabel} ` : ""}
                        {formatDashboardMoney(row.denominationValue)}
                      </span>
                      <Badge className="gap-1.5" variant={stateTone[row.state]}>
                        <Icon aria-hidden="true" className="size-3.5" />
                        {payoutStateLabels[row.state]}
                      </Badge>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-1 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Esperado</dt>
                        <dd className="font-numeric">{units(row.expectedUnits)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Dispensado</dt>
                        <dd className="font-numeric">{units(row.dispensedUnits)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Rechazado (RJ)</dt>
                        <dd className="font-numeric text-red-500 dark:text-red-400">{units(row.rejectedUnits)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Diferencia</dt>
                        <dd className="font-numeric">{differenceText(row.differenceUnits)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Saldo</dt>
                        <dd className="font-numeric">{units(row.stock)}</dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-xs text-muted-foreground">{row.reading}</p>
                  </div>
                );
              })}
            </div>

            {incomplete.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-sm font-medium">Devoluciones que no se completaron ({incomplete.length})</p>
                <div className="grid gap-2">
                  {incomplete.slice(0, 8).map((transaction) => (
                    <div
                      className="grid gap-1 rounded-lg border border-slate-200/80 p-3 text-sm dark:border-slate-800"
                      key={transaction.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          Transacción #{transaction.id}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {formatDashboardDateTime(transaction.at)}
                          </span>
                        </span>
                        <Badge variant={transaction.returnedWithError ? "destructive" : "warning"}>
                          {transaction.returnedWithError ? transaction.stateTransaction : "Sin error reportado"}
                        </Badge>
                      </div>
                      <p className="font-numeric text-xs">
                        Solicitado <span className="font-semibold">{formatDashboardMoney(transaction.requestedValue)}</span> · plan{" "}
                        <span className="font-semibold">{formatDashboardMoney(transaction.expectedValue)}</span> · entregado{" "}
                        <span className="font-semibold">{formatDashboardMoney(transaction.dispensedValue)}</span> · faltante{" "}
                        <span className="font-semibold text-red-500 dark:text-red-400">{formatDashboardMoney(transaction.missingValue)}</span>
                      </p>
                      <ul className="grid gap-0.5 text-xs text-muted-foreground">
                        {transaction.lines.map((line) => (
                          <li key={line.denominationId}>
                            {line.currencyLabel ? `${line.currencyLabel} ` : ""}
                            {formatDashboardMoney(line.denominationValue)}: esperado {units(line.expectedUnits)} · dispensado{" "}
                            {units(line.dispensedUnits)}
                            {line.missingUnits > 0 ? ` · faltó ${units(line.missingUnits)}` : ""}
                            {line.rejectedUnits > 0 ? ` · rechazado RJ ${units(line.rejectedUnits)}` : ""}
                            {line.missingUnits === 0 && line.dispensedUnits > line.expectedUnits ? " · cubrió el hueco" : ""}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground">{transaction.verdict}</p>
                    </div>
                  ))}
                  {incomplete.length > 8 ? (
                    <p className="text-xs text-muted-foreground">Se listan las 8 devoluciones incompletas de mayor faltante.</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todas las devoluciones del período se entregaron por el valor exacto: no hay faltante que explicar.
              </p>
            )}
          </>
        )}

        {data.notes.length > 0 ? (
          <ul className="grid gap-1 text-xs text-muted-foreground">
            {data.notes.map((note) => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
        ) : null}

        {data.limitations.length > 0 ? (
          <div className="grid gap-1 rounded-lg border border-dashed border-slate-300/80 p-3 dark:border-slate-700">
            <p className="text-xs font-medium">Lo que el API actual todavía no permite verificar</p>
            <ul className="grid gap-1 text-xs text-muted-foreground">
              {data.limitations.map((limitation) => (
                <li key={limitation}>• {limitation}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
