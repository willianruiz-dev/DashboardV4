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
import { useCreateMaster, useMaster, useUpdateMaster } from "@/features/masters/hooks";
import { getMasterValue, masterDefinitions, masterEditorFormSchema, type MasterEditorFormValues, type MasterKind, type MasterMutation, type MasterRecord } from "@/features/masters/schemas";

interface MasterEditorDialogProps {
  kind: MasterKind;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  open: boolean;
  recordId?: number;
}

function defaults(kind: MasterKind, record?: MasterRecord): MasterEditorFormValues {
  return { value: record ? getMasterValue(kind, record) : "" };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No fue posible cargar el registro.";
}

export function MasterEditorDialog({ kind, mode, onOpenChange, open, recordId }: MasterEditorDialogProps) {
  const recordQuery = useMaster(kind, mode === "edit" ? (recordId ?? null) : null);
  const createMutation = useCreateMaster(kind);
  const updateMutation = useUpdateMaster(kind);
  const form = useForm<MasterEditorFormValues>({
    defaultValues: defaults(kind),
    resolver: zodResolver(masterEditorFormSchema),
  });
  const record = mode === "edit" ? recordQuery.data : undefined;
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open && (mode === "create" || record)) {
      form.reset(defaults(kind, record));
    }
  }, [form, kind, mode, open, record]);

  function close(): void {
    if (!isPending) {
      onOpenChange(false);
    }
  }

  async function onSubmit(values: MasterEditorFormValues): Promise<void> {
    const definition = masterDefinitions[kind];
    const payload: MasterMutation = {
      description: record?.description ?? null,
      id: record?.id ?? 0,
      idUserCreated: record?.idUserCreated ?? 0,
      idUserUpdated: record?.idUserUpdated ?? 0,
      name: record?.name ?? null,
      typeDocument: record?.typeDocument ?? null,
      userCreated: record?.userCreated ?? null,
      userUpdated: record?.userUpdated ?? null,
      [definition.field]: values.value,
    };

    try {
      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success(`${definition.singular.charAt(0).toUpperCase()}${definition.singular.slice(1)} creada con éxito.`);
      } else {
        await updateMutation.mutateAsync(payload);
        toast.success(`${definition.singular.charAt(0).toUpperCase()}${definition.singular.slice(1)} actualizada con éxito.`);
      }
      onOpenChange(false);
    } catch (error) {
      form.setError("root", { message: errorMessage(error) });
    }
  }

  const definition = masterDefinitions[kind];
  return (
    <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? `Crear ${definition.singular}` : `Editar ${definition.singular}`}</DialogTitle>
          <DialogDescription>Especifica el valor que se mostrará en las listas del dashboard.</DialogDescription>
        </DialogHeader>
        {recordQuery.isPending && mode === "edit" ? <ListSkeleton rows={2} /> : null}
        {recordQuery.isError && mode === "edit" ? <ErrorState description={errorMessage(recordQuery.error)} onRetry={() => void recordQuery.refetch()} /> : null}
        {(!recordQuery.isPending || mode === "create") && !recordQuery.isError ? (
          <Form {...form}>
            <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
              {form.formState.errors.root?.message ? <Alert role="alert" variant="destructive"><AlertDescription>{form.formState.errors.root.message}</AlertDescription></Alert> : null}
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl><Input disabled={isPending} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button disabled={isPending} onClick={close} type="button" variant="outline">Cancelar</Button>
                <Button disabled={isPending} type="submit">{isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}{isPending ? "Guardando…" : mode === "create" ? "Crear" : "Guardar cambios"}</Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
