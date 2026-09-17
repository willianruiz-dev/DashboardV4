"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useChangePaypadPassword } from "@/features/paypads/hooks";
import { passwordSchema } from "@/features/users/schemas";
import { z } from "zod";

const changePaypadPasswordFormSchema = z
  .object({
    confirmation: z.string(),
    newPwd: passwordSchema,
    oldPwd: z.string().min(1, "La contraseña actual es obligatoria."),
  })
  .refine((values) => values.newPwd === values.confirmation, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmation"],
  });

type ChangePaypadPasswordFormValues = z.infer<typeof changePaypadPasswordFormSchema>;

interface ChangePaypadPasswordDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  paypadId: number;
  username: string | null | undefined;
}

const defaults: ChangePaypadPasswordFormValues = {
  confirmation: "",
  newPwd: "",
  oldPwd: "",
};

export function ChangePaypadPasswordDialog({ onOpenChange, open, paypadId, username }: ChangePaypadPasswordDialogProps) {
  const changeMutation = useChangePaypadPassword();
  const form = useForm<ChangePaypadPasswordFormValues>({
    defaultValues: defaults,
    resolver: zodResolver(changePaypadPasswordFormSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset(defaults);
    }
  }, [form, open]);

  function close(): void {
    if (!changeMutation.isPending) {
      onOpenChange(false);
    }
  }

  async function onSubmit(values: ChangePaypadPasswordFormValues): Promise<void> {
    try {
      await changeMutation.mutateAsync({
        document: String(paypadId),
        newPwd: values.newPwd,
        oldPwd: values.oldPwd,
      });
      toast.success("Contraseña de Pay+ cambiada con éxito.");
      onOpenChange(false);
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "No fue posible cambiar la contraseña." });
    }
  }

  return (
    <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>Actualiza la contraseña de <strong className="font-semibold text-foreground">{username ?? `Pay+ ${paypadId}`}</strong>.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
            {form.formState.errors.root?.message ? <Alert role="alert" variant="destructive"><AlertDescription>{form.formState.errors.root.message}</AlertDescription></Alert> : null}
            <FormField control={form.control} name="oldPwd" render={({ field }) => <FormItem><FormLabel>Contraseña actual</FormLabel><FormControl><Input autoComplete="current-password" disabled={changeMutation.isPending} type="password" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="newPwd" render={({ field }) => <FormItem><FormLabel>Nueva contraseña</FormLabel><FormControl><Input autoComplete="new-password" disabled={changeMutation.isPending} type="password" {...field} /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="confirmation" render={({ field }) => <FormItem><FormLabel>Confirmar nueva contraseña</FormLabel><FormControl><Input autoComplete="new-password" disabled={changeMutation.isPending} type="password" {...field} /></FormControl><FormMessage /></FormItem>} />
            <DialogFooter>
              <Button disabled={changeMutation.isPending} onClick={close} type="button" variant="outline">Cancelar</Button>
              <Button disabled={changeMutation.isPending} type="submit">{changeMutation.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <KeyRound aria-hidden="true" className="size-4" />}{changeMutation.isPending ? "Actualizando…" : "Cambiar contraseña"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
