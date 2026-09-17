"use client";

import { Edit3 } from "lucide-react";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { EmptyState, ErrorState, ForbiddenState, ListSkeleton } from "@/components/shared/query-states";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveDataTable } from "@/components/shared/responsive-data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasPermission, useDashboardSession } from "@/features/auth/session-context";
import { RouteIconDialog } from "@/features/routes/components/route-icon-dialog";
import { useAdminRoutes } from "@/features/routes/hooks";
import type { DashboardRoute } from "@/features/routes/schemas";

function text(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() || fallback;
}

export function RoutesPage() {
  const session = useDashboardSession();
  const canRead = hasPermission(session, "ReadRoutes");
  const canWrite = hasPermission(session, "WriteRoutes");
  const routesQuery = useAdminRoutes(canRead);
  const [selectedRoute, setSelectedRoute] = useState<DashboardRoute | null>(null);
  const routes = routesQuery.data ?? [];
  const parentPathById = new Map(routes.map((route) => [route.id, route.route]));

  const columns: ColumnDef<DashboardRoute, unknown>[] = [
    {
      accessorKey: "title",
      cell: ({ row }) => <span className="font-medium">{text(row.original.title)}</span>,
      header: "Título",
      meta: { mobileLabel: "Título" },
    },
    {
      accessorKey: "route",
      cell: ({ row }) => <code className="text-sm text-muted-foreground">{text(row.original.route)}</code>,
      header: "Ruta",
      meta: { mobileLabel: "Ruta" },
    },
    {
      id: "parent",
      cell: ({ row }) => text(row.original.idFather ? parentPathById.get(row.original.idFather) : null, "Sin ruta padre"),
      header: "Ruta padre",
      meta: { mobileLabel: "Ruta padre" },
    },
    {
      accessorKey: "icon",
      cell: ({ row }) => <Badge variant="secondary">{text(row.original.icon, "Sin icono")}</Badge>,
      header: "Icono",
      meta: { mobileLabel: "Icono" },
    },
    {
      id: "actions",
      cell: ({ row }) => canWrite ? <Button aria-label={`Editar icono de ${text(row.original.route)}`} onClick={() => setSelectedRoute(row.original)} size="icon" type="button" variant="ghost"><Edit3 aria-hidden="true" className="size-4" /></Button> : null,
      header: "Acciones",
    },
  ];

  if (!canRead) {
    return <ForbiddenState />;
  }

  return (
    <div className="grid gap-6">
      <PageHeader description="Consulta las rutas configuradas y actualiza el identificador visual de cada una cuando tengas permiso de edición." title="Rutas" />
      {routesQuery.isPending ? <ListSkeleton rows={6} /> : null}
      {!routesQuery.isPending && routesQuery.isError ? <ErrorState description={routesQuery.error instanceof Error ? routesQuery.error.message : "No fue posible cargar las rutas."} onRetry={() => void routesQuery.refetch()} /> : null}
      {!routesQuery.isPending && !routesQuery.isError && routes.length === 0 ? <EmptyState description="No hay rutas configuradas." title="No hay rutas" /> : null}
      {!routesQuery.isPending && !routesQuery.isError && routes.length > 0 ? <ResponsiveDataTable columns={columns} data={routes} getCardDescription={(route) => `Padre: ${text(route.idFather ? parentPathById.get(route.idFather) : null, "sin ruta padre")}`} getCardTitle={(route) => text(route.title, route.route ?? "Ruta sin título")} getRowId={(route) => String(route.id)} label="Listado de rutas" /> : null}
      <RouteIconDialog onOpenChange={(open) => { if (!open) setSelectedRoute(null); }} open={selectedRoute !== null} route={selectedRoute} />
    </div>
  );
}
