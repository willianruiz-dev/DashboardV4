"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCreateOffice, useOffice, useUpdateOffice } from "@/features/offices/hooks";
import type { DashboardOffice, OfficeEditorFormValues, OfficeMutation } from "@/features/offices/schemas";
import { officeEditorFormSchema } from "@/features/offices/schemas";

interface OfficeEditorDialogProps {
  clientId: number;
  mode: "create" | "edit";
  officeId?: number;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function defaults(office?: DashboardOffice): OfficeEditorFormValues {
  return {
    address: office?.address ?? "",
    name: office?.name ?? "",
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No fue posible cargar la sucursal.";
}

export function OfficeEditorDialog({ clientId, mode, officeId, onOpenChange, open }: OfficeEditorDialogProps) {
  const officeQuery = useOffice(mode === "edit" ? (officeId ?? null) : null);
  const createMutation = useCreateOffice();
  const updateMutation = useUpdateOffice();
  const form = useForm<OfficeEditorFormValues>({
    defaultValues: defaults(),
    resolver: zodResolver(officeEditorFormSchema),
  });
  const office = mode === "edit" ? officeQuery.data : undefined;
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open && (mode === "create" || office)) {
      form.reset(defaults(office));
    }
  }, [form, mode, office, open]);

  function close(): void {
    if (!isPending) {
      onOpenChange(false);
    }
  }

  async function onSubmit(values: OfficeEditorFormValues): Promise<void> {
    const payload: OfficeMutation = {
      address: values.address,
      id: office?.id ?? 0,
      idClient: clientId,
      idUserCreated: office?.idUserCreated ?? 0,
      idUserUpdated: office?.idUserUpdated ?? 0,
      name: values.name,
      userCreated: office?.userCreated ?? null,
      userUpdated: office?.userUpdated ?? null,
    };

    try {
      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success("Sucursal creada con éxito.");
      } else {
        await updateMutation.mutateAsync(payload);
        toast.success("Sucursal actualizada con éxito.");
      }
      onOpenChange(false);
    } catch (error) {
      form.setError("root", { message: getErrorMessage(error) });
    }
  }

  return (
    <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Crear sucursal" : "Editar sucursal"}</DialogTitle>
          <DialogDescription>Registra la información operativa de esta sucursal.</DialogDescription>
        </DialogHeader>
        {officeQuery.isPending && mode === "edit" ? <ListSkeleton rows={2} /> : null}
        {officeQuery.isError && mode === "edit" ? <ErrorState description={getErrorMessage(officeQuery.error)} onRetry={() => void officeQuery.refetch()} /> : null}
        {(!officeQuery.isPending || mode === "create") && !officeQuery.isError ? (
          <Form {...form}>
            <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
              {form.formState.errors.root?.message ? <Alert role="alert" variant="destructive"><AlertDescription>{form.formState.errors.root.message}</AlertDescription></Alert> : null}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la sucursal</FormLabel>
                  <FormControl><Input disabled={isPending} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl><Input disabled={isPending} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button disabled={isPending} onClick={close} type="button" variant="outline">Cancelar</Button>
                <Button disabled={isPending} type="submit">
                  {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}
                  {isPending ? "Guardando…" : mode === "create" ? "Crear sucursal" : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
