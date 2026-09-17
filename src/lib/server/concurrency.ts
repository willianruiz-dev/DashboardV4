import "server-only";

/**
 * Ejecuta tareas asíncronas con un máximo de peticiones simultáneas.
 * Se usa para no saturar el API legado cuando hay que consultar varias máquinas
 * (p. ej. la alerta de devoluciones del inicio o el análisis de atascos).
 */
export async function mapWithConcurrency<TItem, TResult>(
  items: readonly TItem[],
  concurrency: number,
  task: (item: TItem, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  const results: TResult[] = [];
  let cursor = 0;
  const limit = Math.max(1, Math.min(concurrency, items.length));

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item !== undefined) {
        results[index] = await task(item, index);
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}
