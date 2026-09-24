import { LoaderCircle } from "lucide-react";

/**
 * Aviso de que la tabla se está reordenando (o cambiando de página) sin quitarla de la vista.
 * La región viva siempre existe para que los lectores de pantalla anuncien el cambio.
 */
export function TransactionsRefreshingStatus({ active }: { active: boolean }) {
  return (
    <p aria-live="polite" className="inline-flex min-h-5 items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300" role="status">
      {active ? (
        <>
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Actualizando resultados…
        </>
      ) : null}
    </p>
  );
}
