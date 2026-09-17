"use client";

import { Activity, BellRing, CircleCheck, LoaderCircle, Radar, TriangleAlert } from "lucide-react";

import { BackendStaticImage } from "@/components/shared/backend-static-image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JamDiagnostics, JamLevel } from "@/features/dispensing-control/dispensing-jams";
import { jamCauseLabels, jamLevelLabels, jamSignalLabels } from "@/features/dispensing-control/dispensing-jams";
import { backendStaticFilePath } from "@/lib/files/backend-static-path";
import { formatDashboardDateTime } from "@/lib/formatters/date";
import { formatDashboardMoney } from "@/lib/formatters/money";
import { cn } from "@/lib/utils";

/** Tono del badge por nivel (incluye el gris neutro de "sin evidencia"). */
const levelTone: Record<JamLevel, "default" | "destructive" | "secondary" | "warning"> = {
  confirmado: "destructive",
  probable: "warning",
  sin_evidencia: "secondary",
  sospecha: "default",
};

/** Tono del banner: el componente `Alert` no admite variante `secondary`. */
const levelAlertTone: Record<JamLevel, "default" | "destructive" | "warning"> = {
  confirmado: "destructive",
  probable: "warning",
  sin_evidencia: "default",
  sospecha: "default",
};

function formatWindow(from: string | null, to: string | null): string {
  if (!from || !to) {
    return "ventana sin transacciones con detalle";
  }

  return `${formatDashboardDateTime(from)} → ${formatDashboardDateTime(to)}`;
}

interface JamDiagnosticsSectionProps {
  analysisCurrent: boolean;
  diagnostics: JamDiagnostics;
  error: Error | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onRetry: () => void;
  rangeLabel: string;
}

/**
 * Panel de detección temprana de atascos. Muestra el diagnóstico agregado con
 * los datos que ya están cargados (storage + arqueos + estado de transacciones) y,
 * al pulsar «Analizar atascos», añade la evidencia por denominación proveniente de
 * los detalles de cada transacción (`Transaction/{id}/Details`).
 */
