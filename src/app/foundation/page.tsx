import { ArrowRight, CheckCircle2, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-7xl content-center gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Dashboard V4</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Sistema de diseño preparado
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            La interfaz operativa se construirá por módulos sobre los tokens de marca y los primitivos
            accesibles de esta base.
          </p>
        </div>
        <Button asChild className="w-full md:w-auto">
          <a href="#primitivos">
            Ver primitivos
            <ArrowRight aria-hidden="true" />
          </a>
        </Button>
      </section>

      <section id="primitivos" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <Palette className="size-6 text-primary" aria-hidden="true" />
            <CardTitle>Tokens de marca</CardTitle>
            <CardDescription>Paleta, fuentes y radios definidos en ManualDeMarca.md.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CheckCircle2 className="size-6 text-primary" aria-hidden="true" />
            <CardTitle>Primitivos listos</CardTitle>
            <CardDescription>Controles base con foco visible, contraste semántico y áreas táctiles.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Modo oscuro</CardTitle>
            <CardDescription>Variables de Shadcn UI asignadas para los dos modos de marca.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="dark rounded-lg border bg-card p-3 text-card-foreground">
              <p className="text-sm font-medium">Vista de token oscuro</p>
              <p className="mt-1 text-sm text-muted-foreground">Sin una réplica visual del sistema legado.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
