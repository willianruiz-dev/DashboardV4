"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCreateRole, usePermissionCatalog, useRole, useRoles, useRouteCatalog, useUpdateRole } from "@/features/roles/hooks";
import type { DashboardRole, RoleEditorFormValues, RoleMutation } from "@/features/roles/schemas";
import { roleEditorFormSchema } from "@/features/roles/schemas";

interface RoleEditorDialogProps {
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  open: boolean;
  roleId?: number;
}

function defaults(role?: DashboardRole): RoleEditorFormValues {
  return {
    permissionIds: role?.permissions.map((permission) => String(permission.id)) ?? [],
    role: role?.role ?? "",
    routeIds: role?.routes.map((route) => String(route.id)) ?? [],
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No fue posible cargar los datos del rol.";
}

function toggleId(ids: string[], value: string, checked: boolean): string[] {
  if (checked) {
    return ids.includes(value) ? ids : [...ids, value];
  }

  return ids.filter((id) => id !== value);
}

export function RoleEditorDialog({ mode, onOpenChange, open, roleId }: RoleEditorDialogProps) {
  const roleQuery = useRole(mode === "edit" ? (roleId ?? null) : null);
  const rolesQuery = useRoles();
  const routesQuery = useRouteCatalog();
  const permissionsQuery = usePermissionCatalog();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const form = useForm<RoleEditorFormValues>({
    defaultValues: defaults(),
    resolver: zodResolver(roleEditorFormSchema),
  });
  const role = mode === "edit" ? roleQuery.data : undefined;
  const isLoading = (mode === "edit" && roleQuery.isPending) || rolesQuery.isPending || routesQuery.isPending || permissionsQuery.isPending;
  const queryError = roleQuery.error ?? rolesQuery.error ?? routesQuery.error ?? permissionsQuery.error;
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open && (mode === "create" || role)) {
      form.reset(defaults(role));
    }
  }, [form, mode, open, role]);

  function close(): void {
    if (!isPending) {
      onOpenChange(false);
    }
  }

  async function onSubmit(values: RoleEditorFormValues): Promise<void> {
    const roleName = values.role.trim().toLocaleLowerCase();
    const duplicate = rolesQuery.data?.some((item) => item.id !== role?.id && item.role?.trim().toLocaleLowerCase() === roleName);
    if (duplicate) {
      form.setError("role", { message: "Ya existe un rol con este nombre." });
      return;
    }

    const selectedRoutes = routesQuery.data?.filter((route) => values.routeIds.includes(String(route.id))) ?? [];
    const selectedPermissions = permissionsQuery.data?.filter((permission) => values.permissionIds.includes(String(permission.id))) ?? [];
    const payload: RoleMutation = {
      id: role?.id ?? 0,
      idUserCreated: role?.idUserCreated ?? 0,
      idUserUpdated: role?.idUserUpdated ?? 0,
      permissions: selectedPermissions,
      role: values.role,
      routes: selectedRoutes,
      userCreated: role?.userCreated ?? null,
      userUpdated: role?.userUpdated ?? null,
    };

    try {
      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success("Rol creado con éxito.");
      } else {
        await updateMutation.mutateAsync(payload);
        toast.success("Rol actualizado con éxito.");
      }
      onOpenChange(false);
    } catch (error) {
      form.setError("root", { message: getErrorMessage(error) });
    }
  }

  return (
    <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())} open={open}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Crear rol" : "Editar rol"}</DialogTitle>
          <DialogDescription>Define el nombre del rol y los accesos disponibles para las personas que lo tengan asignado.</DialogDescription>
        </DialogHeader>
        {isLoading ? <ListSkeleton rows={5} /> : null}
        {!isLoading && queryError ? <ErrorState description={getErrorMessage(queryError)} onRetry={() => void Promise.all([roleQuery.refetch(), rolesQuery.refetch(), routesQuery.refetch(), permissionsQuery.refetch()])} /> : null}
        {!isLoading && !queryError ? (
          <Form {...form}>
            <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
              {form.formState.errors.root?.message ? <Alert role="alert" variant="destructive"><AlertDescription>{form.formState.errors.root.message}</AlertDescription></Alert> : null}
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem className="max-w-xl">
                  <FormLabel>Nombre del rol</FormLabel>
                  <FormControl><Input disabled={isPending} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid gap-5 lg:grid-cols-2">
                <FormField control={form.control} name="routeIds" render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>Rutas</FormLabel>
                    <div className="grid max-h-80 gap-1 overflow-y-auto rounded-md border p-2">
                      {routesQuery.data?.map((route) => {
                        const id = String(route.id);
                        return (
                          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-secondary" key={route.id}>
                            <FormControl><Checkbox checked={field.value.includes(id)} disabled={isPending} onCheckedChange={(checked) => field.onChange(toggleId(field.value, id, checked === true))} /></FormControl>
                            <span className="grid min-w-0 gap-0.5"><span className="truncate text-sm font-medium">{route.title ?? route.route ?? `Ruta ${route.id}`}</span><span className="truncate text-xs text-muted-foreground">{route.route ?? "Sin ruta"}</span></span>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="permissionIds" render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel>Permisos</FormLabel>
                    <div className="grid max-h-80 gap-1 overflow-y-auto rounded-md border p-2">
                      {permissionsQuery.data?.map((permission) => {
                        const id = String(permission.id);
                        return (
                          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-secondary" key={permission.id}>
                            <FormControl><Checkbox checked={field.value.includes(id)} disabled={isPending} onCheckedChange={(checked) => field.onChange(toggleId(field.value, id, checked === true))} /></FormControl>
                            <span className="grid min-w-0 gap-0.5"><span className="truncate text-sm font-medium">{permission.name ?? `Permiso ${permission.id}`}</span><span className="truncate text-xs text-muted-foreground">{permission.description ?? "Sin descripción"}</span></span>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button disabled={isPending} onClick={close} type="button" variant="outline">Cancelar</Button>
                <Button disabled={isPending} type="submit">{isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}{isPending ? "Guardando…" : mode === "create" ? "Crear rol" : "Guardar cambios"}</Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
