import { Banknote, CircleCheck, CreditCard, ReceiptText, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { TransactionSummary } from "@/features/transactions/schemas";
import { formatDashboardMoney } from "@/lib/formatters/money";

export function TransactionSummaryCards({ summary }: { summary: TransactionSummary }) {
  const cards = [
    { icon: CircleCheck, label: "Transacciones aprobadas", value: String(summary.approvedCount) },
    { icon: XCircle, label: "Transacciones rechazadas", value: String(summary.cancelledCount) },
    { icon: Banknote, label: "Total recaudado en efectivo", value: formatDashboardMoney(summary.cashTotal) },
    { icon: CreditCard, label: "Total recaudado por tarjeta", value: formatDashboardMoney(summary.cardTotal) },
    { icon: ReceiptText, label: "Total recaudado", value: formatDashboardMoney(summary.approvedTotal) },
  ];

  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({ icon: Icon, label, value }) => <Card key={label}><CardContent className="flex min-h-28 items-center gap-3 p-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><Icon aria-hidden="true" className="size-5" /></span><div className="min-w-0"><p className="font-numeric truncate text-lg font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>)}</div>;
}
