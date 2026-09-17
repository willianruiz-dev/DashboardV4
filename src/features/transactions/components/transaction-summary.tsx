import { Banknote, CircleCheck, CreditCard, ReceiptText, XCircle, type LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { TransactionSummary } from "@/features/transactions/schemas";
import { formatDashboardMoney } from "@/lib/formatters/money";
import { cn } from "@/lib/utils";

type SummaryTone = "approved" | "cancelled" | "system";

/** Clases literales completas para que Tailwind las detecte. */
const toneStyles: Record<SummaryTone, { accent: string; chip: string; value: string }> = {
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
  system: {
    accent: "from-blue-400/90 via-sky-300/60 to-transparent",
    chip: "bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 ring-blue-200/80 glow-blue dark:from-blue-500/25 dark:to-blue-500/5 dark:text-blue-400 dark:ring-blue-500/25",
    value: "text-blue-600 dark:text-blue-400",
  },
};

interface SummaryCard {
  icon: LucideIcon;
  label: string;
  subtitle?: string | null;
  tone: SummaryTone;
  value: string;
}

export function TransactionSummaryCards({ summary }: { summary: TransactionSummary }) {
  // Si el período abarca más de una moneda (máquinas de pesos y de dólares, o máquinas de
  // cambio divisa), el «Total recaudado» no puede ser un solo número: se muestra un recaudo
  // por moneda, como en el control de dispensado (C8/C9). Con una sola moneda nada cambia.
  const currencies = summary.byCurrency;
  const cards: SummaryCard[] =
    currencies.length > 1
      ? [
          { icon: CircleCheck, label: "Transacciones aprobadas", tone: "approved", value: String(summary.approvedCount) },
          { icon: XCircle, label: "Transacciones rechazadas", tone: "cancelled", value: String(summary.cancelledCount) },
          ...currencies.map((bucket) => ({
            icon: ReceiptText,
            label: `Total recaudado · ${bucket.currencyLabel}`,
            subtitle: `${bucket.approvedCount} aprobada(s) · efectivo ${formatDashboardMoney(bucket.cashTotal)} · tarjeta ${formatDashboardMoney(bucket.cardTotal)}${
              bucket.mixed ? " · máquina(s) de cambio divisa: el importe no es atribuible a una sola moneda" : ""
            }`,
            tone: "system" as SummaryTone,
            value: formatDashboardMoney(bucket.approvedTotal),
          })),
        ]
      : [
          { icon: CircleCheck, label: "Transacciones aprobadas", tone: "approved", value: String(summary.approvedCount) },
          { icon: XCircle, label: "Transacciones rechazadas", tone: "cancelled", value: String(summary.cancelledCount) },
          { icon: Banknote, label: "Total recaudado en efectivo", tone: "system", value: formatDashboardMoney(summary.cashTotal) },
          { icon: CreditCard, label: "Total recaudado por tarjeta", tone: "system", value: formatDashboardMoney(summary.cardTotal) },
          { icon: ReceiptText, label: "Total recaudado", tone: "system", value: formatDashboardMoney(summary.approvedTotal) },
        ];

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", cards.length > 5 ? "xl:grid-cols-4" : "xl:grid-cols-5")}>
      {cards.map(({ icon: Icon, label, subtitle, tone, value }, index) => {
        const styles = toneStyles[tone];

        return (
          <Card
            key={label}
            className="group relative animate-rise overflow-hidden p-0 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lift"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <div aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r opacity-80 transition-opacity duration-300 group-hover:opacity-100", styles.accent)} />
            <div className="flex min-h-28 items-center gap-4 p-5">
              <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-105", styles.chip)}>
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <p className={cn("font-numeric truncate text-xl font-semibold tracking-tight", styles.value)}>{value}</p>
                <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{label}</p>
                {subtitle ? (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80" title={subtitle}>{subtitle}</p>
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
