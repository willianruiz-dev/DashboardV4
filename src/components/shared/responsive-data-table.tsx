"use client";

import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  type RowData,
  useReactTable,
} from "@tanstack/react-table";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface ResponsiveDataTableProps<TData extends RowData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  getCardDescription?: (row: TData) => string | null;
  getCardTitle: (row: TData) => string;
  getRowId: (row: TData, index: number) => string;
  label: string;
}

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    mobileHidden?: boolean;
    mobileLabel?: string;
  }
}

export function ResponsiveDataTable<TData extends RowData>({
  columns,
  data,
  getCardDescription,
  getCardTitle,
  getRowId,
  label,
}: ResponsiveDataTableProps<TData>) {
  // TanStack Table manages an imperative table instance; memoizing it would create stale UI.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
  });

  const maxRowDelay = 480;

  return (
    <>
      <div className="hidden xl:block">
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-card shadow-soft dark:border-slate-800">
          <Table aria-label={label}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  className="animate-row-in"
                  style={{ animationDelay: `${Math.min(rowIndex * 40, maxRowDelay)}ms` }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid gap-3 xl:hidden">
        {table.getRowModel().rows.map((row, rowIndex) => {
          const visibleCells = row
            .getVisibleCells()
            .filter((cell) => !cell.column.columnDef.meta?.mobileHidden);

          return (
            <Card
              key={row.id}
              className="animate-rise transition-all duration-300 hover:shadow-lift"
              style={{ animationDelay: `${Math.min(rowIndex * 60, maxRowDelay)}ms` }}
            >
              <CardHeader className="gap-1">
                <CardTitle className="text-base">{getCardTitle(row.original)}</CardTitle>
                {getCardDescription ? <CardDescription>{getCardDescription(row.original)}</CardDescription> : null}
              </CardHeader>
              <CardContent className="grid gap-3">
                {visibleCells.map((cell) => {
                  const mobileLabel = cell.column.columnDef.meta?.mobileLabel;
                  const content = flexRender(cell.column.columnDef.cell, cell.getContext());

                  if (!mobileLabel) {
                    return <div key={cell.id}>{content}</div>;
                  }

                  return (
                    <div className="grid gap-1" key={cell.id}>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{mobileLabel}</p>
                      <div className="text-sm text-foreground">{content}</div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
