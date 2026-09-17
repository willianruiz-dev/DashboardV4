"use client";

import { ArrowLeft, Edit3, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { DestructiveConfirmationDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { useLookupClients } from "@/features/lookups/hooks";
import { OfficeEditorDialog } from "@/features/offices/components/office-editor-dialog";
import { useDeleteOffice, useOfficesByClient } from "@/features/offices/hooks";
import type { DashboardOffice } from "@/features/offices/schemas";

function getClientId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isSafeInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function text(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() || fallback;
}

export function OfficesPage() {
  const session = useDashboardSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = getClientId(searchParams.get("clientId"));
  const canRead = hasPermission(session, "ReadOffices");
  const canWrite = hasPermission(session, "WriteOffices");
  const canDelete = hasPermission(session, "DelOffices");
  const canReadClients = hasPermission(session, "ReadClients");
  const clientsQuery = useLookupClients(canRead && canReadClients);
  const officesQuery = useOfficesByClient(clientId, canRead);
  const deleteOfficeMutation = useDeleteOffice();
  const [editor, setEditor] = useState<{ mode: "create" | "edit"; officeId?: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardOffice | null>(null);
  const offices = officesQuery.data ?? [];
  const selectedClient = clientsQuery.data?.find((client) => client.id === clientId);

  async function deleteOffice(): Promise<void> {
    if (!deleteTarget) {
      return;
    }

    try {
      await deleteOfficeMutation.mutateAsync(deleteTarget.id);
      toast.success("Sucursal eliminada.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar la sucursal.");
    }
  }

  const columns: ColumnDef<DashboardOffice, unknown>[] = [
    {
      accessorKey: "name",
      cell: ({ row }) => <span className="font-medium">{text(row.original.name)}</span>,
      header: "Nombre",
      meta: { mobileLabel: "Nombre" },
    },
    {
      accessorKey: "address",
      cell: ({ row }) => text(row.original.address),
      header: "Dirección",
      meta: { mobileLabel: "Dirección" },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {canWrite ? <Button aria-label={`Editar ${text(row.original.name)}`} onClick={() => setEditor({ mode: "edit", officeId: row.original.id })} size="icon" type="button" variant="ghost"><Edit3 aria-hidden="true" className="size-4" /></Button> : null}
          {canDelete ? <Button aria-label={`Eliminar ${text(row.original.name)}`} onClick={() => setDeleteTarget(row.original)} size="icon" type="button" variant="ghost"><Trash2 aria-hidden="true" className="size-4 text-destructive" /></Button> : null}
        </div>
      ),
      header: "Acciones",
    },
  ];

  if (!canRead) {
    return <ForbiddenState />;
  }

  if (!clientId) {
    return (
      <div className="grid gap-6">
        <PageHeader description="Selecciona el cliente al que pertenecen las sucursales que deseas consultar." title="Sucursales" />
        {clientsQuery.isPending ? <ListSkeleton rows={2} /> : null}
        {clientsQuery.isError ? <ErrorState description={clientsQuery.error instanceof Error ? clientsQuery.error.message : "No fue posible cargar los clientes."} onRetry={() => void clientsQuery.refetch()} /> : null}
        {!clientsQuery.isPending && !clientsQuery.isError ? (
          <Card>
            <CardHeader>
              <CardTitle>Selecciona un cliente</CardTitle>
              <CardDescription>Las sucursales se administran dentro del contexto de un cliente.</CardDescription>
            </CardHeader>
            <CardContent className="grid max-w-xl gap-3">
              {canReadClients ? (
                <Select onValueChange={(value) => router.replace(`/dashboard/offices?clientId=${value}`)}>
                  <SelectTrigger><SelectValue placeholder="Elige un cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientsQuery.data?.map((client) => <SelectItem key={client.id} value={String(client.id)}>{text(client.name, `Cliente ${client.id}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <EmptyState description="No tienes permiso para consultar clientes. Accede desde un cliente autorizado." title="Cliente requerido" />
              )}
              <Button asChild className="w-fit" variant="outline"><Link href="/dashboard/clients"><ArrowLeft aria-hidden="true" className="size-4" />Volver a clientes</Link></Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        actions={
          <>
            {canWrite ? <Button onClick={() => setEditor({ mode: "create" })} type="button"><Plus aria-hidden="true" className="size-4" />Crear sucursal</Button> : null}
            <Button asChild type="button" variant="outline"><Link href="/dashboard/clients"><ArrowLeft aria-hidden="true" className="size-4" />Clientes</Link></Button>
          </>
        }
        description={`Administra las sucursales de ${text(selectedClient?.name, `cliente ID ${clientId}`)}.`}
        title="Sucursales"
      />
      {officesQuery.isPending ? <ListSkeleton rows={4} /> : null}
      {!officesQuery.isPending && officesQuery.isError ? <ErrorState description={officesQuery.error instanceof Error ? officesQuery.error.message : "No fue posible cargar las sucursales."} onRetry={() => void officesQuery.refetch()} /> : null}
      {!officesQuery.isPending && !officesQuery.isError && offices.length === 0 ? <EmptyState description="El cliente no tiene sucursales registradas." title="No hay sucursales" /> : null}
      {!officesQuery.isPending && !officesQuery.isError && offices.length > 0 ? <ResponsiveDataTable columns={columns} data={offices} getCardTitle={(office) => text(office.name, "Sucursal sin nombre")} getRowId={(office) => String(office.id)} label="Listado de sucursales" /> : null}
      {editor ? <OfficeEditorDialog clientId={clientId} mode={editor.mode} officeId={editor.officeId} onOpenChange={(open) => { if (!open) setEditor(null); }} open /> : null}
      <DestructiveConfirmationDialog
        isPending={deleteOfficeMutation.isPending}
        onConfirm={() => void deleteOffice()}
        onOpenChange={(open) => { if (!open && !deleteOfficeMutation.isPending) setDeleteTarget(null); }}
        open={deleteTarget !== null}
        recordLabel={deleteTarget ? `${text(deleteTarget.name)} (ID ${deleteTarget.id})` : "la sucursal seleccionada"}
        verificationText={deleteTarget ? String(deleteTarget.id) : undefined}
      />
    </div>
  );
}
