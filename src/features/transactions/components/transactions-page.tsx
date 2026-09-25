"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClock } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { usePaypadLoads, usePaypads } from "@/features/paypads/hooks";
import { getPaypadDisplayName } from "@/features/paypads/paypad-display";
import type { Load } from "@/features/paypads/schemas";
import { ExcelExportButton } from "@/features/transactions/components/excel-export-button";
import { TransactionDetailDialog } from "@/features/transactions/components/transaction-detail-dialog";
import { TransactionFilters, type TransactionFiltersValues } from "@/features/transactions/components/transaction-filters";
import { TransactionStateBadge } from "@/features/transactions/components/transaction-state-badge";
import { TransactionSummaryCards } from "@/features/transactions/components/transaction-summary";
import { TransactionsRefreshingStatus } from "@/features/transactions/components/transactions-refreshing-status";
import { useTransactionSearch } from "@/features/transactions/hooks";
import type { DashboardTransaction, TransactionSearchRequest } from "@/features/transactions/schemas";
import { createTransactionSearchId } from "@/features/transactions/transaction-search";
import { getTransactionStateTone, transactionAmountToneClasses } from "@/features/transactions/transaction-state-tone";
import { createTodayDateRange, dateForFileName, formatDashboardDateTime } from "@/lib/formatters/date";
import { formatDashboardMoney } from "@/lib/formatters/money";
import { cn } from "@/lib/utils";

const pageSizeOptions = [5, 10, 25, 50] as const;

function text(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() || fallback;
}

/** Colores por estado (ver `transaction-state-tone.ts`): canceladas → rojo, aprobadas → verde, iniciadas → azul, error de devuelta → amarillo, pendientes de notificación → blanco. */
function moneyCell(transaction: DashboardTransaction, value: string): ReactNode {
  const tone = transactionAmountToneClasses[getTransactionStateTone(transaction.stateTransaction)];
  return <span className={cn("font-numeric font-medium", tone)}>{formatDashboardMoney(value)}</span>;
}

