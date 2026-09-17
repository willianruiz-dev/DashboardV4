import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";

function getTransactionStateVariant(value: string): NonNullable<BadgeProps["variant"]> {
  const normalizedValue = value.toLocaleLowerCase("es-CO");

  if (normalizedValue.includes("aprobada")) {
    return "success";
  }

  if (normalizedValue.includes("cancelada") || normalizedValue.includes("rechazada")) {
    return "destructive";
  }

  return "info";
}

export function TransactionStateBadge({ value }: { value: string | null | undefined }) {
  const label = value?.trim() || "Sin estado";
  return <Badge variant={getTransactionStateVariant(label)}>{label}</Badge>;
}
