"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DashboardRole } from "@/features/roles/schemas";

type RoleDetailView = "permissions" | "routes";

interface RoleDetailsDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  role: DashboardRole;
  view: RoleDetailView;
  onViewChange: (view: RoleDetailView) => void;
}

function routeLabel(route: DashboardRole["routes"][number]): string {
  return route.title?.trim() || route.route?.trim() || `Ruta #${route.id}`;
}

function permissionLabel(permission: DashboardRole["permissions"][number]): string {
  return permission.name?.trim() || permission.description?.trim() || `Permiso #${permission.id}`;
}

export function RoleDetailsDialog({ onOpenChange, onViewChange, open, role, view }: RoleDetailsDialogProps) {
  const isRoutes = view === "routes";
  const entries = isRoutes ? role.routes : role.permissions;
  const heading = isRoutes ? "Rutas asignadas" : "Permisos asignados";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Accesos de {role.role?.trim() || `rol #${role.id}`}</DialogTitle>
          <DialogDescription>Consulta las rutas y permisos incluidos en este rol.</DialogDescription>
        </DialogHeader>

        <div aria-label="Tipo de acceso" className="grid grid-cols-2 gap-2" role="tablist">
          <Button
            aria-controls="role-access-list"
            aria-selected={isRoutes}
            onClick={() => onViewChange("routes")}
            role="tab"
            type="button"
            variant={isRoutes ? "default" : "outline"}
          >
            Rutas <Badge className="ml-1" variant={isRoutes ? "secondary" : "outline"}>{role.routes.length}</Badge>
          </Button>
          <Button
            aria-controls="role-access-list"
            aria-selected={!isRoutes}
            onClick={() => onViewChange("permissions")}
            role="tab"
            type="button"
            variant={!isRoutes ? "default" : "outline"}
          >
            Permisos <Badge className="ml-1" variant={!isRoutes ? "secondary" : "outline"}>{role.permissions.length}</Badge>
          </Button>
        </div>

        <section aria-labelledby="role-access-heading" className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium" id="role-access-heading">{heading}</h2>
            <span className="text-xs text-muted-foreground">{entries.length} registrados</span>
          </div>

          <ul className="grid max-h-80 gap-2 overflow-y-auto pr-1" id="role-access-list" role="tabpanel">
            {isRoutes
              ? role.routes.map((route) => (
                  <li className="rounded-md border bg-card p-3" key={route.id}>
                    <p className="font-medium">{routeLabel(route)}</p>
                    {route.route && route.title && route.route !== route.title ? <p className="mt-1 break-all text-sm text-muted-foreground">{route.route}</p> : null}
                  </li>
                ))
              : role.permissions.map((permission) => (
                  <li className="rounded-md border bg-card p-3" key={permission.id}>
                    <p className="font-medium">{permissionLabel(permission)}</p>
                    {permission.description && permission.name && permission.description !== permission.name ? <p className="mt-1 text-sm text-muted-foreground">{permission.description}</p> : null}
                  </li>
                ))}
            {entries.length === 0 ? <li className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Este rol no tiene {isRoutes ? "rutas" : "permisos"} asignados.</li> : null}
          </ul>
        </section>
      </DialogContent>
    </Dialog>
  );
}

export type { RoleDetailView };
