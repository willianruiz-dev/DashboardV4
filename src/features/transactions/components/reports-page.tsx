"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";

import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { usePaypads } from "@/features/paypads/hooks";
import { ExcelExportButton } from "@/features/transactions/components/excel-export-button";
import { TransactionFilters, type TransactionFiltersValues } from "@/features/transactions/components/transaction-filters";
import { TransactionStateBadge } from "@/features/transactions/components/transaction-state-badge";
import { useTransactionSearch } from "@/features/transactions/hooks";
import type { DashboardTransaction, TransactionSearchRequest, TransactionSortKey } from "@/features/transactions/schemas";
import { createTodayDateRange, dateForFileName, formatDashboardDateTime } from "@/lib/formatters/date";
import { formatDashboardMoney } from "@/lib/formatters/money";

const pageSizeOptions = [5, 10, 25, 50] as const;

function text(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() || fallback;
}

function paypadName(paypad: { id: number; username?: string | null }): string {
  return paypad.username?.trim() || `Pay+ ${paypad.id}`;
}

export function ReportsPage() {
  const session = useDashboardSession();
  const canReadTransactions = hasPermission(session, "ReadTransactions");
  const canReadPaypads = hasPermission(session, "ReadPayPads");
  const paypadsQuery = usePaypads(canReadTransactions && canReadPaypads);
  const [defaultRange] = useState(createTodayDateRange);
  const [search, setSearch] = useState<TransactionSearchRequest | null>(null);
  const transactionsQuery = useTransactionSearch(search);
  const data = transactionsQuery.data;
  const selectedPaypad = search?.paypadId ? paypadsQuery.data?.find((item) => item.id === search.paypadId) : undefined;
  const excelFileName = search && search.paypadId
    ? `Reporte_${selectedPaypad ? paypadName(selectedPaypad).replaceAll(" ", "") : search.paypadId}_${dateForFileName(search.from)}_a_${dateForFileName(search.to)}.xlsx`
    : "Reporte_transacciones.xlsx";

  function submitSearch(values: TransactionFiltersValues): void {
    setSearch({
      from: values.from,
      page: 1,
      pageSize: 10,
      paypadId: values.paypadId,
      product: null,
      sortDirection: "desc",
      sortKey: "dateCreated",
      to: values.to,
    });
  }

  function updateSearch(update: Partial<Pick<TransactionSearchRequest, "page" | "pageSize" | "product" | "sortDirection" | "sortKey">>): void {
    setSearch((current) => current ? { ...current, ...update } : current);
  }

  const columns: ColumnDef<DashboardTransaction, unknown>[] = [
    { accessorKey: "id", cell: ({ row }) => row.original.id, header: "ID", meta: { mobileLabel: "ID" } },
    { accessorKey: "typeTransaction", cell: ({ row }) => text(row.original.typeTransaction), header: "Trámite", meta: { mobileLabel: "Trámite" } },
    { accessorKey: "reference", cell: ({ row }) => text(row.original.reference), header: "Referencia cliente", meta: { mobileLabel: "Referencia" } },
    { accessorKey: "document", cell: ({ row }) => text(row.original.document), header: "Documento", meta: { mobileLabel: "Documento" } },
    { accessorKey: "dateCreated", cell: ({ row }) => formatDashboardDateTime(row.original.dateCreated), header: "Fecha", meta: { mobileLabel: "Fecha" } },
    { accessorKey: "totalAmount", cell: ({ row }) => <span className="font-numeric">{formatDashboardMoney(row.original.totalAmount)}</span>, header: "Total", meta: { mobileLabel: "Total" } },
    { accessorKey: "realAmount", cell: ({ row }) => <span className="font-numeric">{formatDashboardMoney(row.original.realAmount)}</span>, header: "Total sin redondear", meta: { mobileLabel: "Total sin redondear" } },
    { accessorKey: "incomeAmount", cell: ({ row }) => <span className="font-numeric">{formatDashboardMoney(row.original.incomeAmount)}</span>, header: "Ingresado", meta: { mobileLabel: "Ingresado" } },
    { accessorKey: "returnAmount", cell: ({ row }) => <span className="font-numeric">{formatDashboardMoney(row.original.returnAmount)}</span>, header: "Devuelto", meta: { mobileLabel: "Devuelto" } },
    { accessorKey: "typePayment", cell: ({ row }) => text(row.original.typePayment), header: "Medio de pago", meta: { mobileLabel: "Medio de pago" } },
    { accessorKey: "stateTransaction", cell: ({ row }) => <TransactionStateBadge value={row.original.stateTransaction} />, header: "Estado", meta: { mobileLabel: "Estado" } },
  ];

  if (!canReadTransactions) {
    return <ForbiddenState description="Tu rol no tiene permiso para consultar reportes de transacciones." />;
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
        description="Consulta transacciones por Pay+ o por todos los equipos, intervalo de fechas y producto. Para descargar Excel selecciona un Pay+ específico."
        title="Reportes"
      />

      {!canReadPaypads ? (
        <ForbiddenState description="Tu rol no tiene permiso para listar los Pay+ requeridos para generar reportes." />
      ) : null}
      {canReadPaypads && paypadsQuery.isPending ? <ListSkeleton rows={2} /> : null}
      {canReadPaypads && !paypadsQuery.isPending && paypadsQuery.isError ? (
        <ErrorState
          description={paypadsQuery.error instanceof Error ? paypadsQuery.error.message : "No fue posible cargar los Pay+."}
          onRetry={() => void paypadsQuery.refetch()}
        />
      ) : null}
      {canReadPaypads && !paypadsQuery.isPending && !paypadsQuery.isError ? (
        <TransactionFilters allowAllPaypads defaultRange={defaultRange} onSearch={submitSearch} paypads={paypadsQuery.data ?? []} />
      ) : null}

      {search && transactionsQuery.isPending ? <ListSkeleton rows={5} /> : null}
      {search && !transactionsQuery.isPending && transactionsQuery.isError ? (
        <ErrorState
          description={transactionsQuery.error instanceof Error ? transactionsQuery.error.message : "No fue posible generar el reporte."}
          onRetry={() => void transactionsQuery.refetch()}
        />
      ) : null}
      {search && !transactionsQuery.isPending && !transactionsQuery.isError && data ? (
        <>
          <Card>
            <CardContent className="grid gap-4 p-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Reportar por producto</span>
                  <Select onValueChange={(value) => updateSearch({ page: 1, product: value === "all" ? null : value })} value={search.product ?? "all"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {data.products.map((product) => <SelectItem key={product} value={product}>{product}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <span className="text-sm font-medium">Ordenar por</span>
                  <Select onValueChange={(value) => updateSearch({ page: 1, sortKey: value as TransactionSortKey })} value={search.sortKey}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dateCreated">Fecha</SelectItem>
                      <SelectItem value="id">ID</SelectItem>
                      <SelectItem value="totalAmount">Total</SelectItem>
                      <SelectItem value="typeTransaction">Trámite</SelectItem>
                      <SelectItem value="typePayment">Medio de pago</SelectItem>
                      <SelectItem value="stateTransaction">Estado</SelectItem>
                      <SelectItem value="product">Producto</SelectItem>
                    </SelectContent>
                  </Select>
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
              <p className="text-sm text-muted-foreground">
                {data.total} resultado{data.total === 1 ? "" : "s"} encontrado{data.total === 1 ? "" : "s"}.
                {search.paypadId === null ? " Selecciona un equipo concreto si necesitas descargar Excel." : " El Excel incluye todos los resultados de esta consulta."}
              </p>
            </CardContent>
          </Card>
          {data.items.length === 0 ? (
            <EmptyState description="No se encontraron transacciones con los parámetros indicados." title="Resultados no encontrados" />
          ) : (
            <ResponsiveDataTable
              columns={columns}
              data={data.items}
              getCardDescription={(transaction) => `${text(transaction.typeTransaction)} · ${formatDashboardDateTime(transaction.dateCreated)}`}
              getCardTitle={(transaction) => `Transacción ${transaction.id}`}
              getRowId={(transaction) => String(transaction.id)}
              label="Resultados del reporte"
            />
          )}
          {data.total > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button disabled={search.page === 1} onClick={() => updateSearch({ page: search.page - 1 })} type="button" variant="outline">Anterior</Button>
              <span className="text-sm text-muted-foreground">Página {search.page} de {Math.max(1, Math.ceil(data.total / search.pageSize))}</span>
              <Button disabled={search.page * search.pageSize >= data.total} onClick={() => updateSearch({ page: search.page + 1 })} type="button" variant="outline">Siguiente</Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
