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
import { useChangeUserPassword } from "@/features/users/hooks";
import { changeUserPasswordFormSchema, type ChangeUserPasswordFormValues } from "@/features/users/schemas";

interface ChangeUserPasswordDialogProps {
  document: string | null | undefined;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  userName: string | null | undefined;
}

const formDefaults: ChangeUserPasswordFormValues = {
  confirmation: "",
  newPwd: "",
  oldPwd: "",
};

export function ChangeUserPasswordDialog({ document, onOpenChange, open, userName }: ChangeUserPasswordDialogProps) {
  const changePasswordMutation = useChangeUserPassword();
  const form = useForm<ChangeUserPasswordFormValues>({
    defaultValues: formDefaults,
    resolver: zodResolver(changeUserPasswordFormSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset(formDefaults);
    }
  }, [form, open]);

  function closeDialog(): void {
    if (!changePasswordMutation.isPending) {
      onOpenChange(false);
    }
  }

  async function onSubmit(values: ChangeUserPasswordFormValues): Promise<void> {
    if (!document) {
      form.setError("root", { message: "No se encontró el documento del usuario." });
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        document,
        newPwd: values.newPwd,
        oldPwd: values.oldPwd,
      });
      toast.success("Contraseña cambiada con éxito.");
      onOpenChange(false);
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "No fue posible cambiar la contraseña.",
      });
    }
  }

  return (
    <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeDialog())} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>
            Actualiza la contraseña de <strong className="font-semibold text-foreground">{userName ?? "este usuario"}</strong>. La nueva contraseña se valida antes de enviarse.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
            {form.formState.errors.root?.message ? (
              <Alert role="alert" variant="destructive">
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            ) : null}
            <FormField
              control={form.control}
              name="oldPwd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña actual</FormLabel>
                  <FormControl>
                    <Input autoComplete="current-password" disabled={changePasswordMutation.isPending} type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPwd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva contraseña</FormLabel>
                  <FormControl>
                    <Input autoComplete="new-password" disabled={changePasswordMutation.isPending} type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar nueva contraseña</FormLabel>
                  <FormControl>
                    <Input autoComplete="new-password" disabled={changePasswordMutation.isPending} type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button disabled={changePasswordMutation.isPending} onClick={closeDialog} type="button" variant="outline">
                Cancelar
              </Button>
              <Button disabled={changePasswordMutation.isPending} type="submit">
                {changePasswordMutation.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <KeyRound aria-hidden="true" className="size-4" />}
                {changePasswordMutation.isPending ? "Actualizando…" : "Cambiar contraseña"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
