"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginRequestSchema } from "@/features/auth/schemas";
import { requestApi } from "@/lib/api/client";

const localLoginResponseSchema = z.object({
  message: z.string(),
});

type LoginFormValues = z.infer<typeof loginRequestSchema>;

export function LoginForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    defaultValues: {
      password: "",
      userName: "",
    },
    resolver: zodResolver(loginRequestSchema),
  });

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setSubmitError(null);

    try {
      await requestApi("/api/auth/login", localLoginResponseSchema, {
        body: JSON.stringify(values),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      form.reset();
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No fue posible iniciar sesión.");
    }
  }

  return (
    <Form {...form}>
      <form className="grid gap-5" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <LockKeyhole aria-hidden="true" className="size-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Iniciar sesión</h1>
            <p className="text-sm text-muted-foreground">Ingresa con tus credenciales de Dashboard.</p>
          </div>
        </div>

        {submitError ? (
          <Alert role="alert" variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="userName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Usuario</FormLabel>
              <FormControl>
                <Input autoComplete="username" inputMode="text" placeholder="Ingresa tu usuario" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input autoComplete="current-password" placeholder="Ingresa tu contraseña" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
          {form.formState.isSubmitting ? "Validando acceso…" : "Ingresar"}
        </Button>
      </form>
    </Form>
  );
}
