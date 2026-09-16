import { Landmark } from "lucide-react";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { getDashboardToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const token = await getDashboardToken();

  if (token) {
    redirect("/dashboard");
  }

  return (
    <main className="relative grid min-h-screen place-items-center bg-background px-4 py-8 sm:px-6">
      <ThemeToggle className="absolute right-4 top-4 sm:right-6 sm:top-6" showLabel />
      <div className="grid w-full max-w-md gap-6">
        <div className="grid gap-3 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Landmark aria-hidden="true" className="size-7" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary">E-city</p>
            <p className="text-sm text-muted-foreground">Plataforma operativa</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-5 sm:p-7">
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
