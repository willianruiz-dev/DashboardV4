import { Banknote, CircleCheck, CreditCard, ReceiptText, type LucideIcon, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { TransactionSummary } from "@/features/transactions/schemas";
import { formatDashboardMoney } from "@/lib/formatters/money";

interface SummaryMetric {
  cardClassName: string;
  tone: "danger" | "info" | "success";
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
  valueClassName: string;
}

export function TransactionSummaryCards({ summary }: { summary: TransactionSummary }) {
  const cards: readonly SummaryMetric[] = [
    {
      cardClassName: "border-success-border bg-success-surface",
      icon: CircleCheck,
      tone: "success",
      iconClassName: "bg-success-surface-hover text-success-foreground",
      label: "Transacciones aprobadas",
      value: String(summary.approvedCount),
      valueClassName: "text-success-foreground",
    },
    {
      cardClassName: "border-danger-border bg-danger-surface",
      icon: XCircle,
      tone: "danger",
      iconClassName: "bg-danger-surface-hover text-danger-foreground",
      label: "Transacciones canceladas",
      value: String(summary.cancelledCount),
      valueClassName: "text-danger-foreground",
    },
    {
      cardClassName: "border-info-border bg-info-surface",
      icon: Banknote,
      tone: "info",
      iconClassName: "bg-info-surface-hover text-info-foreground",
      label: "Total recaudado en efectivo",
      value: formatDashboardMoney(summary.cashTotal),
      valueClassName: "text-info-foreground",
    },
    {
      cardClassName: "border-info-border bg-info-surface",
      icon: CreditCard,
      tone: "info",
      iconClassName: "bg-info-surface-hover text-info-foreground",
      label: "Total recaudado por tarjeta",
      value: formatDashboardMoney(summary.cardTotal),
      valueClassName: "text-info-foreground",
    },
    {
      cardClassName: "border-info-border bg-info-surface",
      icon: ReceiptText,
      tone: "info",
      iconClassName: "bg-info-surface-hover text-info-foreground",
      label: "Total recaudado",
      value: formatDashboardMoney(summary.approvedTotal),
      valueClassName: "text-info-foreground",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" role="list">
      {cards.map(({ cardClassName, icon: Icon, iconClassName, label, tone, value, valueClassName }) => (
        <Card aria-label={`${label}: ${value}`} className={`summary-metric-card ${cardClassName}`} data-tone={tone} key={label} role="listitem">
          <CardContent className="flex min-h-30 items-center gap-4 p-5">
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className={`font-numeric truncate text-xl font-semibold tracking-tight ${valueClassName}`}>{value}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
