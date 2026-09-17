"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CircleCheck, PackageOpen, TimerReset, XCircle } from "lucide-react";
import { useState, type ReactNode } from "react";

import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { usePaypads } from "@/features/paypads/hooks";
import { useDispensingMetrics } from "@/features/dispensing-control/hooks";
import { DenominationTable } from "@/features/dispensing-control/components/denomination-table";
import { DispensingFilters, type DispensingFilterSelection } from "@/features/dispensing-control/components/dispensing-filters";
import { MetricCard } from "@/features/dispensing-control/components/metric-card";
import { formatElapsed } from "@/features/dispensing-control/dispensing-metrics";
import { dispensingPresetLabels } from "@/features/dispensing-control/schemas";
import { TransactionDetailDialog } from "@/features/transactions/components/transaction-detail-dialog";
import { TransactionStateBadge } from "@/features/transactions/components/transaction-state-badge";
import type { DashboardTransaction } from "@/features/transactions/schemas";
import { getTransactionStateTone, transactionAmountToneClasses } from "@/features/transactions/transaction-state-tone";
import { formatDashboardDateTime } from "@/lib/formatters/date";
import { formatDashboardMoney } from "@/lib/formatters/money";
import { isSuperAdminRole } from "@/lib/roles/super-admin";
import { cn } from "@/lib/utils";

const pageSizeOptions = [5, 10, 25, 50] as const;

function text(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() || fallback;
}

/** Colores por estado: aprobadas → verde, canceladas → rojo, resto → azul. */
function moneyCell(transaction: DashboardTransaction, value: string): ReactNode {
  const tone = transactionAmountToneClasses[getTransactionStateTone(transaction.stateTransaction)];
  return <span className={cn("font-numeric font-medium", tone)}>{formatDashboardMoney(value)}</span>;
}

