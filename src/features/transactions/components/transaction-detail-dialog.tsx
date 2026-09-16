"use client";

import { Clapperboard, FileText, LoaderCircle, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { BackendStaticImage } from "@/components/shared/backend-static-image";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDenominations } from "@/features/denominations/hooks";
import type { CurrencyDenomination } from "@/features/denominations/schemas";
import { getResolvedPaypadMachineName } from "@/features/paypads/paypad-display";
import { useDownloadTransactionVideo, useTransactionDetails } from "@/features/transactions/hooks";
import type { DashboardTransaction, DashboardTransactionDetail } from "@/features/transactions/schemas";
import { TransactionStateBadge } from "@/features/transactions/components/transaction-state-badge";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { ClientApiError } from "@/lib/api/client";
import { backendStaticFilePath } from "@/lib/files/backend-static-path";
import { formatDashboardDateTime } from "@/lib/formatters/date";
import { formatDashboardMoney } from "@/lib/formatters/money";

interface TransactionDetailDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  transaction: DashboardTransaction | null;
}

interface GroupedDetail {
  denominationId: number;
  denominationImage: string | null;
  denominationValue: string;
  operation: string;
  quantity: string;
}

function text(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() || fallback;
}

function groupDetails(details: readonly DashboardTransactionDetail[], denominations: readonly CurrencyDenomination[]): GroupedDetail[] {
  const groups = new Map<string, GroupedDetail>();
  for (const detail of details) {
    const key = `${detail.idTypeOperation ?? 0}-${detail.idCurrencyDenomination}`;
    const existing = groups.get(key);
    const denomination = denominations.find((item) => item.id === detail.idCurrencyDenomination);
    const quantity = BigInt(detail.quantity);
    if (existing) {
      existing.quantity = (BigInt(existing.quantity) + quantity).toString();
      continue;
    }
    groups.set(key, {
      denominationId: detail.idCurrencyDenomination,
      denominationImage: denomination?.img ?? null,
      denominationValue: denomination?.value ?? detail.currencyDenomination ?? "0",
      operation: text(detail.typeOperation, "Operación no informada"),
      quantity: quantity.toString(),
    });
  }
  return [...groups.values()];
}

function InformationPanel({ transaction }: { transaction: DashboardTransaction }) {
  const downloadMutation = useDownloadTransactionVideo();

  async function downloadVideo(): Promise<void> {
    try {
      await downloadMutation.mutateAsync({ idPaypad: transaction.idPayPad, idTransaction: transaction.id });
    } catch (error) {
      if (error instanceof ClientApiError && error.status === 404) {
        toast.warning("El vídeo no se encontró. Accede al agilizador específico para consultarlo.");
        return;
      }
      toast.error(error instanceof Error ? error.message : "No fue posible descargar el vídeo.");
    }
  }

  const financialFields = [
    ["Total", transaction.totalAmount],
    ["Total sin redondear", transaction.realAmount],
    ["Total ingresado", transaction.incomeAmount],
    ["Total devuelto", transaction.returnAmount],
  ] as const;

  return <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">Información de la transacción</CardTitle></CardHeader><CardContent className="grid gap-4 text-sm"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pay+</p><p>{getResolvedPaypadMachineName(transaction.paypadUsername, transaction.idPayPad)}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Producto</p><p>{text(transaction.product)}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Referencia</p><p>{text(transaction.reference)}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estado</p><TransactionStateBadge value={transaction.stateTransaction} /></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Descripción</p><p className="break-words">{text(transaction.description)}</p></div></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Valores</CardTitle></CardHeader><CardContent className="grid gap-4 text-sm"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fecha</p><p>{formatDashboardDateTime(transaction.dateCreated)}</p></div>{financialFields.map(([label, value]) => <div key={label}><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="font-numeric font-medium">{formatDashboardMoney(value)}</p></div>)}<Button disabled={downloadMutation.isPending} onClick={() => void downloadVideo()} type="button" variant="outline">{downloadMutation.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Clapperboard aria-hidden="true" className="size-4" />}{downloadMutation.isPending ? "Descargando…" : "Descargar vídeo"}</Button></CardContent></Card></div>;
}

