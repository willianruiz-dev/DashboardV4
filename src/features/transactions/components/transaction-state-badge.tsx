import { Badge } from "@/components/ui/badge";
import { getTransactionStateTone, type TransactionStateTone } from "@/features/transactions/transaction-state-tone";
import { cn } from "@/lib/utils";

/** Mismo mapa de colores que los importes (ver `transaction-state-tone.ts`). */
const toneStyles: Record<TransactionStateTone, string> = {
  approved:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  cancelled:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
  initiated:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
  neutral:
    "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
  // Blanco: en modo claro se separa de la tarjeta (también blanca) con borde y sombra leve.
  pendingNotification:
    "border-slate-300 bg-white text-slate-700 shadow-xs dark:border-white/40 dark:bg-white/10 dark:text-white",
  returnError:
    "border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300",
};

const dotStyles: Record<TransactionStateTone, string> = {
  approved: "bg-emerald-500",
  cancelled: "bg-red-500",
  initiated: "bg-blue-500",
  neutral: "bg-slate-400 dark:bg-slate-500",
  pendingNotification: "bg-white ring-1 ring-slate-400 dark:ring-0",
  returnError: "bg-yellow-500",
};

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