export function TransactionsPage() {
  const session = useDashboardSession();
  const canReadTransactions = hasPermission(session, "ReadTransactions");
  const canReadPaypads = hasPermission(session, "ReadPayPads");
  const paypadsQuery = usePaypads(canReadTransactions && canReadPaypads);
  const [defaultRange] = useState(createTodayDateRange);
  const [search, setSearch] = useState<TransactionSearchRequest | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<DashboardTransaction | null>(null);
  const transactionsQuery = useTransactionSearch(search);
  const data = transactionsQuery.data;
  const loadsQuery = usePaypadLoads(search?.paypadId ?? null);
  // Resultados anteriores de la misma consulta mientras llega la nueva página.
  const isRefreshing = transactionsQuery.isPlaceholderData;
  const latestLoad = useMemo(() => {
    let latest: Load | null = null;
    let latestTime = Number.NEGATIVE_INFINITY;

    for (const load of loadsQuery.data ?? []) {
      const time = Date.parse(load.dateCreated ?? "");
      if (!Number.isNaN(time) && time > latestTime) {
        latest = load;
        latestTime = time;
      }
    }

    return latest;
  }, [loadsQuery.data]);
  const lastLoadFrom = useMemo(() => {
    if (!latestLoad?.dateCreated) {
      return null;
    }

    const date = new Date(latestLoad.dateCreated);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }, [latestLoad]);
  const selectedPaypad = search?.paypadId ? paypadsQuery.data?.find((item) => item.id === search.paypadId) : undefined;
  const excelFileName = search && search.paypadId
    ? `Reporte_${selectedPaypad ? getPaypadDisplayName(selectedPaypad).replaceAll(" ", "") : search.paypadId}_${dateForFileName(search.from)}_a_${dateForFileName(search.to)}.xlsx`
    : "Reporte_transacciones.xlsx";

  function submitSearch(values: TransactionFiltersValues): void {
    if (values.paypadId === null) {
      return;
    }

    setSearch({
      from: values.from,
      page: 1,
      pageSize: 10,
      paymentType: values.paymentType,
      paypadId: values.paypadId,
      product: null,
      searchId: createTransactionSearchId(),
      sortDirection: "desc",
      sortKey: "dateCreated",
      to: values.to,
    });
  }

  function applyLastLoadRange(): void {
    if (!lastLoadFrom) {
      return;
    }

    const to = new Date();
    to.setSeconds(59, 999);
    setSearch((current) => current
      ? {
          ...current,
          from: lastLoadFrom,
          page: 1,
          searchId: createTransactionSearchId(),
          to: to.toISOString(),
        }
      : current);
  }

  function updateSearch(update: Partial<Pick<TransactionSearchRequest, "page" | "pageSize" | "sortDirection" | "sortKey">>): void {
    setSearch((current) => current ? { ...current, ...update } : current);
  }

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

  if (!canReadTransactions) {
    return <ForbiddenState description="Tu rol no tiene permiso para consultar transacciones." />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        actions={(
          <ExcelExportButton
            fileName={excelFileName}
            paypadId={search?.paypadId ?? null}
            transactionIds={data?.transactionIds ?? []}
          />
        )}
        description="Consulta transacciones por Pay+, rango de fechas y medio de pago. El botón Descargar Excel se habilita cuando la consulta tiene resultados."
        title="Transacciones"
      />

      {!canReadPaypads ? (
        <ForbiddenState description="Tu rol no tiene permiso para listar los Pay+ requeridos para consultar transacciones." />
      ) : null}
      {canReadPaypads && paypadsQuery.isPending ? <ListSkeleton rows={2} /> : null}
      {canReadPaypads && !paypadsQuery.isPending && paypadsQuery.isError ? (
        <ErrorState
          description={paypadsQuery.error instanceof Error ? paypadsQuery.error.message : "No fue posible cargar los Pay+."}
          onRetry={() => void paypadsQuery.refetch()}
        />
      ) : null}
      {canReadPaypads && !paypadsQuery.isPending && !paypadsQuery.isError && (paypadsQuery.data?.length ?? 0) === 0 ? (
        <EmptyState description="No hay equipos Pay+ disponibles para consultar transacciones." title="No hay Pay+" />
      ) : null}
      {canReadPaypads && !paypadsQuery.isPending && !paypadsQuery.isError && (paypadsQuery.data?.length ?? 0) > 0 ? (
        <TransactionFilters
          appliedRange={search ? { from: search.from, to: search.to } : undefined}
          defaultRange={defaultRange}
          onSearch={submitSearch}
          paypads={paypadsQuery.data ?? []}
        />
      ) : null}

      {search && transactionsQuery.isPending ? <ListSkeleton rows={5} /> : null}
      {search && !transactionsQuery.isPending && transactionsQuery.isError ? (
        <ErrorState
          description={transactionsQuery.error instanceof Error ? transactionsQuery.error.message : "No fue posible consultar las transacciones."}
          onRetry={() => void transactionsQuery.refetch()}
        />
      ) : null}
      {search && !transactionsQuery.isPending && !transactionsQuery.isError && data ? (
        <>
          <TransactionSummaryCards summary={data.summary} />
          <Card>
            <CardContent className="grid gap-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <p className="text-sm text-muted-foreground">
                  {data.total} resultado{data.total === 1 ? "" : "s"} encontrado{data.total === 1 ? "" : "s"}. {search.paymentType ? `Filtro activo: ${search.paymentType}. ` : ""}El Excel incluye todos los resultados de esta consulta, no sólo la página visible.
                </p>
                <TransactionsRefreshingStatus active={isRefreshing} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Filtro de fecha</span>
                  <Button
                    className="justify-start"
                    disabled={loadsQuery.isPending || lastLoadFrom === null || transactionsQuery.isFetching}
                    onClick={applyLastLoadRange}
                    title={lastLoadFrom ? `Último cargue: ${formatDashboardDateTime(latestLoad?.dateCreated)}` : "No hay un cargue registrado para este Pay+"}
                    type="button"
                    variant="outline"
                  >
                    <CalendarClock aria-hidden="true" className="size-4" />
                    Desde último cargue a la fecha
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {loadsQuery.isPending
                      ? "Consultando el último cargue…"
                      : loadsQuery.isError
                        ? "No fue posible consultar el historial de cargues."
                        : lastLoadFrom
                          ? `Último cargue: ${formatDashboardDateTime(latestLoad?.dateCreated)}`
                          : "Este Pay+ no tiene cargues registrados."}
                  </p>
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Dirección</span>
                  <Select onValueChange={(value) => updateSearch({ page: 1, sortDirection: value as "asc" | "desc" })} value={search.sortDirection}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Descendente</SelectItem>
                      <SelectItem value="asc">Ascendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Resultados por página</span>
                  <Select onValueChange={(value) => updateSearch({ page: 1, pageSize: Number(value) as (typeof pageSizeOptions)[number] })} value={String(search.pageSize)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {pageSizeOptions.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          <div aria-busy={isRefreshing} className={cn("grid gap-6 transition-opacity duration-300", isRefreshing && "opacity-60")}>
            {data.items.length === 0 ? (
              <EmptyState description="No se encontraron transacciones con los parámetros indicados." title="Resultados no encontrados" />
            ) : (
              <ResponsiveDataTable
                columns={columns}
                data={data.items}
                getCardDescription={(transaction) => `${text(transaction.typeTransaction)} · ${formatDashboardDateTime(transaction.dateCreated)}`}
                getCardTitle={(transaction) => `Transacción ${transaction.id}`}
                getRowId={(transaction) => String(transaction.id)}
                label="Resultados de transacciones"
              />
            )}
            {data.total > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button disabled={search.page === 1} onClick={() => updateSearch({ page: search.page - 1 })} type="button" variant="outline">Anterior</Button>
                <span className="text-sm text-muted-foreground">Página {search.page} de {Math.max(1, Math.ceil(data.total / search.pageSize))}</span>
                <Button disabled={search.page * search.pageSize >= data.total} onClick={() => updateSearch({ page: search.page + 1 })} type="button" variant="outline">Siguiente</Button>
              </div>
            ) : null}
          </div>
        </>
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
