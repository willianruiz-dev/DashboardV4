import Image from "next/image";
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
          <Image
            alt="E-city Software"
            className="mx-auto h-auto w-52 rounded-md border bg-card p-1 shadow-sm"
            height={182}
            priority
            sizes="(max-width: 640px) 13rem, 13rem"
            src="/images/banner_resized.jpg"
            width={448}
          />
          <p className="text-sm text-muted-foreground">Plataforma operativa</p>
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
