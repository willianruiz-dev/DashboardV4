import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardHomePage() {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl">Bienvenido</CardTitle>
          <CardDescription>Selecciona un módulo en la navegación para continuar con la operación.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sólo se muestran y habilitan las acciones autorizadas para tu rol.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
