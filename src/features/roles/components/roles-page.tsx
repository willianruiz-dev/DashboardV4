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
import { RoleDetailsDialog, type RoleDetailView } from "@/features/roles/components/role-details-dialog";
import { RoleEditorDialog } from "@/features/roles/components/role-editor-dialog";
import { useDeleteRole, useRoles } from "@/features/roles/hooks";
import type { DashboardRole } from "@/features/roles/schemas";

function text(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() || fallback;
}

export function RolesPage() {
  const session = useDashboardSession();
  const canRead = hasPermission(session, "ReadRoles");
  const canWrite = hasPermission(session, "WriteRoles");
  const canDelete = hasPermission(session, "DelRoles");
  const rolesQuery = useRoles(canRead);
  const deleteRoleMutation = useDeleteRole();
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; roleId?: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardRole | null>(null);
  const [details, setDetails] = useState<{ role: DashboardRole; view: RoleDetailView } | null>(null);
  const roles = rolesQuery.data ?? [];

  async function deleteRole(): Promise<void> {
    if (!deleteTarget) {
      return;
    }
    try {
      await deleteRoleMutation.mutateAsync(deleteTarget.id);
      toast.success("Rol eliminado.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar el rol.");
    }
  }

  const columns: ColumnDef<DashboardRole, unknown>[] = [
    {
      accessorKey: "role",
      cell: ({ row }) => <span className="font-medium">{text(row.original.role)}</span>,
      header: "Rol",
      meta: { mobileLabel: "Rol" },
    },
    {
      id: "routes",
      cell: ({ row }) => (
        <Button
          aria-label={`Ver las ${row.original.routes.length} rutas de ${text(row.original.role)}`}
          onClick={() => setDetails({ role: row.original, view: "routes" })}
          type="button"
          variant="outline"
        >
          {row.original.routes.length} rutas
        </Button>
      ),
      header: "Rutas",
      meta: { mobileLabel: "Rutas" },
    },
    {
      id: "permissions",
      cell: ({ row }) => (
        <Button
          aria-label={`Ver los ${row.original.permissions.length} permisos de ${text(row.original.role)}`}
          onClick={() => setDetails({ role: row.original, view: "permissions" })}
          type="button"
          variant="outline"
        >
          {row.original.permissions.length} permisos
        </Button>
      ),
      header: "Permisos",
      meta: { mobileLabel: "Permisos" },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {canWrite ? <Button aria-label={`Editar ${text(row.original.role)}`} onClick={() => setEditor({ mode: "edit", roleId: row.original.id })} size="icon" type="button" variant="ghost"><Edit3 aria-hidden="true" className="size-4" /></Button> : null}
          {canDelete && row.original.id !== 1 ? <Button aria-label={`Eliminar ${text(row.original.role)}`} onClick={() => setDeleteTarget(row.original)} size="icon" type="button" variant="ghost"><Trash2 aria-hidden="true" className="size-4 text-destructive" /></Button> : null}
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
      <PageHeader actions={canWrite ? <Button onClick={() => setEditor({ mode: "create" })} type="button"><Plus aria-hidden="true" className="size-4" />Crear rol</Button> : undefined} description="Configura los roles, las rutas de navegación y los permisos operativos." title="Roles" />
      {rolesQuery.isPending ? <ListSkeleton rows={5} /> : null}
      {!rolesQuery.isPending && rolesQuery.isError ? <ErrorState description={rolesQuery.error instanceof Error ? rolesQuery.error.message : "No fue posible cargar los roles."} onRetry={() => void rolesQuery.refetch()} /> : null}
      {!rolesQuery.isPending && !rolesQuery.isError && roles.length === 0 ? <EmptyState description="No hay roles registrados." title="No hay roles" /> : null}
      {!rolesQuery.isPending && !rolesQuery.isError && roles.length > 0 ? <ResponsiveDataTable columns={columns} data={roles} getCardDescription={(role) => `${role.routes.length} rutas · ${role.permissions.length} permisos`} getCardTitle={(role) => text(role.role, "Rol sin nombre")} getRowId={(role) => String(role.id)} label="Listado de roles" /> : null}
      {details ? <RoleDetailsDialog onOpenChange={(open) => { if (!open) setDetails(null); }} onViewChange={(view) => setDetails((current) => current ? { ...current, view } : null)} open role={details.role} view={details.view} /> : null}
      {editor ? <RoleEditorDialog mode={editor.mode} onOpenChange={(open) => { if (!open) setEditor(null); }} open roleId={editor.roleId} /> : null}
      <DestructiveConfirmationDialog
        isPending={deleteRoleMutation.isPending}
        onConfirm={() => void deleteRole()}
        onOpenChange={(open) => { if (!open && !deleteRoleMutation.isPending) setDeleteTarget(null); }}
        open={deleteTarget !== null}
        recordLabel={deleteTarget ? `${text(deleteTarget.role)} (ID ${deleteTarget.id})` : "el rol seleccionado"}
        verificationText={deleteTarget ? String(deleteTarget.id) : undefined}
      />
    </div>
  );
}
