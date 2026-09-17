import { Badge } from "@/components/ui/badge";
import { getTransactionStateTone } from "@/features/transactions/transaction-state-tone";
import { cn } from "@/lib/utils";

const toneStyles = {
  approved:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  neutral:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
} as const;

const dotStyles = {
  approved: "bg-emerald-500",
  cancelled: "bg-red-500",
  neutral: "bg-blue-500",
} as const;

export function TransactionStateBadge({ value }: { value: string | null | undefined }) {
  const label = value?.trim() || "Sin estado";
  const tone = getTransactionStateTone(value);

  return (
    <Badge variant="outline" className={cn(toneStyles[tone])}>
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dotStyles[tone])} />
      {label}
    </Badge>
  );
}
