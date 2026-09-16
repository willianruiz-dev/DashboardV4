"use client";

import { flexRender, getCoreRowModel, type ColumnDef, useReactTable } from "@tanstack/react-table";
import { ChevronRight, History } from "lucide-react";
import { Fragment, type ReactNode, useMemo, useState } from "react";

import { BackendStaticImage } from "@/components/shared/backend-static-image";
import { ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { useDenominations } from "@/features/denominations/hooks";
import { usePaypadLoads, usePaypadTonnages } from "@/features/paypads/hooks";
import { getPaypadDisplayName } from "@/features/paypads/paypad-display";
import type { Load, LoadDetail, PayPad, Tonnage, TonnageDetail } from "@/features/paypads/schemas";
import { ClientApiError } from "@/lib/api/client";
import { backendStaticFilePath } from "@/lib/files/backend-static-path";
import { formatDashboardMoney } from "@/lib/formatters/money";

interface DenominationImages {
  byId: ReadonlyMap<number, string | null | undefined>;
  byValue: ReadonlyMap<string, string | null | undefined>;
}

interface HistoryRow {
  dateCreated?: string | null | undefined;
  id: number;
  idUserCreated?: string | null | undefined;
  userCreated?: string | null | undefined;
}

interface PayPadBalanceDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  paypad: PayPad | null;
}

function displayDate(value: string | null | undefined): string {
  return value?.replace("T", " ") ?? "Fecha no disponible";
}

function getHistoryResponsible(row: HistoryRow): string {
  return row.idUserCreated ?? row.userCreated ?? "—";
}

function isNotFound(error: unknown): boolean {
  return error instanceof ClientApiError && error.status === 404;
}

function historyErrorMessage(error: unknown, fallback: string): string | null {
  if (!error || isNotFound(error)) {
    return null;
  }

  if (error instanceof ClientApiError && error.validationIssues.length > 0) {
    const fields = error.validationIssues.map((issue) => `${issue.path} (${issue.code})`).join(", ");
    return `${error.message} Diagnóstico de compatibilidad: ${fields}.`;
  }

  return error instanceof Error ? error.message : fallback;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CO");
}

function DenominationImage({ denominationId, images, value }: { denominationId: number | null; images: DenominationImages; value: string }) {
  const imagePath = (denominationId === null ? undefined : images.byId.get(denominationId)) ?? images.byValue.get(value) ?? null;

  return (
    <BackendStaticImage
      alt={`Billete de ${formatDashboardMoney(value)}`}
      height={40}
      src={backendStaticFilePath(imagePath)}
      width={64}
    />
  );
}

