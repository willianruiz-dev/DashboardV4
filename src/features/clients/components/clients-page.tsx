"use client";

import { Edit3, ExternalLink, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { BackendStaticImage } from "@/components/shared/backend-static-image";
import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { DestructiveConfirmationDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { ClientEditorDialog } from "@/features/clients/components/client-editor-dialog";
import { useClients, useDeleteClient } from "@/features/clients/hooks";
import type { DashboardClient } from "@/features/clients/schemas";
import { backendStaticFilePath } from "@/lib/api/backend";

function text(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() || fallback;
}

function ClientLogo({ client }: { client: DashboardClient }) {
  return (
    <BackendStaticImage
      alt={`Logo de ${text(client.name)}`}
      height={40}
      src={backendStaticFilePath(client.logoImg)}
      width={56}
    />
  );
}

export function ClientsPage() {
  const session = useDashboardSession();
  const canRead = hasPermission(session, "ReadClients");
  const canWrite = hasPermission(session, "WriteClients");
  const canDelete = hasPermission(session, "DelClients");
  const canReadOffices = hasPermission(session, "ReadOffices");
  const clientsQuery = useClients(canRead);
  const deleteClientMutation = useDeleteClient();
  const [editor, setEditor] = useState<{ clientId?: number; mode: "create" | "edit" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardClient | null>(null);
  const clients = clientsQuery.data ?? [];

  async function deleteClient(): Promise<void> {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteClientMutation.mutateAsync(deleteTarget.id);
      toast.success("Cliente y sus sucursales eliminados.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar el cliente.");
    }
  }

  const columns: ColumnDef<DashboardClient, unknown>[] = [
    {
      id: "logo",
      cell: ({ row }) => <ClientLogo client={row.original} />,
      header: "Logo",
      meta: { mobileHidden: true },
    },
    {
      accessorKey: "name",
      cell: ({ row }) => <span className="font-medium">{text(row.original.name)}</span>,
      header: "Nombre",
      meta: { mobileLabel: "Nombre" },
    },
    {
      accessorKey: "nit",
      cell: ({ row }) => text(row.original.nit),
      header: "NIT",
      meta: { mobileLabel: "NIT" },
    },
    {
      accessorKey: "email",
      cell: ({ row }) => text(row.original.email),
      header: "Correo",
      meta: { mobileLabel: "Correo" },
    },
    {
      accessorKey: "phone",
      cell: ({ row }) => text(row.original.phone),
      header: "Teléfono",
      meta: { mobileLabel: "Teléfono" },
    },
    {
      accessorKey: "region",
      cell: ({ row }) => text(row.original.region),
      header: "Región",
      meta: { mobileLabel: "Región" },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {canWrite ? (
            <Button aria-label={`Editar ${text(row.original.name)}`} onClick={() => setEditor({ clientId: row.original.id, mode: "edit" })} size="icon" type="button" variant="ghost">
              <Edit3 aria-hidden="true" className="size-4" />
            </Button>
          ) : null}
          {canDelete ? (
            <Button aria-label={`Eliminar ${text(row.original.name)}`} onClick={() => setDeleteTarget(row.original)} size="icon" type="button" variant="ghost">
              <Trash2 aria-hidden="true" className="size-4 text-destructive" />
            </Button>
          ) : null}
          {canReadOffices ? (
            <Button aria-label={`Ver sucursales de ${text(row.original.name)}`} asChild size="icon" variant="ghost">
              <Link href={`/dashboard/offices?clientId=${row.original.id}`}>
                <ExternalLink aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          ) : null}
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
      <PageHeader
        actions={
          canWrite ? (
            <Button onClick={() => setEditor({ mode: "create" })} type="button">
              <Plus aria-hidden="true" className="size-4" />
              Crear cliente
            </Button>
          ) : undefined
        }
        description="Administra clientes, sus datos de contacto y el acceso a sus sucursales."
        title="Clientes"
      />
      {clientsQuery.isPending ? <ListSkeleton rows={5} /> : null}
      {!clientsQuery.isPending && clientsQuery.isError ? <ErrorState description={clientsQuery.error instanceof Error ? clientsQuery.error.message : "No fue posible cargar los clientes."} onRetry={() => void clientsQuery.refetch()} /> : null}
      {!clientsQuery.isPending && !clientsQuery.isError && clients.length === 0 ? <EmptyState description="No hay clientes registrados." title="No hay clientes" /> : null}
      {!clientsQuery.isPending && !clientsQuery.isError && clients.length > 0 ? <ResponsiveDataTable columns={columns} data={clients} getCardDescription={(client) => `${text(client.nit)} · ${text(client.region)}`} getCardTitle={(client) => text(client.name, "Cliente sin nombre")} getRowId={(client) => String(client.id)} label="Listado de clientes" /> : null}
      {editor ? (
        <ClientEditorDialog
          clientId={editor.clientId}
          mode={editor.mode}
          onOpenChange={(open) => {
            if (!open) {
              setEditor(null);
            }
          }}
          open
        />
      ) : null}
      <DestructiveConfirmationDialog
        isPending={deleteClientMutation.isPending}
        onConfirm={() => void deleteClient()}
        onOpenChange={(open) => {
          if (!open && !deleteClientMutation.isPending) {
            setDeleteTarget(null);
          }
        }}
        open={deleteTarget !== null}
        recordLabel={deleteTarget ? `${text(deleteTarget.name)} (ID ${deleteTarget.id}) y sus sucursales` : "el cliente seleccionado"}
        verificationText={deleteTarget ? String(deleteTarget.id) : undefined}
      />
    </div>
  );
}
