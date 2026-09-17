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
import { useDenomination, useCreateDenomination, useUpdateDenomination } from "@/features/denominations/hooks";
import type { CurrencyDenomination, CurrencyDenominationMutation, DenominationFormValues } from "@/features/denominations/schemas";
import { denominationFormSchema } from "@/features/denominations/schemas";
import { useLookupCurrencies } from "@/features/lookups/hooks";
import { imageFileToBytes } from "@/lib/files/image";

interface DenominationEditorDialogProps {
  denominationId?: number;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function defaults(denomination?: CurrencyDenomination): DenominationFormValues {
  return {
    idCurrency: denomination?.idCurrency ? String(denomination.idCurrency) : "",
    imgExt: denomination?.imgExt ?? null,
    imgList: denomination?.imgList ?? [],
    value: denomination?.value ?? "",
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No fue posible cargar la denominación.";
}

export function DenominationEditorDialog({ denominationId, mode, onOpenChange, open }: DenominationEditorDialogProps) {
  const denominationQuery = useDenomination(mode === "edit" ? (denominationId ?? null) : null);
  const currenciesQuery = useLookupCurrencies();
  const createMutation = useCreateDenomination();
  const updateMutation = useUpdateDenomination();
  const form = useForm<DenominationFormValues>({
    defaultValues: defaults(),
    resolver: zodResolver(denominationFormSchema),
  });
  const denomination = mode === "edit" ? denominationQuery.data : undefined;
  const isLoading = currenciesQuery.isPending || (mode === "edit" && denominationQuery.isPending);
  const queryError = currenciesQuery.error ?? denominationQuery.error;
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open && (mode === "create" || denomination)) {
      form.reset(defaults(denomination));
    }
  }, [denomination, form, mode, open]);

  function close(): void {
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
      form.clearErrors("imgList");
      form.setValue("imgExt", image.extension, { shouldDirty: true });
      form.setValue("imgList", image.values, { shouldDirty: true, shouldValidate: true });
    } catch (error) {
      form.setError("imgList", { message: errorMessage(error) });
    }
  }

  async function onSubmit(values: DenominationFormValues): Promise<void> {
    if (mode === "create" && values.imgList.length === 0) {
      form.setError("imgList", { message: "La imagen de la denominación es obligatoria." });
      return;
    }

    const currency = currenciesQuery.data?.find((item) => item.id === Number(values.idCurrency));
    if (!currency) {
      form.setError("idCurrency", { message: "Selecciona una moneda válida." });
      return;
    }

    const payload: CurrencyDenominationMutation = {
      currency: currency.description ?? null,
      id: denomination?.id ?? 0,
      idCurrency: currency.id,
      idUserCreated: denomination?.idUserCreated ?? 0,
      idUserUpdated: denomination?.idUserUpdated ?? 0,
      img: denomination?.img ?? null,
      imgExt: values.imgExt,
      imgList: values.imgList,
      userCreated: denomination?.userCreated ?? null,
      userUpdated: denomination?.userUpdated ?? null,
      value: values.value,
    };

    try {
      if (mode === "create") {
        await createMutation.mutateAsync(payload);
        toast.success("Denominación creada con éxito.");
      } else {
        await updateMutation.mutateAsync(payload);
        toast.success("Denominación actualizada con éxito.");
      }
      onOpenChange(false);
    } catch (error) {
      form.setError("root", { message: errorMessage(error) });
    }
  }

  return (
    <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Crear denominación" : "Editar denominación"}</DialogTitle>
          <DialogDescription>Configura la moneda, el valor y la imagen que identifican la denominación.</DialogDescription>
        </DialogHeader>
        {isLoading ? <ListSkeleton rows={3} /> : null}
        {!isLoading && queryError ? <ErrorState description={errorMessage(queryError)} onRetry={() => void Promise.all([currenciesQuery.refetch(), denominationQuery.refetch()])} /> : null}
        {!isLoading && !queryError ? (
          <Form {...form}>
            <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
              {form.formState.errors.root?.message ? <Alert role="alert" variant="destructive"><AlertDescription>{form.formState.errors.root.message}</AlertDescription></Alert> : null}
              <FormField control={form.control} name="idCurrency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Moneda</FormLabel>
                  <Select disabled={isPending} onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una moneda" /></SelectTrigger></FormControl>
                    <SelectContent>{currenciesQuery.data?.map((currency) => <SelectItem key={currency.id} value={String(currency.id)}>{currency.description ?? `Moneda ${currency.id}`}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl><Input disabled={isPending} inputMode="numeric" pattern="[0-9]*" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="imgList" render={() => (
                <FormItem>
                  <FormLabel>Imagen de denominación</FormLabel>
                  <FormControl><Input accept="image/*" disabled={isPending} onChange={(event) => void onImageChange(event)} type="file" /></FormControl>
                  <p className="text-xs text-muted-foreground">{mode === "create" ? "Obligatoria. Sólo se aceptan archivos de imagen." : "Carga una imagen para reemplazar la actual."}</p>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button disabled={isPending} onClick={close} type="button" variant="outline">Cancelar</Button>
                <Button disabled={isPending} type="submit">{isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}{isPending ? "Guardando…" : mode === "create" ? "Crear denominación" : "Guardar cambios"}</Button>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
