import { DispensingControlPage } from "@/features/dispensing-control/components/dispensing-control-page";

/**
 * La tarjeta de alerta del inicio enlaza con `?paypad=<id>` para abrir directamente
 * la máquina afectada. El parámetro se resuelve en el servidor y se pasa como
 * prop: la página es un componente cliente y así se evita `useSearchParams` con
 * su frontera de Suspense.
 */
export default async function DispensingControlRoutePage({
  searchParams,
}: {
  searchParams: Promise<{ paypad?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.paypad) ? params.paypad[0] : params.paypad;
  const parsed = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
  const initialPaypadId = Number.isInteger(parsed) && parsed > 0 ? parsed : null;

  return <DispensingControlPage initialPaypadId={initialPaypadId} />;
}
