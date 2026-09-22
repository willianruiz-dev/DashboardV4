import type { CurrencyDenomination } from "@/features/denominations/schemas";
import type { Load, PayPadStorage, Tonnage } from "@/features/paypads/schemas";
import type { TransactionStateBucket } from "@/features/transactions/schemas";
import { type DispensingMetricsInput, toMillis } from "./dispensing-metrics";
import type { SystemDispensedEvidence } from "./system-dispensed";

/**
 * Armado del INSUMO del cuadre de dispensado, fuera de React y fuera del cálculo.
 *
 * Existe porque olvidar un dato de entrada no rompe la compilación: el cuadre se calcula
 * igual y sale otro número. El caso real fue `tonnages`: la pantalla no lo pasaba, así que
 * el modulo creía que el período empezaba con los baúles vacíos y descontaba TODO el baúl de
 * rechazo como si se hubiera llenado en el período (el dispensado bajaba en esas unidades) y
 * nunca podía decir qué había en los dispensadores al inicio de la ventana. Con el insumo
 * armado en un único lugar puro, la conexión queda cubierta por las regresiones
 * (`npm run fixtures:dispensing`).
 */
export interface DispensingInputSources {
  byState: Readonly<Record<string, TransactionStateBucket>>;
  loads: readonly Load[];
  storage: readonly PayPadStorage[];
  /** Todos los arqueos de la máquina; vacío cuando la lectura falló o no devolvió nada. */
  tonnages: readonly Tonnage[];
}

/**
 * Arqueo más reciente con fecha utilizable: es la BASE física del cuadre. Los arqueos sin
 * fecha (o con fecha ilegible) no pueden ser base, pero se conservan en el historial para que
 * la pantalla pueda decir «el API devolvió N arqueos y ninguno trae fecha».
 */
export function latestUsableTonnage(tonnages: readonly Tonnage[]): Tonnage | null {
  return tonnages.reduce<Tonnage | null>((best, tonnage) => {
    const time = toMillis(tonnage.dateCreated ?? null);
    if (Number.isNaN(time)) {
      return best;
    }
    if (best === null) {
      return tonnage;
    }

    const bestTime = toMillis(best.dateCreated ?? null);
    return Number.isNaN(bestTime) || time > bestTime ? tonnage : best;
  }, null);
}

export interface CreateDispensingMetricsInputParams {
  /** Error de la lectura del historial de arqueos: viaja al panel para no acusar a la máquina. */
  arqueoHistoryError?: string | null;
  cashDispensedTotal: string | null;
  denominations: readonly CurrencyDenomination[];
  machineCurrency: { id: number; label: string | null } | null;
  now: Date;
  rangeFrom: Date;
  rangeTo: Date;
  sources: DispensingInputSources;
  /** Momento en que el tablero leyó el baúl (`dpStored`); `null` = lectura no disponible. */
  storageReadAt: number | null;
  systemEvidence: SystemDispensedEvidence | null;
}

export function createDispensingMetricsInput(params: CreateDispensingMetricsInputParams): DispensingMetricsInput {
  const { sources } = params;

  return {
    arqueoHistoryError: params.arqueoHistoryError ?? null,
    byState: sources.byState,
    cashDispensedTotal: params.cashDispensedTotal,
    denominations: params.denominations,
    lastTonnage: latestUsableTonnage(sources.tonnages),
    loads: sources.loads,
    machineCurrency: params.machineCurrency,
    now: params.now,
    rangeFrom: params.rangeFrom,
    rangeTo: params.rangeTo,
    storage: sources.storage,
    storageReadAt: params.storageReadAt,
    systemEvidence: params.systemEvidence,
    // La REFERENCIA del inicio del período (cuánto había en los baúles al empezar la ventana)
    // sale de aquí: sin esta lista el rechazado del período se calcula como el baúl completo.
    tonnages: sources.tonnages,
  };
}
