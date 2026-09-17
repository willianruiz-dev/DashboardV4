"use client";

import { AlertCircle, FileX2, LockKeyhole, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Cargando contenido" className="grid gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton className="h-20 w-full" key={index} />
      ))}
    </div>
  );
}

export function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-xl border border-dashed p-6 text-center">
      <div className="grid max-w-sm justify-items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <FileX2 aria-hidden="true" className="size-5" />
        </span>
        <div className="space-y-1">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ description, onRetry }: { description: string; onRetry: () => void }) {
  return (
    <Alert role="alert" variant="destructive">
      <AlertCircle aria-hidden="true" className="size-4" />
      <AlertTitle>No fue posible cargar la información</AlertTitle>
      <AlertDescription className="grid gap-3">
        <span>{description}</span>
        <div>
          <Button onClick={onRetry} type="button" variant="outline">
            <RefreshCw aria-hidden="true" className="size-4" />
            Reintentar
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function ForbiddenState({ description = "Tu rol no tiene permiso para acceder a este módulo." }: { description?: string }) {
  return (
    <Alert role="alert">
      <LockKeyhole aria-hidden="true" className="size-4" />
      <AlertTitle>Acceso restringido</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
