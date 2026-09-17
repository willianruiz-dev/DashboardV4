"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useUpdateRoute } from "@/features/routes/hooks";
import type { DashboardRoute, RouteIconFormValues } from "@/features/routes/schemas";
import { routeIconFormSchema } from "@/features/routes/schemas";

interface RouteIconDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  route: DashboardRoute | null;
}

export function RouteIconDialog({ onOpenChange, open, route }: RouteIconDialogProps) {
  const updateMutation = useUpdateRoute();
  const form = useForm<RouteIconFormValues>({
    defaultValues: { icon: route?.icon ?? "" },
    resolver: zodResolver(routeIconFormSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({ icon: route?.icon ?? "" });
    }
  }, [form, open, route]);

  function close(): void {
    if (!updateMutation.isPending) {
      onOpenChange(false);
    }
  }

  async function onSubmit(values: RouteIconFormValues): Promise<void> {
    if (!route) {
      return;
    }

    try {
      await updateMutation.mutateAsync({ ...route, icon: values.icon });
      toast.success("Icono de ruta actualizado.");
      onOpenChange(false);
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "No fue posible actualizar la ruta." });
    }
  }

  return (
    <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Actualizar icono</DialogTitle>
          <DialogDescription>Modifica únicamente el identificador de icono para la ruta {route?.route ?? "seleccionada"}.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
            {form.formState.errors.root?.message ? <Alert role="alert" variant="destructive"><AlertDescription>{form.formState.errors.root.message}</AlertDescription></Alert> : null}
            <FormField control={form.control} name="icon" render={({ field }) => (
              <FormItem>
                <FormLabel>Icono</FormLabel>
                <FormControl><Input disabled={updateMutation.isPending} {...field} /></FormControl>
                <p className="text-xs text-muted-foreground">Usa el valor de icono compatible con los registros existentes.</p>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button disabled={updateMutation.isPending} onClick={close} type="button" variant="outline">Cancelar</Button>
              <Button disabled={updateMutation.isPending} type="submit">{updateMutation.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Save aria-hidden="true" className="size-4" />}{updateMutation.isPending ? "Guardando…" : "Guardar icono"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
