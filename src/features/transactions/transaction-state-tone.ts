/**
 * Tono visual de cada estado de transacción. Lo comparten la insignia de estado y los
 * importes de Transacciones, Reportes y el detalle, para que todos pinten igual:
 *
 * | Estado (maestro de estados)                         | Tono                  | Color    |
 * | --------------------------------------------------- | --------------------- | -------- |
 * | Cancelada · Cancelada Error Devuelta                | `cancelled`           | rojo     |
 * | Aprobada                                            | `approved`            | verde    |
 * | Iniciada                                            | `initiated`           | azul     |
 * | Aprobada Error Devuelta                             | `returnError`         | amarillo |
 * | Pendiente de notificación («Aprovada Sin Notificar») | `pendingNotification` | blanco   |
 * | Cualquier otro estado o sin estado                  | `neutral`             | gris     |
 */
export type TransactionStateTone =
  | "approved"
  | "cancelled"
  | "initiated"
  | "neutral"
  | "pendingNotification"
  | "returnError";

/** Minúsculas, sin tildes y con espacios simples: «Notificación» y «notificacion» coinciden. */
function normalizeStateLabel(state: string | null | undefined): string {
  return (state ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CO")
    .replace(/\s+/g, " ")
    .trim();
}

export function getTransactionStateTone(state: string | null | undefined): TransactionStateTone {
  const label = normalizeStateLabel(state);

  // Va antes que las aprobadas: el maestro legado nombra este estado «Aprovada Sin Notificar»
  // (así, con v), aunque es la transacción que sigue pendiente de notificación. También cubre
  // variantes como «Pendiente de notificación» o «Sin notificar».
  if (label.includes("notific")) {
    return "pendingNotification";
  }

  switch (label) {
    case "aprobada":
      return "approved";
    case "iniciada":
      return "initiated";
    case "aprobada error devuelta":
      return "returnError";
    case "cancelada":
    case "cancelada error devuelta":
      return "cancelled";
    default:
      return "neutral";
  }
}

/**
 * Color de los importes según el estado. Clases literales completas (Tailwind no detecta
 * clases interpoladas). El blanco sólo puede ser texto en modo oscuro: sobre la tarjeta
 * blanca del modo claro el importe queda en gris carbón para seguir siendo legible.
 */
export const transactionAmountToneClasses: Record<TransactionStateTone, string> = {
  approved: "text-emerald-600 dark:text-emerald-400",
  cancelled: "text-red-500 dark:text-red-400",
  initiated: "text-blue-600 dark:text-blue-400",
  neutral: "text-slate-500 dark:text-slate-400",
  pendingNotification: "text-slate-700 dark:text-white",
  returnError: "text-yellow-600 dark:text-yellow-400",
};