function LoadDetails({ details, images }: { details: readonly LoadDetail[]; images: DenominationImages }) {
  if (details.length === 0) {
    return <p className="text-sm text-muted-foreground">El API no devolvió detalle para este cargue.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {details.map((detail, index) => (
        <Card key={`${detail.idCurrencyDenomination ?? detail.denominationValue}-${index}`}>
          <CardContent className="flex items-center justify-between gap-3 p-3 text-sm">
            <div className="flex min-w-0 items-center gap-3">
              <DenominationImage denominationId={detail.idCurrencyDenomination} images={images} value={detail.denominationValue} />
              <span className="font-numeric font-medium">{formatDashboardMoney(detail.denominationValue)}</span>
            </div>
            <span className="shrink-0">{detail.quantity} unidades</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TonnageDetails({ details, images }: { details: readonly TonnageDetail[]; images: DenominationImages }) {
  if (details.length === 0) {
    return <p className="text-sm text-muted-foreground">El API no devolvió detalle para este arqueo.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {details.map((detail, index) => (
        <Card key={`${detail.idCurrencyDenomination ?? detail.denominationValue}-${index}`}>
          <CardContent className="grid gap-2 p-3 text-sm">
            <div className="flex items-center gap-3">
              <DenominationImage denominationId={detail.idCurrencyDenomination} images={images} value={detail.denominationValue} />
              <span className="font-numeric font-medium">{formatDashboardMoney(detail.denominationValue)}</span>
            </div>
            <span>Aceptadores: {detail.quantityAp}</span>
            <span>Dispensadores: {detail.quantityDp}</span>
            <span>Baúl de rechazo: {detail.quantityRj}</span>
            <span>Total: {detail.quantityTotal}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface HistoryTableProps<TData extends HistoryRow> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  filterId: string;
  getSearchText: (row: TData) => string;
  label: string;
  renderDetails: (row: TData) => ReactNode;
  renderMobileSummary: (row: TData) => ReactNode;
  title: string;
}

/**
 * The legacy balance view is a compact table on desktop and a detail disclosure
 * per movement. This keeps the data-table behavior for larger screens while
 * retaining an accessible card list on narrow screens.
 */
function HistoryTable<TData extends HistoryRow>({
  columns,
  data,
  filterId,
  getSearchText,
  label,
  renderDetails,
  renderMobileSummary,
  title,
}: HistoryTableProps<TData>) {
  const [filter, setFilter] = useState("");
  const [openRowIds, setOpenRowIds] = useState<Set<number>>(new Set());
  const normalizedFilter = normalizeSearchText(filter.trim());
  const filteredData = normalizedFilter.length === 0
    ? data
    : data.filter((row) => normalizeSearchText(getSearchText(row)).includes(normalizedFilter));

  function isExpanded(id: number): boolean {
    return openRowIds.has(id);
  }

  function toggleDetails(id: number): void {
    setOpenRowIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const tableColumns: ColumnDef<TData, unknown>[] = [
    ...columns,
    {
      cell: ({ row }) => {
        const expanded = isExpanded(row.original.id);
        return (
          <Button
            aria-expanded={expanded}
            aria-label={`${expanded ? "Ocultar" : "Ver"} detalle de ${title.toLocaleLowerCase("es-CO")} ${row.original.id}`}
            onClick={() => toggleDetails(row.original.id)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ChevronRight aria-hidden="true" className={expanded ? "size-4 rotate-90" : "size-4"} />
            Detalle
          </Button>
        );
      },
      header: "Detalle",
      id: "details",
    },
  ];

  // TanStack Table owns the desktop table model. Filtering happens before the
  // model so the very same results are rendered by its mobile card alternative.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns: tableColumns,
    data: filteredData,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  return (
    <section aria-labelledby={`${filterId}-heading`} className="grid content-start gap-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold" id={`${filterId}-heading`}>{title}</h3>
        <Badge variant="secondary">{filteredData.length} de {data.length}</Badge>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-52 flex-1 gap-2">
          <label className="text-sm font-medium" htmlFor={`${filterId}-filter`}>Filtrar {title.toLocaleLowerCase("es-CO")}</label>
          <Input
            id={`${filterId}-filter`}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="ID, responsable, fecha o valor"
            type="search"
            value={filter}
          />
        </div>
        {filter.length > 0 ? (
          <Button onClick={() => setFilter("")} type="button" variant="outline">
            Limpiar filtro
          </Button>
        ) : null}
      </div>
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {filteredData.length === data.length
          ? `${data.length} registro${data.length === 1 ? "" : "s"} disponible${data.length === 1 ? "" : "s"}.`
          : `${filteredData.length} de ${data.length} registro${data.length === 1 ? "" : "s"} coincide${filteredData.length === 1 ? "" : "n"} con el filtro.`}
      </p>

      <div className="hidden max-h-[32rem] overflow-y-auto rounded-md border lg:block">
        <Table aria-label={label} className="table-fixed text-xs">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead className={header.column.id === "details" ? "w-28 text-center" : "whitespace-normal break-words"} key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const expanded = isExpanded(row.original.id);
              return (
                <Fragment key={row.id}>
                  <TableRow>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell className={cell.column.id === "details" ? "text-center" : "break-words"} key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expanded ? (
                    <TableRow>
                      <TableCell className="bg-secondary/30 p-4" colSpan={row.getVisibleCells().length}>
                        {renderDetails(row.original)}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {filteredData.map((row) => {
          const expanded = isExpanded(row.id);
          return (
            <Card key={row.id}>
              <CardContent className="grid gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title} {row.id}</p>
                    <p className="text-xs text-muted-foreground">{displayDate(row.dateCreated)}</p>
                  </div>
                  <Button aria-expanded={expanded} onClick={() => toggleDetails(row.id)} type="button" variant="ghost">
                    <ChevronRight aria-hidden="true" className={expanded ? "size-4 rotate-90" : "size-4"} />
                    Detalle
                  </Button>
                </div>
                {renderMobileSummary(row)}
                {expanded ? renderDetails(row) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

const loadColumns: ColumnDef<Load, unknown>[] = [
  {
    accessorKey: "id",
    cell: ({ row }) => <span className="tabular">{row.original.id}</span>,
    header: "ID",
  },
  {
    accessorFn: getHistoryResponsible,
    cell: ({ row }) => getHistoryResponsible(row.original),
    header: "Responsable",
    id: "responsible",
  },
  {
    accessorKey: "totalLoaded",
    cell: ({ row }) => <span className="tabular break-words">{formatDashboardMoney(row.original.totalLoaded)}</span>,
    header: "Valor total cargado",
  },
  {
    accessorKey: "dateCreated",
    cell: ({ row }) => <span className="tabular">{displayDate(row.original.dateCreated)}</span>,
    header: "Fecha",
  },
];

const tonnageColumns: ColumnDef<Tonnage, unknown>[] = [
  {
    accessorKey: "id",
    cell: ({ row }) => <span className="tabular">{row.original.id}</span>,
    header: "ID",
  },
  {
    accessorFn: getHistoryResponsible,
    cell: ({ row }) => getHistoryResponsible(row.original),
    header: "Responsable",
    id: "responsible",
  },
  {
    accessorKey: "totalAp",
    cell: ({ row }) => <span className="tabular break-words">{formatDashboardMoney(row.original.totalAp)}</span>,
    header: "Valor total aceptadores",
  },
  {
    accessorKey: "totalDp",
    cell: ({ row }) => <span className="tabular break-words">{formatDashboardMoney(row.original.totalDp)}</span>,
    header: "Valor total dispensadores",
  },
  {
    accessorKey: "totalRj",
    cell: ({ row }) => <span className="tabular break-words">{formatDashboardMoney(row.original.totalRj)}</span>,
    header: "Valor total baúl de rechazo",
  },
  {
    accessorKey: "total",
    cell: ({ row }) => <span className="tabular break-words font-semibold">{formatDashboardMoney(row.original.total)}</span>,
    header: "Valor total",
  },
  {
    accessorKey: "dateCreated",
    cell: ({ row }) => <span className="tabular">{displayDate(row.original.dateCreated)}</span>,
    header: "Fecha",
  },
];

interface BalanceHistoryProps {
  historyKey: string;
  images: DenominationImages;
  loads: Load[];
  loadsError: string | null;
  loadsPending: boolean;
  onRetryLoads: () => void;
  onRetryTonnages: () => void;
  tonnages: Tonnage[];
  tonnagesError: string | null;
  tonnagesPending: boolean;
}

function BalanceHistory({
  historyKey,
  images,
  loads,
  loadsError,
  loadsPending,
  onRetryLoads,
  onRetryTonnages,
  tonnages,
  tonnagesError,
  tonnagesPending,
}: BalanceHistoryProps) {
  return (
    <div className="grid gap-6 2xl:grid-cols-2">
      {tonnagesPending ? <ListSkeleton rows={3} /> : null}
      {!tonnagesPending && tonnagesError ? <ErrorState description={tonnagesError} onRetry={onRetryTonnages} /> : null}
      {!tonnagesPending && !tonnagesError && tonnages.length === 0 ? <p className="text-sm text-muted-foreground">No hay arqueos registrados.</p> : null}
      {!tonnagesPending && !tonnagesError && tonnages.length > 0 ? (
        <HistoryTable
          columns={tonnageColumns}
          data={tonnages}
          filterId="tonnages"
          getSearchText={(tonnage) => [
            tonnage.id,
            getHistoryResponsible(tonnage),
            tonnage.dateCreated,
            tonnage.total,
            tonnage.totalAp,
            tonnage.totalDp,
            tonnage.totalRj,
            ...tonnage.details.flatMap((detail) => [
              detail.denominationValue,
              detail.quantityAp,
              detail.quantityDp,
              detail.quantityRj,
              detail.quantityTotal,
            ]),
          ].join(" ")}
          key={`tonnages-${historyKey}`}
          label="Historial de arqueos"
          renderDetails={(tonnage) => <TonnageDetails details={tonnage.details} images={images} />}
          renderMobileSummary={(tonnage) => (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Responsable</dt><dd>{getHistoryResponsible(tonnage)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Aceptadores</dt><dd className="font-numeric font-medium">{formatDashboardMoney(tonnage.totalAp)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Dispensadores</dt><dd className="font-numeric font-medium">{formatDashboardMoney(tonnage.totalDp)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Baúl de rechazo</dt><dd className="font-numeric font-medium">{formatDashboardMoney(tonnage.totalRj)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Total</dt><dd className="font-numeric font-semibold">{formatDashboardMoney(tonnage.total)}</dd></div>
            </dl>
          )}
          title="Arqueos"
        />
      ) : null}

      {loadsPending ? <ListSkeleton rows={3} /> : null}
      {!loadsPending && loadsError ? <ErrorState description={loadsError} onRetry={onRetryLoads} /> : null}
      {!loadsPending && !loadsError && loads.length === 0 ? <p className="text-sm text-muted-foreground">No hay cargues registrados.</p> : null}
      {!loadsPending && !loadsError && loads.length > 0 ? (
        <HistoryTable
          columns={loadColumns}
          data={loads}
          filterId="loads"
          getSearchText={(load) => [
            load.id,
            getHistoryResponsible(load),
            load.dateCreated,
            load.totalLoaded,
            ...load.details.flatMap((detail) => [detail.denominationValue, detail.quantity]),
          ].join(" ")}
          key={`loads-${historyKey}`}
          label="Historial de cargues"
          renderDetails={(load) => <LoadDetails details={load.details} images={images} />}
          renderMobileSummary={(load) => (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Responsable</dt><dd>{getHistoryResponsible(load)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Valor total cargado</dt><dd className="font-numeric font-semibold">{formatDashboardMoney(load.totalLoaded)}</dd></div>
            </dl>
          )}
          title="Cargues"
        />
      ) : null}
    </div>
  );
}

export function PayPadBalanceDialog({ onOpenChange, open, paypad }: PayPadBalanceDialogProps) {
  const session = useDashboardSession();
  const canReadMasters = hasPermission(session, "ReadMasters");
  const loadsQuery = usePaypadLoads(paypad?.id ?? null);
  const tonnagesQuery = usePaypadTonnages(paypad?.id ?? null);
  const denominationsQuery = useDenominations(open && canReadMasters);
  const loadsError = historyErrorMessage(loadsQuery.error, "No fue posible cargar los cargues.");
  const tonnagesError = historyErrorMessage(tonnagesQuery.error, "No fue posible cargar los arqueos.");
  const loads = isNotFound(loadsQuery.error) ? [] : (loadsQuery.data ?? []);
  const tonnages = isNotFound(tonnagesQuery.error) ? [] : (tonnagesQuery.data ?? []);
  const images = useMemo<DenominationImages>(() => {
    const denominations = denominationsQuery.data ?? [];
    return {
      byId: new Map(denominations.map((denomination) => [denomination.id, denomination.img] as const)),
      byValue: new Map(denominations.map((denomination) => [denomination.value, denomination.img] as const)),
    };
  }, [denominationsQuery.data]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-6xl 2xl:max-w-[calc(100vw-4rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History aria-hidden="true" className="size-5" />
            Cargues y arqueos
          </DialogTitle>
          <DialogDescription>Consulta los movimientos registrados para {getPaypadDisplayName(paypad)}.</DialogDescription>
        </DialogHeader>
        <BalanceHistory
          historyKey={String(paypad?.id ?? "none")}
          images={images}
          loads={loads}
          loadsError={loadsError}
          loadsPending={loadsQuery.isPending}
          onRetryLoads={() => void loadsQuery.refetch()}
          onRetryTonnages={() => void tonnagesQuery.refetch()}
          tonnages={tonnages}
          tonnagesError={tonnagesError}
          tonnagesPending={tonnagesQuery.isPending}
        />
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
