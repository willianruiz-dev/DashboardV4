"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { ErrorState, ListSkeleton } from "@/components/shared/query-states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useCreatePaypadConfiguration, usePaypadConfiguration, useUpdatePaypadConfiguration } from "@/features/paypads/hooks";
import { getPaypadDisplayName } from "@/features/paypads/paypad-display";
import { paypadConfigurationFormSchema, type PayPad, type PayPadConfiguration, type PayPadConfigurationFormValues, type PayPadConfigurationMutation } from "@/features/paypads/schemas";
import { ClientApiError } from "@/lib/api/client";

interface PayPadConfigurationDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  paypad: PayPad | null;
}

const initialValues: PayPadConfigurationFormValues = {
  arduinoPort: "",
  debug: false,
  dispenserDenominations: "",
  dispenserPort: "",
  extraDataJson: [],
  meiPort: "",
  printerPort: "",
  scannerPort: "",
  validatePeripherals: false,
};

function defaults(configuration?: PayPadConfiguration): PayPadConfigurationFormValues {
  return {
    arduinoPort: configuration?.arduinoPort ?? "",
    debug: configuration?.debug ?? false,
    dispenserDenominations: configuration?.dispenserDenominations ?? "",
    dispenserPort: configuration?.dispenserPort ?? "",
    extraDataJson: configuration?.extraDataJson ?? [],
    meiPort: configuration?.meiPort ?? "",
    printerPort: configuration?.printerPort ?? "",
    scannerPort: configuration?.scannerPort ?? "",
    validatePeripherals: configuration?.validatePeripherals ?? false,
  };
}

function isNotFound(error: unknown): boolean {
  return error instanceof ClientApiError && error.status === 404;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No fue posible cargar la configuración.";
}

