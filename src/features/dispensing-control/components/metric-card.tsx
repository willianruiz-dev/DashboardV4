"use client";

import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type MetricTone = "approved" | "cancelled" | "neutral" | "system";

/** Clases literales completas para que Tailwind las detecte. */
const toneStyles: Record<MetricTone, { accent: string; chip: string; value: string }> = {
  approved: {
    accent: "from-emerald-400/90 via-teal-300/60 to-transparent",
    chip: "bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 ring-emerald-200/80 glow-emerald dark:from-emerald-500/25 dark:to-emerald-500/5 dark:text-emerald-400 dark:ring-emerald-500/25",
    value: "text-emerald-600 dark:text-emerald-400",
  },
  cancelled: {
    accent: "from-red-400/90 via-rose-300/60 to-transparent",
    chip: "bg-gradient-to-br from-red-100 to-red-50 text-red-500 ring-red-200/80 glow-red dark:from-red-500/25 dark:to-red-500/5 dark:text-red-400 dark:ring-red-500/25",
    value: "text-red-500 dark:text-red-400",
  },
  neutral: {
    accent: "from-slate-300/80 via-slate-200/60 to-transparent",
    chip: "bg-gradient-to-br from-slate-100 to-slate-50 text-slate-500 ring-slate-200/80 dark:from-slate-500/25 dark:to-slate-500/5 dark:text-slate-300 dark:ring-slate-500/25",
    value: "text-slate-700 dark:text-slate-200",
  },
  system: {
    accent: "from-blue-400/90 via-sky-300/60 to-transparent",
    chip: "bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 ring-blue-200/80 glow-blue dark:from-blue-500/25 dark:to-blue-500/5 dark:text-blue-400 dark:ring-blue-500/25",
    value: "text-blue-600 dark:text-blue-400",
  },
};

export interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  loading?: boolean;
  subtitle?: string | null;
  tone?: MetricTone;
  value: string;
}

/**
 * Card de métrica reutilizable: título, valor, ícono y tono pastel
 * (verde = aprobadas, rojo = rechazadas, azul = general, gris = neutro).
 */
export function MetricCard({ icon: Icon, label, loading = false, subtitle, tone = "system", value }: MetricCardProps) {
  const styles = toneStyles[tone];

  return (
    <Card className="group relative animate-rise overflow-hidden p-0 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lift">
      <div aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r opacity-80 transition-opacity duration-300 group-hover:opacity-100", styles.accent)} />
      <div className="flex min-h-28 items-center gap-4 p-5">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-105", styles.chip)}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          {loading ? (
            <Skeleton className="mb-1 h-7 w-32 rounded-md" />
          ) : (
            <p className={cn("font-numeric truncate text-xl font-semibold tracking-tight", styles.value)}>{value}</p>
          )}
          <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{label}</p>
          {subtitle !== null && subtitle !== undefined && !loading ? (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80" title={subtitle}>{subtitle}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
