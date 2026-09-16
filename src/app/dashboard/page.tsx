import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardHomePage() {
  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-xl border bg-card p-5 text-card-foreground sm:p-7">
        <Badge className="w-fit" variant="secondary">
          Sesión operativa
        </Badge>
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Bienvenido</h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Usa la navegación para acceder a los módulos habilitados según los permisos de tu rol.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <ShieldCheck aria-hidden="true" className="size-6 text-primary" />
            <CardTitle>Acceso protegido</CardTitle>
            <CardDescription>La navegación y las operaciones se validan con los permisos del usuario autenticado.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Operación conectada</CardTitle>
            <CardDescription>Las llamadas del dashboard se enrutan de forma segura hacia el API configurado.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/foundation">
                Ver sistema de diseño
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