export function PayPadConfigurationDialog({ onOpenChange, open, paypad }: PayPadConfigurationDialogProps) {
  const configurationQuery = usePaypadConfiguration(paypad?.id ?? null);
  const createMutation = useCreatePaypadConfiguration();
  const updateMutation = useUpdatePaypadConfiguration();
  const form = useForm<PayPadConfigurationFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(paypadConfigurationFormSchema),
  });
  const extraData = useFieldArray({ control: form.control, name: "extraDataJson" });
  const configuration = configurationQuery.data;
  const isPending = createMutation.isPending || updateMutation.isPending;
  const blockingError = configurationQuery.error && !isNotFound(configurationQuery.error) ? configurationQuery.error : null;

  useEffect(() => {
    if (open && (!configurationQuery.isPending || configuration)) {
      form.reset(defaults(configuration));
    }
  }, [configuration, configurationQuery.isPending, form, open]);

  function close(): void {
    if (!isPending) {
      onOpenChange(false);
    }
  }

  async function onSubmit(values: PayPadConfigurationFormValues): Promise<void> {
    if (!paypad) {
      return;
    }

    const payload: PayPadConfigurationMutation = {
      ...values,
      idPaypad: paypad.id,
    };

    try {
      if (configuration) {
        await updateMutation.mutateAsync({
          ...payload,
          id: configuration.id,
          idUserCreated: configuration.idUserCreated ?? 0,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success("Configuración de Pay+ actualizada.");
      onOpenChange(false);
    } catch (error) {
      form.setError("root", { message: getErrorMessage(error) });
    }
  }

  return (
    <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())} open={open}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Configuración de Pay+</DialogTitle>
          <DialogDescription>Configura puertos, banderas operativas y datos adicionales para {getPaypadDisplayName(paypad)}.</DialogDescription>
        </DialogHeader>
        {configurationQuery.isPending ? <ListSkeleton rows={5} /> : null}
        {!configurationQuery.isPending && blockingError ? <ErrorState description={getErrorMessage(blockingError)} onRetry={() => void configurationQuery.refetch()} /> : null}
        {!configurationQuery.isPending && !blockingError ? (
          <Form {...form}>
            <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
              {isNotFound(configurationQuery.error) ? <Alert><AlertDescription>No existe una configuración previa. Al guardar se creará una nueva.</AlertDescription></Alert> : null}
              {form.formState.errors.root?.message ? <Alert role="alert" variant="destructive"><AlertDescription>{form.formState.errors.root.message}</AlertDescription></Alert> : null}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FormField control={form.control} name="scannerPort" render={({ field }) => <FormItem><FormLabel>Puerto del scanner</FormLabel><FormControl><Input disabled={isPending} {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="arduinoPort" render={({ field }) => <FormItem><FormLabel>Puerto de Arduino</FormLabel><FormControl><Input disabled={isPending} {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="meiPort" render={({ field }) => <FormItem><FormLabel>Puerto MEI</FormLabel><FormControl><Input disabled={isPending} {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="dispenserPort" render={({ field }) => <FormItem><FormLabel>Puerto del dispensador</FormLabel><FormControl><Input disabled={isPending} {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="printerPort" render={({ field }) => <FormItem><FormLabel>Puerto de impresora</FormLabel><FormControl><Input disabled={isPending} {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="dispenserDenominations" render={({ field }) => <FormItem><FormLabel>Denominaciones del dispensador</FormLabel><FormControl><Input disabled={isPending} {...field} /></FormControl><FormMessage /></FormItem>} />
              </div>
              <div className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
                <FormField control={form.control} name="debug" render={({ field }) => <FormItem className="flex min-h-11 flex-row items-center justify-between gap-3"><div className="grid gap-1"><FormLabel>Debug</FormLabel><p className="text-xs text-muted-foreground">Activa sólo en diagnósticos controlados.</p></div><FormControl><Switch checked={field.value} disabled={isPending} onCheckedChange={field.onChange} /></FormControl></FormItem>} />
                <FormField control={form.control} name="validatePeripherals" render={({ field }) => <FormItem className="flex min-h-11 flex-row items-center justify-between gap-3"><div className="grid gap-1"><FormLabel>Validar periféricos</FormLabel><p className="text-xs text-muted-foreground">Comprueba los periféricos antes de operar.</p></div><FormControl><Switch checked={field.value} disabled={isPending} onCheckedChange={field.onChange} /></FormControl></FormItem>} />
              </div>
              <div className="grid gap-3 rounded-md border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Datos adicionales</h3><p className="text-sm text-muted-foreground">Agrega pares clave y valor requeridos por la configuración.</p></div><Button disabled={isPending} onClick={() => extraData.append({ key: "", value: "" })} type="button" variant="outline"><Plus aria-hidden="true" className="size-4" />Agregar</Button></div>
                {extraData.fields.length === 0 ? <p className="text-sm text-muted-foreground">No hay datos adicionales configurados.</p> : null}
                {extraData.fields.map((item, index) => <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" key={item.id}>
                  <FormField control={form.control} name={`extraDataJson.${index}.key`} render={({ field }) => <FormItem><FormLabel className="sr-only">Clave {index + 1}</FormLabel><FormControl><Input disabled={isPending} placeholder="Clave" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name={`extraDataJson.${index}.value`} render={({ field }) => <FormItem><FormLabel className="sr-only">Valor {index + 1}</FormLabel><FormControl><Input disabled={isPending} placeholder="Valor" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <Button aria-label={`Eliminar dato adicional ${index + 1}`} disabled={isPending} onClick={() => extraData.remove(index)} size="icon" type="button" variant="ghost"><Trash2 aria-hidden="true" className="size-4 text-destructive" /></Button>
                </div>)}
              </div>
              <DialogFooter>
                <Button disabled={isPending} onClick={close} type="button" variant="outline">Cancelar</Button>
                <Button disabled={isPending} type="submit">{isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}{isPending ? "Guardando…" : "Guardar configuración"}</Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
