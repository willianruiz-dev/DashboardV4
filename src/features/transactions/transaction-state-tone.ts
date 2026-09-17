export type TransactionStateTone = "approved" | "cancelled" | "neutral";

/**
 * Classifica el estado de una transacción en un tono visual:
 * - Aprobadas → verde pastel (emerald #10b981)
 * - Canceladas → rojo pastel (red #ef4444)
 * - Resto → azul del sistema (blue #3b82f6)
 */
export function getTransactionStateTone(state: string | null | undefined): TransactionStateTone {
  const label = (state ?? "").trim().toLocaleLowerCase("es-CO");

  if (label === "aprobada") {
    return "approved";
  }

  if (label === "cancelada" || label === "cancelada error devuelta") {
    return "cancelled";
  }

  return "neutral";
}

/** Clases literales (Tailwind requiere clases completas, nunca interpoladas). */
export const transactionAmountToneClasses: Record<TransactionStateTone, string> = {
  approved: "text-emerald-600 dark:text-emerald-400",
  cancelled: "text-red-500 dark:text-red-400",
  neutral: "text-blue-600 dark:text-blue-400",
};
