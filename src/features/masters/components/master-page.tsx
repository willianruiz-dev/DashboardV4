"use client";

import { Edit3, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { DestructiveConfirmationDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { MasterEditorDialog } from "@/features/masters/components/master-editor-dialog";
import { useDeleteMaster, useMasters } from "@/features/masters/hooks";
import { getMasterValue, masterDefinitions, type MasterKind, type MasterRecord } from "@/features/masters/schemas";

interface MasterPageProps {
  description: string;
  kind: MasterKind;
}

export function MasterPage({ description, kind }: MasterPageProps) {
  const session = useDashboardSession();
  const canRead = hasPermission(session, "ReadMasters");
  const canWrite = hasPermission(session, "WriteMasters");
  const canDelete = hasPermission(session, "DelMasters");
  const mastersQuery = useMasters(kind, canRead);
  const deleteMutation = useDeleteMaster(kind);
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; recordId?: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterRecord | null>(null);
  const records = mastersQuery.data ?? [];
  const definition = masterDefinitions[kind];

  async function deleteRecord(): Promise<void> {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success(`${definition.singular.charAt(0).toUpperCase()}${definition.singular.slice(1)} eliminada.`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `No fue posible eliminar la ${definition.singular}.`);
    }
  }

  const columns: ColumnDef<MasterRecord, unknown>[] = [
    {
      id: "value",
      cell: ({ row }) => <span className="font-medium">{getMasterValue(kind, row.original) || "—"}</span>,
      header: "Descripción",
      meta: { mobileLabel: "Descripción" },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {canWrite ? <Button aria-label={`Editar ${getMasterValue(kind, row.original)}`} onClick={() => setEditor({ mode: "edit", recordId: row.original.id })} size="icon" type="button" variant="ghost"><Edit3 aria-hidden="true" className="size-4" /></Button> : null}
          {canDelete ? <Button aria-label={`Eliminar ${getMasterValue(kind, row.original)}`} onClick={() => setDeleteTarget(row.original)} size="icon" type="button" variant="ghost"><Trash2 aria-hidden="true" className="size-4 text-destructive" /></Button> : null}
        </div>
      ),
      header: "Acciones",
    },
  ];

  if (!canRead) {
    return <ForbiddenState />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader actions={canWrite ? <Button onClick={() => setEditor({ mode: "create" })} type="button"><Plus aria-hidden="true" className="size-4" />Crear {definition.singular}</Button> : undefined} description={description} title={definition.title} />
      {mastersQuery.isPending ? <ListSkeleton rows={5} /> : null}
      {!mastersQuery.isPending && mastersQuery.isError ? <ErrorState description={mastersQuery.error instanceof Error ? mastersQuery.error.message : `No fue posible cargar ${definition.title.toLocaleLowerCase()}.`} onRetry={() => void mastersQuery.refetch()} /> : null}
      {!mastersQuery.isPending && !mastersQuery.isError && records.length === 0 ? <EmptyState description={`No hay ${definition.title.toLocaleLowerCase()} configuradas.`} title={`No hay ${definition.title.toLocaleLowerCase()}`} /> : null}
      {!mastersQuery.isPending && !mastersQuery.isError && records.length > 0 ? <ResponsiveDataTable columns={columns} data={records} getCardTitle={(record) => getMasterValue(kind, record) || `${definition.singular} sin descripción`} getRowId={(record) => String(record.id)} label={`Listado de ${definition.title.toLocaleLowerCase()}`} /> : null}
      {editor ? <MasterEditorDialog kind={kind} mode={editor.mode} onOpenChange={(open) => { if (!open) setEditor(null); }} open recordId={editor.recordId} /> : null}
      <DestructiveConfirmationDialog
        isPending={deleteMutation.isPending}
        onConfirm={() => void deleteRecord()}
        onOpenChange={(open) => { if (!open && !deleteMutation.isPending) setDeleteTarget(null); }}
        open={deleteTarget !== null}
        recordLabel={deleteTarget ? `${getMasterValue(kind, deleteTarget) || definition.singular} (ID ${deleteTarget.id})` : `la ${definition.singular} seleccionada`}
        verificationText={deleteTarget ? String(deleteTarget.id) : undefined}
      />
    </div>
  );
}
