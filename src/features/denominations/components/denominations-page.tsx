"use client";

import { Banknote, Edit3, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { DestructiveConfirmationDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { DenominationEditorDialog } from "@/features/denominations/components/denomination-editor-dialog";
import { useDeleteDenomination, useDenominations } from "@/features/denominations/hooks";
import type { CurrencyDenomination } from "@/features/denominations/schemas";
import { backendStaticFilePath } from "@/lib/api/backend";
import { formatDashboardMoney } from "@/lib/formatters/money";

function text(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() || fallback;
}

function DenominationImage({ denomination }: { denomination: CurrencyDenomination }) {
  const source = backendStaticFilePath(denomination.img);
  if (source) {
    return <Image alt={`Imagen de la denominación ${formatDashboardMoney(denomination.value)}`} className="h-10 w-16 rounded-md border object-contain" height={40} src={source} unoptimized width={64} />;
  }

  return <span aria-hidden="true" className="flex h-10 w-16 items-center justify-center rounded-md bg-secondary text-secondary-foreground"><Banknote className="size-4" /></span>;
}

export function DenominationsPage() {
  const session = useDashboardSession();
  const canRead = hasPermission(session, "ReadMasters");
  const canWrite = hasPermission(session, "WriteMasters");
  const canDelete = hasPermission(session, "DelMasters");
  const denominationsQuery = useDenominations(canRead);
  const deleteMutation = useDeleteDenomination();
  const [editor, setEditor] = useState<{ denominationId?: number; mode: "create" | "edit" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CurrencyDenomination | null>(null);
  const denominations = denominationsQuery.data ?? [];

  async function deleteDenomination(): Promise<void> {
    if (!deleteTarget) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Denominación eliminada.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar la denominación.");
    }
  }

  const columns: ColumnDef<CurrencyDenomination, unknown>[] = [
    { id: "image", cell: ({ row }) => <DenominationImage denomination={row.original} />, header: "Imagen", meta: { mobileHidden: true } },
    { accessorKey: "currency", cell: ({ row }) => text(row.original.currency), header: "Moneda", meta: { mobileLabel: "Moneda" } },
    { accessorKey: "value", cell: ({ row }) => <span className="font-numeric font-medium">{formatDashboardMoney(row.original.value)}</span>, header: "Valor", meta: { mobileLabel: "Valor" } },
    {
      id: "actions",
      cell: ({ row }) => <div className="flex flex-wrap gap-1">
        {canWrite ? <Button aria-label={`Editar denominación ${row.original.id}`} onClick={() => setEditor({ denominationId: row.original.id, mode: "edit" })} size="icon" type="button" variant="ghost"><Edit3 aria-hidden="true" className="size-4" /></Button> : null}
        {canDelete ? <Button aria-label={`Eliminar denominación ${row.original.id}`} onClick={() => setDeleteTarget(row.original)} size="icon" type="button" variant="ghost"><Trash2 aria-hidden="true" className="size-4 text-destructive" /></Button> : null}
      </div>,
      header: "Acciones",
    },
  ];

  if (!canRead) {
    return <ForbiddenState />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader actions={canWrite ? <Button onClick={() => setEditor({ mode: "create" })} type="button"><Plus aria-hidden="true" className="size-4" />Crear denominación</Button> : undefined} description="Administra las denominaciones monetarias disponibles para la operación de los Pay+." title="Denominaciones" />
      {denominationsQuery.isPending ? <ListSkeleton rows={5} /> : null}
      {!denominationsQuery.isPending && denominationsQuery.isError ? <ErrorState description={denominationsQuery.error instanceof Error ? denominationsQuery.error.message : "No fue posible cargar las denominaciones."} onRetry={() => void denominationsQuery.refetch()} /> : null}
      {!denominationsQuery.isPending && !denominationsQuery.isError && denominations.length === 0 ? <EmptyState description="No hay denominaciones configuradas." title="No hay denominaciones" /> : null}
      {!denominationsQuery.isPending && !denominationsQuery.isError && denominations.length > 0 ? <ResponsiveDataTable columns={columns} data={denominations} getCardDescription={(denomination) => text(denomination.currency)} getCardTitle={(denomination) => formatDashboardMoney(denomination.value)} getRowId={(denomination) => String(denomination.id)} label="Listado de denominaciones" /> : null}
      {editor ? <DenominationEditorDialog denominationId={editor.denominationId} mode={editor.mode} onOpenChange={(open) => { if (!open) setEditor(null); }} open /> : null}
      <DestructiveConfirmationDialog
        isPending={deleteMutation.isPending}
        onConfirm={() => void deleteDenomination()}
        onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setDeleteTarget(null); }}
        open={deleteTarget !== null}
        recordLabel={deleteTarget ? `${formatDashboardMoney(deleteTarget.value)} (ID ${deleteTarget.id})` : "la denominación seleccionada"}
        verificationText={deleteTarget ? String(deleteTarget.id) : undefined}
      />
    </div>
  );
}
