"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useVerifyUserPassword } from "@/features/users/hooks";
import { userEditVerificationRequestSchema } from "@/features/users/schemas";

interface VerifyUserPasswordDialogProps {
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  open: boolean;
  userName: string | null | undefined;
}

type VerificationValues = {
  password: string;
  userName: string;
};

export function VerifyUserPasswordDialog({ onOpenChange, onVerified, open, userName }: VerifyUserPasswordDialogProps) {
  const verifyMutation = useVerifyUserPassword();
  const form = useForm<VerificationValues>({
    defaultValues: {
      password: "",
      userName: userName ?? "",
    },
    resolver: zodResolver(userEditVerificationRequestSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({
        password: "",
        userName: userName ?? "",
      });
    }
  }, [form, open, userName]);

  async function onSubmit(values: VerificationValues): Promise<void> {
    try {
      await verifyMutation.mutateAsync(values);
      toast.success("Contraseña verificada.");
      onOpenChange(false);
      onVerified();
    } catch (error) {
      form.setError("password", {
        message: error instanceof Error ? error.message : "No fue posible verificar la contraseña.",
      });
    }
  }

  function closeDialog(): void {
    if (!verifyMutation.isPending) {
      onOpenChange(false);
    }
  }

  return (
    <Dialog onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeDialog())} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verificar contraseña</DialogTitle>
          <DialogDescription>
            Para editar este usuario, ingresa la contraseña de <strong className="font-semibold text-foreground">{userName ?? "este usuario"}</strong>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input autoComplete="current-password" autoFocus disabled={verifyMutation.isPending} type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button disabled={verifyMutation.isPending} onClick={closeDialog} type="button" variant="outline">
                Cancelar
              </Button>
              <Button disabled={verifyMutation.isPending} type="submit">
                {verifyMutation.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <ShieldCheck aria-hidden="true" className="size-4" />}
                {verifyMutation.isPending ? "Verificando…" : "Confirmar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