export function JamDiagnosticsSection({
  analysisCurrent,
  diagnostics,
  error,
  isAnalyzing,
  onAnalyze,
  onRetry,
  rangeLabel,
}: JamDiagnosticsSectionProps) {
  const rowsWithEvidence = diagnostics.rows.filter((row) => row.level !== "sin_evidencia");

  return (
    <Card className="animate-rise overflow-hidden p-0">
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Radar aria-hidden="true" className="size-4 text-blue-600 dark:text-blue-400" />
              Detección de atascos en monederos y billeteros
            </h2>
            <p className="text-sm text-muted-foreground">
              Cruza saldo del baúl, arqueos (conteo físico), cargues y las operaciones de cada transacción para distinguir{" "}
              <strong className="font-medium text-foreground">atasco</strong> (hay saldo y no sale) de{" "}
              <strong className="font-medium text-foreground">agotamiento</strong> (no hay saldo). Período: {rangeLabel}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {diagnostics.incidents.length > 0 ? (
              <Badge className="gap-1.5" variant={levelTone[diagnostics.incidents[0]?.level ?? "sospecha"]}>
                <TriangleAlert aria-hidden="true" className="size-3.5" />
                {diagnostics.incidents.length} incidente{diagnostics.incidents.length === 1 ? "" : "s"}
              </Badge>
            ) : (
              <Badge className="gap-1.5" variant="secondary">
                <CircleCheck aria-hidden="true" className="size-3.5" />
                Sin señales
              </Badge>
            )}
            <Button disabled={isAnalyzing} onClick={onAnalyze} type="button" variant={analysisCurrent ? "outline" : "default"}>
              {isAnalyzing ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Activity aria-hidden="true" className="size-4" />}
              {isAnalyzing ? "Analizando…" : analysisCurrent ? "Re-analizar atascos" : "Analizar atascos"}
            </Button>
          </div>
        </div>

        <p className="text-sm font-medium">{diagnostics.headline}</p>

        {diagnostics.blind ? (
          <Alert role="alert" variant="destructive">
            <BellRing aria-hidden="true" className="size-4" />
            <AlertTitle>Diagnóstico incompleto: no se pudo leer el detalle de las transacciones</AlertTitle>
            <AlertDescription className="grid gap-2">
              <span>
                Sin detalles no se puede reconstruir qué denominaciones entregó cada pago, que es la evidencia principal
                de un atasco silencioso (la máquina entrega en denominaciones menores sin registrar error).
              </span>
              {diagnostics.failureReasons.length > 0 ? (
                <ul className="grid gap-1 text-xs">
                  {diagnostics.failureReasons.map((reason) => (
                    <li key={reason}>• {reason}</li>
                  ))}
                </ul>
              ) : null}
              <div>
                <Button onClick={onRetry} type="button" variant="outline">Reintentar análisis</Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {error !== null ? (
          <Alert role="alert" variant="destructive">
            <BellRing aria-hidden="true" className="size-4" />
            <AlertTitle>El análisis de detalles no se completó</AlertTitle>
            <AlertDescription className="grid gap-3">
              <span>{error.message} El diagnóstico agregado de saldos y arqueos sigue visible.</span>
              <div>
                <Button onClick={onRetry} type="button" variant="outline">
                  Reintentar análisis
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {isAnalyzing && !analysisCurrent ? (
          <div aria-busy="true" aria-label="Analizando atascos" className="grid gap-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : null}

        {diagnostics.incidents.length > 0 ? (
          <div className="grid gap-3">
            {diagnostics.incidents.slice(0, 4).map((incident) => (
              <Alert key={`${incident.kind}-${incident.denominationId ?? "salida"}`} variant={levelAlertTone[incident.level]} role="alert">
                <TriangleAlert aria-hidden="true" className="size-4" />
                <AlertTitle className="flex flex-wrap items-center gap-2">
                  {incident.title}
                  <Badge variant={levelTone[incident.level]}>{jamLevelLabels[incident.level]}</Badge>
                </AlertTitle>
                <AlertDescription className="grid gap-2">
                  <span>{incident.detail}</span>
                  <ul className="grid gap-1 text-xs">
                    {incident.evidence.slice(0, 4).map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                  <span className="text-xs font-medium">Acción sugerida: {incident.suggestedAction}</span>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        ) : null}

        {diagnostics.warnings.length > 0 ? (
          <ul className="grid gap-1 text-xs text-muted-foreground">
            {diagnostics.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        ) : null}

        {diagnostics.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Esta máquina no tiene denominaciones configuradas en el baúl dispensador.</p>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-lg border border-slate-200/80 lg:block dark:border-slate-800">
              <Table aria-label="Evidencia de atascos por denominación">
                <TableHeader>
                  <TableRow>
                    <TableHead>Denominación</TableHead>
                    <TableHead className="text-right">Saldo baúl</TableHead>
                    <TableHead className="text-right">Devuelto / intentos</TableHead>
                    <TableHead className="text-right">Dispensado</TableHead>
                    <TableHead className="text-right">Caída física (arqueo)</TableHead>
                    <TableHead>Señales</TableHead>
                    <TableHead>Diagnóstico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diagnostics.rows.map((row) => (
                    <TableRow className={cn(row.level === "probable" || row.level === "confirmado" ? "bg-amber-50/40 dark:bg-amber-500/5" : "")} key={row.denominationId}>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-3">
                          <BackendStaticImage
                            alt={`Denominación ${formatDashboardMoney(row.denominationValue)}`}
                            height={40}
                            src={backendStaticFilePath(row.denominationImage)}
                            width={64}
                          />
                          <div className="min-w-0">
                            <span className="font-numeric text-sm font-semibold">{formatDashboardMoney(row.denominationValue)}</span>
                            <span className="block text-xs text-muted-foreground">
                              {row.configuredForDispensing
                                ? "Dispensa (config)"
                                : row.dispensesByEvidence
                                  ? "No configurada, pero entrega según la evidencia"
                                  : "No dispensa"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <span className="font-numeric font-semibold">{row.stock}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatDashboardMoney(row.stockValue)} · umbral {row.minDpQuantity}
                          {row.low ? " (recarga)" : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <span className={cn("font-numeric font-medium", row.failedUnits > 0 ? "text-red-500 dark:text-red-400" : "")}>{row.failedUnits}</span>
                        <span className="block text-xs text-muted-foreground">
                          {row.failedTransactions.length > 0 ? `${row.failedTransactions.length} transacción(es)` : "sin intentos fallidos"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <span className="font-numeric font-medium text-emerald-600 dark:text-emerald-400">{row.dispensedUnits}</span>
                        <span className="block text-xs text-muted-foreground">
                          {row.substitutionEvents + row.unconfiguredSubstitutionEvents > 0
                            ? `${row.substitutionEvents + row.unconfiguredSubstitutionEvents} sustitución(es)${row.unconfiguredSubstitutionEvents > 0 ? " (no config.)" : ""}`
                            : "sin sustituciones"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        {row.physicalDrop.units === null ? (
                          <span className="text-xs text-muted-foreground">Sin 2 arqueos</span>
                        ) : (
                          <>
                            <span className="font-numeric font-medium">{row.physicalDrop.units}</span>
                            <span className="block text-xs text-muted-foreground">
                              {row.physicalDrop.coveredByScan ? "cubierta por el análisis" : "fuera de la ventana analizada"}
                            </span>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap gap-1">
                          {row.signals.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            row.signals.map((signal) => (
                              <Badge key={signal.code} title={signal.detail} variant={signal.weight >= 3 ? "warning" : "secondary"}>
                                {jamSignalLabels[signal.code]}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={levelTone[row.level]}>{jamLevelLabels[row.level]}</Badge>
                        <span className="mt-1 block text-xs text-muted-foreground">{jamCauseLabels[row.cause]}</span>
                        {row.lastEvidenceAt ? <span className="mt-1 block text-xs text-muted-foreground">Última evidencia: {formatDashboardDateTime(row.lastEvidenceAt)}</span> : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Móvil: una card por denominación con su diagnóstico */}
            <div className="grid gap-3 lg:hidden">
              {diagnostics.rows.map((row) => (
                <div className="grid gap-3 rounded-lg border border-slate-200/80 p-4 dark:border-slate-800" key={row.denominationId}>
                  <div className="flex items-center gap-3">
                    <BackendStaticImage
                      alt={`Denominación ${formatDashboardMoney(row.denominationValue)}`}
                      height={32}
                      src={backendStaticFilePath(row.denominationImage)}
                      width={52}
                    />
                    <div className="min-w-0">
                      <p className="font-numeric font-semibold">{formatDashboardMoney(row.denominationValue)}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.configuredForDispensing ? "Dispensa" : row.dispensesByEvidence ? "No configurada, con evidencia de entrega" : "No dispensa"} · {jamCauseLabels[row.cause]}
                      </p>
                    </div>
                    <Badge className="ml-auto" variant={levelTone[row.level]}>{jamLevelLabels[row.level]}</Badge>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div><dt className="text-xs text-muted-foreground">Saldo</dt><dd className="font-numeric font-semibold">{row.stock}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Devuelto</dt><dd className="font-numeric font-medium text-red-500 dark:text-red-400">{row.failedUnits}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Dispensado</dt><dd className="font-numeric font-medium text-emerald-600 dark:text-emerald-400">{row.dispensedUnits}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Caída física</dt><dd className="font-numeric font-semibold">{row.physicalDrop.units ?? "—"}</dd></div>
                  </dl>
                  <p className="text-xs text-muted-foreground">{row.summary}</p>
                  {row.signals.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {row.signals.map((signal) => (
                        <Badge key={signal.code} variant={signal.weight >= 3 ? "warning" : "secondary"}>{jamSignalLabels[signal.code]}</Badge>
                      ))}
                    </div>
                  ) : null}
                  {row.suggestedAction ? <p className="text-xs font-medium">{row.suggestedAction}</p> : null}
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground">
          {diagnostics.analyzed ? (
            <>
              Ventana analizada: {formatWindow(diagnostics.scanned.firstTransactionAt, diagnostics.scanned.lastTransactionAt)} ·{" "}
              {diagnostics.scanned.transactions} transacción(es), {diagnostics.scanned.payoutsAnalyzed} pago(s) comparables ·{" "}
              {diagnostics.scanned.detailsRequests} consulta(s) de detalle
              {diagnostics.scanned.detailsFailures > 0 ? ` (${diagnostics.scanned.detailsFailures} sin respuesta)` : ""}.
              {" "}
              Lectura del detalle:{" "}
              {diagnostics.interpretation.inverted
                ? "los importes indican que las operaciones describen lo aceptado; sustitución y participación quedaron desactivadas."
                : diagnostics.interpretation.verified
                  ? `verificada contra la devolución de ${diagnostics.interpretation.returnMatches} transacción(es)${diagnostics.interpretation.roleMethod === "importes" ? " y el rol de cada operación se dedujo de los importes" : ""}.`
                  : "sin reconciliar con los importes; se usó el estado de la transacción."}{" "}
            </>
          ) : (
            <>Aún sin análisis de detalles: las señales por denominación se limitan a saldo, arqueos y estado de transacciones. </>
          )}
          Señales evaluadas: {Object.values(jamSignalLabels).join(" · ")}. Solo se emiten para denominaciones marcadas como dispensadoras en
          «Configurar denominaciones»; el umbral de agotamiento reutiliza la tolerancia legacy del arqueo (mínimo DP + 10).
          {rowsWithEvidence.length === 0 ? " Sin denominaciones con evidencia en esta ventana." : ""}
        </p>
      </CardContent>
    </Card>
  );
}
