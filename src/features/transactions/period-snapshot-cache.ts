/**
 * Instantáneas cortas del período consultado en Transacciones y Reportes.
 *
 * Ordenar, cambiar la dirección, paginar o filtrar por producto no cambian las transacciones del
 * período, sólo cómo se muestran. Antes cada cambio volvía a leer el API legado completo (listado
 * de Pay+ y `GetByDate`): tardaba lo mismo que una consulta nueva y la tabla desaparecía mientras
 * tanto. La clave incluye el `searchId` de la consulta explícita («Consultar»), así que pulsar
 * «Consultar» siempre lee datos frescos; la instantánea sólo sirve a esa misma consulta.
 *
 * Módulo puro (sin dependencias) para poder probarlo en `npm run fixtures:dispensing`.
 */
export interface PeriodSnapshotCacheOptions {
  /** Máximo de instantáneas guardadas; al superarlo se descarta la más antigua. */
  maxEntries: number;
  /** Máximo de filas sumando todas las instantáneas. Un período mayor no se guarda. */
  maxTotalRows: number;
  /** Reloj inyectable para las pruebas. */
  now?: () => number;
  /** Vigencia desde que se creó la instantánea (no se renueva al leerla). */
  ttlMs: number;
}

export interface PeriodSnapshotCache<TValue> {
  get(key: string): TValue | undefined;
  set(key: string, value: TValue, rows: number): void;
  readonly size: number;
  readonly totalRows: number;
}

interface Entry<TValue> {
  at: number;
  rows: number;
  value: TValue;
}

export function createPeriodSnapshotCache<TValue>(options: PeriodSnapshotCacheOptions): PeriodSnapshotCache<TValue> {
  const entries = new Map<string, Entry<TValue>>();
  const now = options.now ?? Date.now;
  let totalRows = 0;

  function remove(key: string): void {
    const entry = entries.get(key);
    if (entry) {
      totalRows -= entry.rows;
      entries.delete(key);
    }
  }

  function isExpired(entry: Entry<TValue>): boolean {
    return now() - entry.at > options.ttlMs;
  }

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) {
        return undefined;
      }
      if (isExpired(entry)) {
        remove(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value, rows) {
      remove(key);
      if (rows > options.maxTotalRows) {
        return;
      }

      for (const [entryKey, entry] of entries) {
        if (isExpired(entry)) {
          remove(entryKey);
        }
      }

      // `Map` conserva el orden de inserción: la primera clave es la instantánea más antigua.
      while (entries.size > 0 && (entries.size >= options.maxEntries || totalRows + rows > options.maxTotalRows)) {
        const oldest = entries.keys().next();
        if (oldest.done) {
          break;
        }
        remove(oldest.value);
      }

      entries.set(key, { at: now(), rows, value });
      totalRows += rows;
    },
    get size() {
      return entries.size;
    },
    get totalRows() {
      return totalRows;
    },
  };
}
