"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLookupClients, useLookupCurrencies, useLookupOffices } from "@/features/lookups/hooks";
import { useOffice } from "@/features/offices/hooks";
import { useCreatePaypad, usePaypad, usePaypads, useUpdatePaypad } from "@/features/paypads/hooks";
import { getPaypadMachineName } from "@/features/paypads/paypad-display";
import type { PayPad, PayPadCreateRequest, PayPadEditorFormValues, PayPadMutation } from "@/features/paypads/schemas";
import { paypadEditorFormSchema } from "@/features/paypads/schemas";

interface PayPadEditorDialogProps {
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  open: boolean;
  paypadId?: number;
}

function parseId(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function defaults(mode: "create" | "edit", paypad?: PayPad, clientId?: number): PayPadEditorFormValues {
  const sharedValues = {
    clientId: clientId ? String(clientId) : "",
    description: paypad?.description ?? "",
    idCurrency: paypad?.idCurrency ? String(paypad.idCurrency) : "",
    idOffice: paypad?.idOffice ? String(paypad.idOffice) : "",
    latitude: paypad?.latitude ?? "",
    longitude: paypad?.longitude ?? "",
    status: Boolean(paypad?.status ?? 1),
    username: getPaypadMachineName(paypad) ?? "",
  };

  return mode === "create"
    ? { ...sharedValues, mode: "create", password: "", passwordConfirmation: "" }
    : { ...sharedValues, mode: "edit", password: "", passwordConfirmation: "" };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No fue posible cargar los datos del Pay+.";
}

export function PayPadEditorDialog({ mode, onOpenChange, open, paypadId }: PayPadEditorDialogProps) {
  const paypadQuery = usePaypad(mode === "edit" ? (paypadId ?? null) : null);
  const paypadsQuery = usePaypads();
  const currenciesQuery = useLookupCurrencies();
  const clientsQuery = useLookupClients();
  const createMutation = useCreatePaypad();
  const updateMutation = useUpdatePaypad();
  const form = useForm<PayPadEditorFormValues>({
    defaultValues: defaults(mode),
    resolver: zodResolver(paypadEditorFormSchema),
  });
  const paypad = mode === "edit" ? paypadQuery.data : undefined;
  const officeDetailQuery = useOffice(mode === "edit" && paypad ? paypad.idOffice : null);
  const selectedClientId = parseId(useWatch({ control: form.control, name: "clientId" }));
  const officesQuery = useLookupOffices(selectedClientId, selectedClientId !== null);
  const inferredClientId = officeDetailQuery.data?.idClient;
  const isPending = createMutation.isPending || updateMutation.isPending;
  const isLoading =
    paypadsQuery.isPending ||
    currenciesQuery.isPending ||
    clientsQuery.isPending ||
    (mode === "edit" && paypadQuery.isPending) ||
    (mode === "edit" && paypad !== undefined && officeDetailQuery.isPending) ||
    (selectedClientId !== null && officesQuery.isPending);
  const queryError = paypadsQuery.error ?? currenciesQuery.error ?? clientsQuery.error ?? paypadQuery.error ?? officeDetailQuery.error ?? officesQuery.error;

  useEffect(() => {
    if (!open || (mode === "edit" && !paypad)) {
      return;
    }
    if (mode === "edit" && paypad && !inferredClientId) {
      return;
    }

    form.reset(defaults(mode, paypad, inferredClientId));
  }, [form, inferredClientId, mode, open, paypad]);

  function close(): void {
    if (!isPending) {
      onOpenChange(false);
    }
  }

  async function onSubmit(values: PayPadEditorFormValues): Promise<void> {
    const officeId = parseId(values.idOffice);
    const currencyId = parseId(values.idCurrency);
    if (!officeId || !currencyId) {
      form.setError("root", { message: "Selecciona una moneda y una sucursal válidas." });
      return;
    }

    const duplicate = paypadsQuery.data?.some(
      (item) => item.id !== paypad?.id && getPaypadMachineName(item)?.toLocaleLowerCase() === values.username.trim().toLocaleLowerCase(),
    );
    if (duplicate) {
      form.setError("username", { message: "Ya existe un Pay+ con este nombre." });
      return;
    }

    const currency = currenciesQuery.data?.find((item) => item.id === currencyId);
    const office = officesQuery.data?.find((item) => item.id === officeId);
    if (!currency || !office) {
      form.setError("root", { message: "La moneda o sucursal seleccionada no está disponible para este cliente." });
      return;
    }

    const payload = {
      currency: currency.description ?? null,
      description: values.description,
      id: paypad?.id ?? 0,
      idCurrency: currency.id,
      idOffice: office.id,
      idUserCreated: paypad?.idUserCreated ?? 0,
      idUserUpdated: paypad?.idUserUpdated ?? 0,
      latitude: values.latitude,
      longitude: values.longitude,
      office: office.name ?? null,
      status: Number(values.status),
      userCreated: paypad?.userCreated ?? null,
      userUpdated: paypad?.userUpdated ?? null,
      username: values.username,
    };

    try {
      if (values.mode === "create") {
        const createPayload: PayPadCreateRequest = { ...payload, pwd: values.password };
        await createMutation.mutateAsync(createPayload);
        toast.success("Pay+ creado con éxito.");
      } else {
        const updatePayload: PayPadMutation = { ...payload, pwd: null };
        await updateMutation.mutateAsync(updatePayload);
        toast.success("Pay+ actualizado con éxito.");
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
          <DialogTitle>{mode === "create" ? "Crear Pay+" : "Editar Pay+"}</DialogTitle>
          <DialogDescription>Configura identidad, ubicación, moneda y sucursal de operación del Pay+.</DialogDescription>
        </DialogHeader>
        {isLoading ? <ListSkeleton rows={5} /> : null}
        {!isLoading && queryError ? <ErrorState description={getErrorMessage(queryError)} onRetry={() => void Promise.all([paypadQuery.refetch(), paypadsQuery.refetch(), currenciesQuery.refetch(), clientsQuery.refetch(), officeDetailQuery.refetch(), officesQuery.refetch()])} /> : null}
        {!isLoading && !queryError ? (
          <Form {...form}>
            <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
              {form.formState.errors.root?.message ? <Alert role="alert" variant="destructive"><AlertDescription>{form.formState.errors.root.message}</AlertDescription></Alert> : null}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FormField control={form.control} name="username" render={({ field }) => <FormItem><FormLabel>Nombre Pay+</FormLabel><FormControl><Input disabled={isPending} {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="description" render={({ field }) => <FormItem><FormLabel>Descripción</FormLabel><FormControl><Input disabled={isPending} {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="longitude" render={({ field }) => <FormItem><FormLabel>Longitud geográfica</FormLabel><FormControl><Input disabled={isPending} inputMode="decimal" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="latitude" render={({ field }) => <FormItem><FormLabel>Latitud geográfica</FormLabel><FormControl><Input disabled={isPending} inputMode="decimal" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="idCurrency" render={({ field }) => <FormItem><FormLabel>Moneda</FormLabel><Select disabled={isPending} onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona una moneda" /></SelectTrigger></FormControl><SelectContent>{currenciesQuery.data?.map((currency) => <SelectItem key={currency.id} value={String(currency.id)}>{currency.description ?? `Moneda ${currency.id}`}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                <FormField control={form.control} name="clientId" render={({ field }) => <FormItem><FormLabel>Cliente</FormLabel><Select disabled={isPending} onValueChange={(value) => { field.onChange(value); form.setValue("idOffice", "", { shouldDirty: true, shouldValidate: true }); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger></FormControl><SelectContent>{clientsQuery.data?.map((client) => <SelectItem key={client.id} value={String(client.id)}>{client.name ?? `Cliente ${client.id}`}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                <FormField control={form.control} name="idOffice" render={({ field }) => <FormItem><FormLabel>Sucursal</FormLabel><Select disabled={isPending || selectedClientId === null} onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={selectedClientId === null ? "Selecciona primero un cliente" : "Selecciona una sucursal"} /></SelectTrigger></FormControl><SelectContent>{officesQuery.data?.map((office) => <SelectItem key={office.id} value={String(office.id)}>{office.name ?? `Sucursal ${office.id}`}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>} />
                <FormField control={form.control} name="status" render={({ field }) => <FormItem className="flex min-h-11 flex-row items-center justify-between rounded-md border px-3 py-2"><div className="grid gap-1"><FormLabel>Pay+ activo</FormLabel><p className="text-xs text-muted-foreground">Permite su operación.</p></div><FormControl><Switch checked={field.value} disabled={isPending} onCheckedChange={field.onChange} /></FormControl></FormItem>} />
              </div>
              {mode === "create" ? <div className="grid gap-4 border-t pt-5 md:grid-cols-2"><FormField control={form.control} name="password" render={({ field }) => <FormItem><FormLabel>Contraseña inicial</FormLabel><FormControl><Input autoComplete="new-password" disabled={isPending} type="password" {...field} /></FormControl><FormMessage /></FormItem>} /><FormField control={form.control} name="passwordConfirmation" render={({ field }) => <FormItem><FormLabel>Confirmar contraseña</FormLabel><FormControl><Input autoComplete="new-password" disabled={isPending} type="password" {...field} /></FormControl><FormMessage /></FormItem>} /></div> : null}
              <DialogFooter>
                <Button disabled={isPending} onClick={close} type="button" variant="outline">Cancelar</Button>
                <Button disabled={isPending} type="submit">{isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}{isPending ? "Guardando…" : mode === "create" ? "Crear Pay+" : "Guardar cambios"}</Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