export function DispensingControlPage() {
  const session = useDashboardSession();
  // Guard de nivel SuperAdmin resuelto en el frontend por nombre de rol
  // (mismo patrón que la página de Usuarios con "root"): sin operaciones de
  // datos ni cambios al API. Ver docs/DISPENSING_CONTROL_FEASIBILITY.md §3.
  const canAccess = isSuperAdminRole(session.role.role ?? session.user.role);
  const canReadPaypads = hasPermission(session, "ReadPayPads");
  const paypadsQuery = usePaypads(canAccess && canReadPaypads);

  const [selection, setSelection] = useState<DispensingFilterSelection | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedTransaction, setSelectedTransaction] = useState<DashboardTransaction | null>(null);
  const paypadId = selection?.paypadId ?? null;
  const metricsQuery = useDispensingMetrics(
    selection === null || selection.paypadId === null
      ? null
      : { from: selection.range.from, page, pageSize, paypadId: selection.paypadId, to: selection.range.to },
  );

  function handleApply(next: DispensingFilterSelection): void {
    setSelection(next);
    setPage(1);
  }

  const search = metricsQuery.search;
  const totalPages = search !== null && search.total > 0 ? Math.max(1, Math.ceil(search.total / pageSize)) : 1;

  const columns: ColumnDef<DashboardTransaction, unknown>[] = [
    { accessorKey: "id", cell: ({ row }) => row.original.id, header: "ID", meta: { mobileLabel: "ID" } },
    { accessorKey: "typeTransaction", cell: ({ row }) => text(row.original.typeTransaction), header: "Trámite", meta: { mobileLabel: "Trámite" } },
    { accessorKey: "reference", cell: ({ row }) => text(row.original.reference), header: "Referencia cliente", meta: { mobileLabel: "Referencia" } },
    { accessorKey: "document", cell: ({ row }) => text(row.original.document), header: "Documento", meta: { mobileLabel: "Documento" } },
    { accessorKey: "dateCreated", cell: ({ row }) => formatDashboardDateTime(row.original.dateCreated), header: "Fecha", meta: { mobileLabel: "Fecha" } },
    { accessorKey: "totalAmount", cell: ({ row }) => moneyCell(row.original, row.original.totalAmount), header: "Total", meta: { mobileLabel: "Total" } },
    { accessorKey: "realAmount", cell: ({ row }) => moneyCell(row.original, row.original.realAmount), header: "Total sin redondear", meta: { mobileLabel: "Total sin redondear" } },
    { accessorKey: "incomeAmount", cell: ({ row }) => moneyCell(row.original, row.original.incomeAmount), header: "Ingresado", meta: { mobileLabel: "Ingresado" } },
    { accessorKey: "returnAmount", cell: ({ row }) => moneyCell(row.original, row.original.returnAmount), header: "Devuelto", meta: { mobileLabel: "Devuelto" } },
    { accessorKey: "typePayment", cell: ({ row }) => text(row.original.typePayment), header: "Medio de pago", meta: { mobileLabel: "Medio de pago" } },
    { accessorKey: "stateTransaction", cell: ({ row }) => <TransactionStateBadge value={row.original.stateTransaction} />, header: "Estado", meta: { mobileLabel: "Estado" } },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button aria-label={`Ver detalle de transacción ${row.original.id}`} onClick={() => setSelectedTransaction(row.original)} size="sm" type="button" variant="detail">
          Ver detalle
        </Button>
      ),
      header: "Acciones",
    },
  ];

  if (!canAccess) {
    return <ForbiddenState description="El control de dispensado es exclusivo de usuarios con rol SuperAdmin." />;
  }

  const metrics = metricsQuery.metrics;
  const rangeLabel = selection ? dispensingPresetLabels[selection.preset] : "";
  const dpTotal = metrics?.dp.total ?? null;
  const lastLoadElapsed = metrics?.lastLoad.elapsedMs ?? null;

  return (
    <div className="grid gap-6">
      <PageHeader
        description="Control operativo del dispensado por máquina: valores aprobados (AP), realmente entregados (DP) y devueltos por error (RJ), tiempo desde el último cargue, las transacciones del período y los saldos de baúl por denominación con alertas de umbral."
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
          disabled={metricsQuery.isLoading && selection !== null}
          onApply={handleApply}
          paypadId={paypadId}
          paypads={paypadsQuery.data ?? []}
        />
      ) : null}

      {selection?.paypadId === null ? (
        <EmptyState
          description="Elige una máquina para ver AP, DP, RJ, el último cargue, las transacciones del período y el estado de los baúles por denominación."
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={CircleCheck}
                label="AP · Aprobadas del período"
                loading={metricsQuery.isLoading && metrics === null}
                subtitle={`${metrics?.ap.count ?? 0} transacción${(metrics?.ap.count ?? 0) === 1 ? "" : "es"}${metrics?.apPhysical.at ? ` · Arqueo: ${formatDashboardMoney(metrics.apPhysical.total ?? "0")}` : ""}`}
                tone="approved"
                value={metrics ? formatDashboardMoney(metrics.ap.total) : "—"}
              />
              <MetricCard
                icon={PackageOpen}
                label="DP · Real entregado"
                loading={metricsQuery.isLoading && metrics === null}
                subtitle={
                  metrics?.dp.at
                    ? `Último arqueo: ${formatDashboardDateTime(metrics.dp.at)}`
                    : metrics
                      ? `Sin arqueo · inventario: ${formatDashboardMoney(metrics.dp.storageTotal)}`
                      : null
                }
                tone="system"
                value={dpTotal === null ? "—" : formatDashboardMoney(dpTotal)}
              />
              <MetricCard
                icon={XCircle}
                label="RJ · Aprobada Error Devuelta"
                loading={metricsQuery.isLoading && metrics === null}
                subtitle={`${metrics?.rj.count ?? 0} transacción${(metrics?.rj.count ?? 0) === 1 ? "" : "es"}${metrics?.rj.physicalTotal ? ` · Baúl rechazo: ${formatDashboardMoney(metrics.rj.physicalTotal)}` : ""}`}
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

            {/* Transacciones del período (misma tabla que el módulo Transacciones) */}
            <Card className="animate-rise overflow-hidden p-0">
              <CardContent className="grid gap-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight">Transacciones del período ({rangeLabel})</h2>
                    <p className="text-sm text-muted-foreground">
                      {search !== null
                        ? `${search.total} transacción${search.total === 1 ? "" : "es"} de esta máquina en el período seleccionado.`
                        : "Consultando transacciones…"}
                    </p>
                  </div>
                  <div className="grid w-44 gap-2">
                    <span className="text-sm font-medium">Por página</span>
                    <Select
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPage(1);
                      }}
                      value={String(pageSize)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {pageSizeOptions.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {metricsQuery.isLoading && metrics === null ? (
              <ListSkeleton rows={5} />
            ) : search !== null ? (
              search.items.length === 0 ? (
                <EmptyState
                  description="No se encontraron transacciones de esta máquina en el período seleccionado."
                  title="Sin transacciones en el período"
                />
              ) : (
                <>
                  <ResponsiveDataTable
                    columns={columns}
                    data={search.items}
                    getCardDescription={(transaction) => `${text(transaction.typeTransaction)} · ${formatDashboardDateTime(transaction.dateCreated)}`}
                    getCardTitle={(transaction) => `Transacción ${transaction.id}`}
                    getRowId={(transaction) => String(transaction.id)}
                    label="Transacciones del período en control de dispensado"
                  />
                  {search.total > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Button disabled={page === 1} onClick={() => setPage((current) => current - 1)} type="button" variant="outline">Anterior</Button>
                      <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
                      <Button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} type="button" variant="outline">Siguiente</Button>
                    </div>
                  ) : null}
                </>
              )
            ) : null}

            <DenominationTable
              denominations={metricsQuery.denominations}
              loading={metricsQuery.isLoading && metrics === null}
              rangeLabel={rangeLabel}
              rows={metrics?.rows ?? []}
            />

            <p className="text-xs text-muted-foreground">
              Fuentes: transacciones del período (AP/RJ, valor neto = ingresado − devuelto) · último arqueo y almacenamiento del Pay+ (DP, saldos de baúl) · cargues registrados (período y último).
              El umbral de alerta por denominación se configura en Pay+ → Configurar denominaciones (mínimo DP); la tolerancia del arqueo legacy añade 10 unidades.
            </p>
          </>
        )
      ) : null}

      <TransactionDetailDialog
        key={selectedTransaction?.id ?? "none"}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTransaction(null);
          }
        }}
        open={selectedTransaction !== null}
        transaction={selectedTransaction}
      />
    </div>
  );
}