function DetailsPanel({ transactionId }: { transactionId: number }) {
  const session = useDashboardSession();
  const canReadMasters = hasPermission(session, "ReadMasters");
  const detailsQuery = useTransactionDetails(transactionId);
  const denominationsQuery = useDenominations(canReadMasters);
  const details = useMemo(() => detailsQuery.data ?? [], [detailsQuery.data]);
  const denominations = useMemo(() => denominationsQuery.data ?? [], [denominationsQuery.data]);
  const rows = useMemo(() => groupDetails(details, denominations), [denominations, details]);
  const columns: ColumnDef<GroupedDetail, unknown>[] = [
    {
      id: "image",
      cell: ({ row }) => (
        <BackendStaticImage
          alt={`Billete de ${formatDashboardMoney(row.original.denominationValue)}`}
          height={40}
          src={backendStaticFilePath(row.original.denominationImage)}
          width={64}
        />
      ),
      header: "Billete",
      meta: { mobileLabel: "Billete" },
    },
    { accessorKey: "operation", cell: ({ row }) => row.original.operation, header: "Tipo de operación", meta: { mobileLabel: "Tipo de operación" } },
    { accessorKey: "denominationValue", cell: ({ row }) => <span className="font-numeric">{formatDashboardMoney(row.original.denominationValue)}</span>, header: "Denominación", meta: { mobileLabel: "Denominación" } },
    { accessorKey: "quantity", cell: ({ row }) => <span className="font-numeric">{row.original.quantity}</span>, header: "Cantidad", meta: { mobileLabel: "Cantidad" } },
  ];
  const loading = detailsQuery.isPending || (canReadMasters && denominationsQuery.isPending);
  const error = detailsQuery.error ?? (canReadMasters ? denominationsQuery.error : null);

  if (loading) return <ListSkeleton rows={4} />;
  if (error) return <ErrorState description={error instanceof Error ? error.message : "No fue posible cargar los detalles."} onRetry={() => void Promise.all([detailsQuery.refetch(), canReadMasters ? denominationsQuery.refetch() : Promise.resolve()])} />;
  if (rows.length === 0) return <EmptyState description="Esta transacción no tiene movimientos de denominaciones registrados." title="No hay detalles" />;
  return <ResponsiveDataTable columns={columns} data={rows} getCardDescription={(row) => row.operation} getCardTitle={(row) => formatDashboardMoney(row.denominationValue)} getRowId={(row) => `${row.operation}-${row.denominationId}`} label="Detalles de transacción" />;
}

export function TransactionDetailDialog({ onOpenChange, open, transaction }: TransactionDetailDialogProps) {
  const [tab, setTab] = useState<"details" | "transaction">("transaction");
  if (!transaction) {
    return null;
  }

  return <Dialog onOpenChange={onOpenChange} open={open}><DialogContent className="sm:max-w-5xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><ReceiptText aria-hidden="true" className="size-5" />Detalle de transacción {transaction.id}</DialogTitle><DialogDescription>Consulta información, valores y movimientos de la transacción seleccionada.</DialogDescription></DialogHeader><div aria-label="Secciones de detalle" className="flex flex-wrap gap-2" role="tablist"><Button aria-selected={tab === "transaction"} onClick={() => setTab("transaction")} role="tab" type="button" variant={tab === "transaction" ? "default" : "outline"}><FileText aria-hidden="true" className="size-4" />Transacción</Button><Button aria-selected={tab === "details"} onClick={() => setTab("details")} role="tab" type="button" variant={tab === "details" ? "default" : "outline"}>Detalles</Button></div><div className="max-h-[60dvh] overflow-y-auto pr-1" role="tabpanel">{tab === "transaction" ? <InformationPanel transaction={transaction} /> : <DetailsPanel transactionId={transaction.id} />}</div><DialogFooter><Button onClick={() => onOpenChange(false)} type="button" variant="outline">Cerrar</Button></DialogFooter></DialogContent></Dialog>;
}
