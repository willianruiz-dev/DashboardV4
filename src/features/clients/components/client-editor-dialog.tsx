"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { type ChangeEvent, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLookupRegions } from "@/features/lookups/hooks";
import { useClient, useCreateClient, useUpdateClient } from "@/features/clients/hooks";
import type { ClientEditorFormValues, ClientMutation, DashboardClient } from "@/features/clients/schemas";
import { clientEditorFormSchema } from "@/features/clients/schemas";
import { imageFileToBytes } from "@/lib/files/image";

interface ClientEditorDialogProps {
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  open: boolean;
  clientId?: number;
}

function createDefaults(client?: DashboardClient): ClientEditorFormValues {
  return {
    email: client?.email ?? "",
    idRegion: client?.idRegion ? String(client.idRegion) : "",
    imgExt: client?.imgExt ?? null,
    logoImgList: client?.logoImgList ?? [],
    name: client?.name ?? "",
    nit: client?.nit ?? "",
    phone: client?.phone ?? "",
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No fue posible obtener los datos del formulario.";
}

export function ClientEditorDialog({ mode, onOpenChange, clientId, open }: ClientEditorDialogProps) {
  const clientQuery = useClient(mode === "edit" ? (clientId ?? null) : null);
  const regionsQuery = useLookupRegions();
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const form = useForm<ClientEditorFormValues>({
    defaultValues: createDefaults(),
    resolver: zodResolver(clientEditorFormSchema),
  });
  const client = mode === "edit" ? clientQuery.data : undefined;
  const isLoading = regionsQuery.isPending || (mode === "edit" && clientQuery.isPending);
  const formError = regionsQuery.error ?? clientQuery.error;
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open && (mode === "create" || client)) {
      form.reset(createDefaults(client));
    }
  }, [client, form, mode, open]);

  function closeDialog(): void {
    if (!isPending) {
      onOpenChange(false);
    }
  }

  async function onImageChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.item(0);
    if (!file) {
      return;
    }

    try {
      const image = await imageFileToBytes(file);
      form.clearErrors("logoImgList");
      form.setValue("imgExt", image.extension, { shouldDirty: true });
      form.setValue("logoImgList", image.values, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      form.setError("logoImgList", { message: errorMessage(error) });
    }
  }

  async function onSubmit(values: ClientEditorFormValues): Promise<void> {
    const region = regionsQuery.data?.find((item) => item.id === Number(values.idRegion));
    if (!region) {
      form.setError("idRegion", { message: "Selecciona una región válida." });
      return;
    }

    const payload: ClientMutation = {
      email: values.email,
      id: client?.id ?? 0,
      idRegion: region.id,
      idUserCreated: client?.idUserCreated ?? 0,
      idUserUpdated: client?.idUserUpdated ?? 0,
      imgExt: values.imgExt,
      logoImg: client?.logoImg ?? null,
      logoImgList: values.logoImgList,
      name: values.name,
      nit: values.nit,
      phone: values.phone || null,
      region: region.name ?? null,
      userCreated: client?.userCreated ?? null,
      userUpdated: client?.userUpdated ?? null,
    };

    try {
      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success("Cliente creado con éxito.");
      } else {
        await updateMutation.mutateAsync(payload);
        toast.success("Cliente actualizado con éxito.");
      }
      onOpenChange(false);
    } catch (error) {
      form.setError("root", { message: errorMessage(error) });
    }
  }

  return (
    <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeDialog())} open={open}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Crear cliente" : "Editar cliente"}</DialogTitle>
          <DialogDescription>Completa la información de identificación y contacto del cliente.</DialogDescription>
        </DialogHeader>
        {isLoading ? <ListSkeleton rows={4} /> : null}
        {!isLoading && formError ? <ErrorState description={errorMessage(formError)} onRetry={() => void Promise.all([regionsQuery.refetch(), clientQuery.refetch()])} /> : null}
        {!isLoading && !formError ? (
          <Form {...form}>
            <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
              {form.formState.errors.root?.message ? (
                <Alert role="alert" variant="destructive">
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl><Input disabled={isPending} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIT</FormLabel>
                      <FormControl><Input disabled={isPending} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl><Input disabled={isPending} inputMode="email" type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl><Input disabled={isPending} inputMode="tel" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="idRegion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Región</FormLabel>
                      <Select disabled={isPending} onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una región" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {regionsQuery.data?.map((region) => (
                            <SelectItem key={region.id} value={String(region.id)}>{region.name ?? `Región ${region.id}`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="logoImgList"
                  render={() => (
                    <FormItem>
                      <FormLabel>Logo</FormLabel>
                      <FormControl><Input accept="image/*" disabled={isPending} onChange={(event) => void onImageChange(event)} type="file" /></FormControl>
                      <p className="text-xs text-muted-foreground">Opcional. Sólo se aceptan archivos de imagen.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button disabled={isPending} onClick={closeDialog} type="button" variant="outline">Cancelar</Button>
                <Button disabled={isPending} type="submit">
                  {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}
                  {isPending ? "Guardando…" : mode === "create" ? "Crear cliente" : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
