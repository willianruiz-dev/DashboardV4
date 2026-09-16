import { Badge } from "@/components/ui/badge";

export function TransactionStateBadge({ value }: { value: string | null | undefined }) {
  const label = value?.trim() || "Sin estado";
  const variant = label === "Cancelada" || label === "Cancelada Error Devuelta" ? "destructive" : label === "Aprobada" ? "default" : "secondary";
  return <Badge variant={variant}>{label}</Badge>;
}
