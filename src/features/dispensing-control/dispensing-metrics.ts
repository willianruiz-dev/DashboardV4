import type { CurrencyDenomination } from "@/features/denominations/schemas";
import type { Load, PayPadStorage, Tonnage } from "@/features/paypads/schemas";
import type { TransactionStateBucket } from "@/features/transactions/schemas";
import { buildDenominationCurrencyIndex, denominationCurrencyText } from "./denomination-currency";
import { DENOMINATION_NOT_IN_USE_REASON, describeDenominationUsage, isDenominationInUse } from "./denomination-usage";
import { isSystemEvidenceUsable, type SystemDispensedEvidence } from "./system-dispensed";

/**
 * Cálculo puro de métricas de dispensado (AP/DP/RJ) para un Pay+ y un período.
 * Fuentes (todas endpoints existentes, ver docs/DISPENSING_CONTROL_FEASIBILITY.md):
 * - byState (BFF transacciones, período): lo que el SISTEMA registró.
 * - Último arqueo = ARQUEO BASE (tonnage): lo FÍSICO auditado (inventario AP/DP/RJ
 *   por denominación al momento del arqueo — un snapshot, NO un movimiento).
 * - Storage (inventario del sistema): saldos ACTUALES de los baúles + umbral.
 * - Cargues (loads): último cargue, cargues del período UI y cargues desde la base.
 *
 * Ecuación de cuadre por denominación (desde el arqueo base hasta hoy):
 *
 *   Salida física DP = Inicial DP (arqueo base) + Cargada (desde la base) − Saldo DP (hoy)
 *
 * La «Entregada» NO es el `quantityDp` del arqueo (ese es el inventario de ese día,
 * ver dashboard viejo `PayPadTonnageForm.js`: el arqueo se arma con el storage actual
 * y `TonnageRepository.CreateAsync` solo recibe `IdPayPad` porque el SP snapshottea).
 * La «Rechazada» NO es el `quantityRj` del arqueo viejo: es el baúl de rechazo ACTUAL
 * (`rjStored`), con su delta contra la base. Sin arqueo base no hay inicial: la salida
 * física queda indeterminada (`null`) en lugar de inventarse con el inventario actual.
 */

export const APPROVED_STATE = "Aprobada";
export const RETURNED_ERROR_STATE = "Aprobada Error Devuelta";
export const CANCELLED_STATE = "Cancelada";

/** Tolerancia del arqueo legacy: el backend alertaba con DpStored <= MinDpQuantity + 10. */
export const LOW_BALANCE_TOLERANCE = 10;

export interface DispensingMetricsInput {
  /** Desglose por estado exacto del período (BFF). Puede ser {} si la búsqueda aún no responde. */
  byState: Readonly<Record<string, TransactionStateBucket>>;
  /**
   * Σ `returnAmount` de las transacciones aprobadas del período (BFF): el cambio que el
   * SISTEMA registró haber devuelto. Verificación independiente del cuadre físico.
   */
  cashDispensedTotal?: string | null;
  /** Catálogo de denominaciones: aporta la MONEDA de cada baúl (máquinas de cambio divisa). */
  denominations?: readonly CurrencyDenomination[];
  machineCurrency?: { id: number; label: string | null } | null;
  /** Último arqueo = base física del cuadre (`null` = la máquina nunca se arqueó). */
  lastTonnage: Tonnage | null;
  /**
   * Todos los arqueos: se usa el último arqueo ANTERIOR al inicio del período para saber
   * cuánto había en los baúles cuando empezó la ventana (referencia, no parte del cuadre).
   * Opcional: sin él, el período arranca asumiendo baúles vacíos y se declara.
   */
  tonnages?: readonly Tonnage[];
  loads: readonly Load[];
  now: Date;
  rangeFrom: Date;
  rangeTo: Date;
  /**
   * Lado del sistema medido por los DETALLES de las transacciones (ver `system-dispensed.ts`):
   * dispensado/aceptado POR MONEDA y por dirección del dinero. Es la medición válida en
   * máquinas multimoneda y en máquinas cuya operación aprobada es de aceptación (cambio
   * divisa: entra USD al aceptador, sale COP del dispensador), donde `Σ returnAmount` no
   * mide el dispensador. Sin él, la verificación cae a `cashDispensedTotal` (una moneda).
   */
  systemEvidence?: SystemDispensedEvidence | null;
  storage: readonly PayPadStorage[];
  /**
   * Mensaje del error al leer el historial de arqueos (`api/Tonnage/GetByPaypad`). Sin este
   * dato, un historial VACÍO y una lectura FALLIDA se veían igual y el panel terminaba
   * afirmando que la máquina nunca se ha arqueado. `null` = la lectura respondió.
   */
  arqueoHistoryError?: string | null;
  /**
   * Momento (ms epoch) en que el tablero leyó el baúl (`dpStored`) que alimenta el cuadre.
   * El inventario en dispensadores es un snapshot: si nadie lo refresca, el cuadre entero
   * compara el sistema de hoy contra un inventario de hace horas.
   */
  storageReadAt?: number | null;
}

/**
 * Lo que el panel LLEYÓ del historial de arqueos. Existe para no confundir tres cosas muy
 * distintas: «la máquina nunca se ha arqueado», «el API no devolvió registros» y «los arqueos
 * vienen sin fecha utilizable». El texto de la alerta depende de cuál de las tres es.
 */
export interface DispensingArqueoHistory {
  /** Id del arqueo usado como base (`null` = ninguno utilizable). */
  baseId: number | null;
  /** Arqueos que devolvió el historial para esta máquina (0 = la lectura vino vacía). */
  count: number;
  /** Mensaje del error de lectura (`null` = la lectura respondió). */
  errorMessage: string | null;
  /** Fecha del arqueo base (`null` = ninguno con fecha utilizable). */
  lastAt: string | null;
  /** Arqueos del historial sin fecha utilizable: no sirven como base del cuadre. */
  withoutDate: number;
}

export interface DispensingDenominationRow {
  balance: number;
  balanceValue: string;
  /** `idCurrency` del catálogo; `null` = moneda no declarada. */
  currencyId: number | null;
  /** Etiqueta de la moneda (p. ej. «COP», «USD»): sin ella, «100» y «100» se confunden. */
  currencyLabel: string | null;
  denominationId: number;
  /**
   * La denominación pertenece HOY al inventario de la máquina (configurada, con saldo,
   * con cargues o con existencias). Las filas que no cumplen salen del desglose principal.
   */
  inUse: boolean;
  /** Motivo por el que la fila quedó fuera del desglose principal (`null` si está dentro). */
  excludedReason: string | null;
  /** El arqueo base reporta un valor negativo para esta denominación (artefacto legacy). */
  negativeReport: string | null;
  /** `true` si la moneda de la denominación no es la declarada por el Pay+. */
  foreignCurrency: boolean;
  /** Por qué la fila está en uso (señales positivas), para explicar cada baúl mostrado. */
  inUseReasons: string[];
  denominationValue: string;
  /**
   * Salida física desde el arqueo base (`inicial + cargada − saldo`). Incluye lo que el
   * arqueo declaraba en el baúl ANTES del cargue: se conserva como referencia/auditoría,
   * no como la cifra operativa (ver `deliveredFromLoad`).
   */
  deliveredFromBase: number | null;
  /**
   * `deliveredFromBase` — alias histórico del cuadre desde la base. Un valor NEGATIVO no
   * se acota: el conteo subió (cargue no registrado o descuadre).
   * @deprecated usar `deliveredFromBase` (misma cifra).
   */
  delivered: number | null;  /** El conteo físico SUBIÓ desde la base (`delivered < 0`): revisar, no es una entrega. */
  shortage: boolean;
  /** El baúl tiene MÁS unidades que las cargadas en el período (inventario previo sin cargue). */
  isNegativeStock: boolean;
  isDispensing: boolean;
  /** Cargues del período UI (Hoy/24h/7d/rango): referencia para AP/RJ, no entra al cuadre. */
  loadedInRange: number;
  /**
   * Cargues desde el arqueo base (los que alimentan el cuadre desde la base). Sin base,
   * cae al período UI como referencia y la tabla lo declara.
   */
  loadedSinceBase: number;
  /**
   * Cargues desde el ÚLTIMO CARGUE (incluido él mismo): la base del cuadre que usa la
   * operación («cargué 140, quedan 11»). No depende del arqueo.
   */
  loadedSinceLastLoad: number;
  /**
   * DISPENSADO EN EL PERÍODO (cifra principal): `cargado − en dispensadores hoy −
   * rechazado del período`. Es el cuadre del cargue — «cargué 140, quedan 11, 5 al
   * rechazo ⇒ entregué 124» — y cierra por construcción:
   * `dispensado + rechazado + enDispensadores = cargado`. `null` sin cargues en el período.
   */
  dispensedInPeriod: number | null;
  /** CARGADO del período (cargues dentro del rango consultado). */
  loadedInPeriod: number;
  /** RECHAZADO del período: baúl de rechazo hoy − lo que había al inicio del período. */
  rejectedInPeriod: number;
  /** Rechazo al inicio del período (arqueo anterior al rango); `null` si no había arqueo. */
  rejectedAtPeriodStart: number | null;
  /** Unidades en el dispensador al inicio del período según el arqueo anterior al rango. */
  stockAtPeriodStart: number | null;
  /**
   * AUDITORÍA: lo que habría salido contando el inventario previo del arqueo
   * (`arqueado + cargado − en dispensadores − rechazo`). Se publica para comparar contra el
   * registro del sistema; NO es la cifra del período.
   */
  dispensedFromArqueo: number | null;
  /**
   * Trazabilidad de la «Cargada»: cada cargue posterior al arqueo base que incluyó esta
   * denominación, con su fecha y cantidad. Un mismo total puede venir de varios cargues
   * (o de uno anterior al período filtrado): sin esto, la columna no es auditable.
   */
  loadsSinceBaseTrace: DispensingLoadTraceEntry[];
  /** Existencias del arqueo base (negativos legacy acotados a 0, ver `negativeReport`). */
  initialDp: number;
  initialRj: number;
  initialAp: number;
  low: boolean;
  minDpQuantity: number;
  /** Baúl de rechazo ACTUAL (`rjStored` de hoy), no el del arqueo viejo. */
  rejected: number;
  /** Valor del baúl de rechazo actual (`rjTotal`). */
  rejectedValue: string;
  /** Movimiento del rechazo desde la base (`actual − base`, con signo). Sin base: `null`. */
  rejectedDelta: number | null;
}

/** Total de inventario por moneda: los importes de monedas distintas NO se suman. */
export interface DispensingCurrencyTotal {
  currencyId: number | null;
  label: string | null;
  total: string;
}

/**
 * Identidad del cuadre POR MONEDA: `cargado = dispensado + rechazado + en dispensadores`.
 * En una máquina multimoneda la suma agregada de las cuatro columnas mezcla pesos y dólares;
 * cada moneda cierra por separado (y sólo si tuvo cargue en el período).
 */
export interface DispensingCurrencyIdentity {
  currencyId: number | null;
  dispensed: string;
  /** La moneda tuvo cargues en el período: sólo así se puede despejar el dispensado. */
  hasLoad: boolean;
  label: string | null;
  loaded: string;
  rejected: string;
  storage: string;
}

/**
 * Totales del ARQUEO BASE por moneda (AP/DP/RJ), valorizados desde sus detalles.
 * El arqueo declara `totalAp/totalDp/totalRj` agregados: en una máquina multimoneda esos
 * tres números suman pesos y dólares, así que no se pueden leer ni comparar entre sí.
 */
export interface DispensingArqueoCurrencyTotal {
  ap: string;
  currencyId: number | null;
  dp: string;
  label: string | null;
  rj: string;
}

/** Un cargue que aportó unidades a la columna «Cargada (desde base)». */
export interface DispensingLoadTraceEntry {
  /** Fecha del cargue (ISO del API); `null` si el histórico no la trae. */
  at: string | null;
  quantity: number;
}

/**
 * Verificación del cuadre contra lo que el SISTEMA registró, POR MONEDA.
 *
 * El lado del sistema tiene dos orígenes posibles y no son intercambiables:
 *
 *  - `"detalles"`: `Transaction/{id}/Details` → cada billete con su operación (aceptar /
 *    dispensar / fallar) y su moneda. Es el lado DP real y el único atribuible por moneda.
 *  - `"returnAmount"`: `Σ returnAmount` de las aprobadas. Sólo es admisible con UNA moneda:
 *    el DTO de transacción no declara la moneda de cada importe y en una máquina de cambio
 *    divisa ese campo describe el lado del aceptador (entra USD), no el dispensador (sale COP).
 *
 * Cuando ninguno de los dos origenes sostiene la comparación, `best` es `null` y `blocker`
 * dice por qué: el panel explica en vez de acusar un descuadre inexistente.
 */
export type DispensingReconciliationBlockerCode =
  | "cobertura"
  | "inventario-previo"
  | "multimoneda"
  | "sin-cargues"
  | "sin-medicion"
  | "sin-transacciones";

/**
 * Auditoría de un TRAMO entre dos arqueos consecutivos (por moneda): cuánto bajó el baúl
 * entre un conteo y el siguiente, cuánto explican los pagos registrados DENTRO del tramo y
 * cuánto quedó sin pago. La ventana del arqueo base (el MÁS RECIENTE) no puede ver estos
 * tramos porque arranca después de ellos (caso real Pay+ Inder 1, 2026-09-22: −$124.000
 * entre los arqueos #5690 y #5692 del mismo día, invisibles para la ventana que abre en
 * el #5692 y que la tarjeta confundía con la referencia #5680 del sábado anterior).
 */
export interface DispensingArqueoTramo {
  fromArqueo: { at: string | null; id: number | null };
  toArqueo: { at: string | null; id: number | null };
  /** Valor contado en dispensadores en el arqueo de arranque del tramo (esta moneda). */
  fromValue: string;
  /** Valor contado en dispensadores en el arqueo de cierre del tramo (esta moneda). */
  toValue: string;
  /** Salida del baúl en el tramo: contado inicial + cargues del tramo − contado final − rechazo nuevo. */
  outflow: string;
  /** Pagos registrados por el detalle DENTRO del tramo; `null` = sin medición en esa ventana. */
  payments: string | null;
  /** `outflow − payments`; `null` cuando los pagos del tramo no tienen medición. */
  sinPago: string | null;
}

/** Comparación por moneda: el registro del sistema contra cada modelo físico. */
export interface DispensingReconciliationCurrencyRow {
  /** Lo que el detalle registra como ACEPTADO (AP) en esta moneda; `null` sin detalle. */
  acceptedTotal: string | null;
  /** Auditoría: dispensado contando el inventario previo del arqueo. */
  arqueoTotal: string | null;
  /**
   * Modelo que explica el registro del sistema en ESTA moneda (`null` = no comparable).
   * `"retiro"` = el baúl perdió dinero que ningún pago registrado explica y el cargue REEMPLAZÓ
   * el contenido (el baúl quedó exactamente en lo cargado): es una salida sin registro, no un
   * faltante de pagos.
   */
  best: "arqueo" | "periodo" | "ninguno" | "retiro" | null;
  currencyId: number | null;
  /**
   * `false` = el cuadre del período no es una identidad exacta en esta moneda: al empezar el
   * período el baúl ya tenía inventario (`periodStartStockValue`), así que «cargado − en
   * dispensadores − rechazado» mide pagos + retiros − inventario previo y puede dar $0 en una
   * máquina que sí pagó (caso real Pay+ Inder 1: cargue que reemplazó el sobrante del baúl).
   */
  periodExact: boolean;
  differenceArqueo: string | null;
  differencePeriodo: string | null;
  label: string | null;
  /** Cargado del período en esta moneda (`null` si no tuvo cargues). */
  loadedTotal: string | null;
  /** Cargue de la ventana del arqueo base: lo que repuso el baúl después de la base. */
  loadedSinceBaseValue: string | null;
  /**
   * Salida del baúl en la ventana del arqueo base que ningún pago registrado explica
   * (`salida física − pagos desde la base`). Es el candidato a retiro/reemplazo al cargar.
   */
  outflowWithoutPayment: string | null;
  /** Pagos registrados por el detalle DENTRO de la ventana del arqueo base. */
  paymentsSinceBase: string | null;
  paymentsSinceBaseTransactions: number | null;
  /** Inventario del baúl en el arqueo de referencia previo al período (valorizado). */
  periodStartStockValue: string | null;
  /**
   * El baúl quedó EXACTAMENTE en lo cargado desde el arqueo base: el cargue reemplazó el
   * contenido (lo que había antes salió durante la carga). Es la firma del retiro del sobrante.
   */
  stockReplacedAtLoad: boolean;
  /** Dispensado del período (cifra principal del cuadre físico). */
  periodTotal: string | null;
  /** Lo que el sistema registró como DISPENSADO (DP) en esta moneda. */
  systemTotal: string | null;
  /** Transacciones con salidas del dispensador en esta moneda (0 sin detalle). */
  transactions: number;
  /**
   * Tramos entre arqueos consecutivos del historial con salida que ningún pago del tramo
   * explica (auditoría; vacío cuando todo queda explicado o no hay arqueos intermedios).
   */
  tramos: DispensingArqueoTramo[];
}

export interface DispensingReconciliationCheck {
  /**
   * Modelo que mejor explica el registro del sistema (tolerancia 1 %), agregado sobre las
   * monedas comparables. `null` = la comparación NO aplica (ver `blocker`).
   */
  best: "arqueo" | "periodo" | "ninguno" | "retiro" | null;
  /** Por qué la verificación no aplica; `null` = sí aplica. */
  blocker: { code: DispensingReconciliationBlockerCode; detail: string } | null;
  /** Cobertura del barrido de detalles (`null` = no hay barrido). */
  coverage: { analyzed: number; complete: boolean; detailsFailures: number; truncated: boolean } | null;
  /** Comparación por moneda: la única válida cuando la máquina trabaja varias. */
  currencies: DispensingReconciliationCurrencyRow[];
  /**
   * Arqueo de referencia ANTERIOR al período (el último hasta el inicio del rango). Su fecha se
   * publica porque puede ser de días atrás: entonces NO representa el inventario de arranque y
   * la resta del período no se puede usar para acusar.
   */
  periodStartArqueo: { at: string | null; id: number | null } | null;
  /**
   * Arqueo BASE que abre la «ventana del arqueo» (el MÁS RECIENTE con fecha utilizable).
   * Puede ser DISTINTO de `periodStartArqueo` (el último anterior al período): con arqueos
   * intermedios dentro del período, citar sólo el de arranque del período hace leer mal la
   * ventana (caso real Inder 1: referencia #5680 del sábado, ventana abierta en el #5692
   * de ese mismo día, 25 s antes del cargue).
   */
  windowArqueo: { at: string | null; id: number | null } | null;
  /** Diferencia `modelo − sistema` agregada (con signo; `null` si no es calculable por moneda). */
  differences: { arqueo: string | null; periodo: string | null };
  /** Auditoría: lo que saldría contando el inventario previo del arqueo (una sola moneda). */
  fromArqueoTotal: string | null;
  /**
   * Salida del baúl en la ventana del arqueo base que ningún pago registrado explica
   * (una sola moneda). Es el candidato a retiro/reemplazo del sobrante al cargar: NO es
   * dispensado a clientes y debe declararse, no confundirse con la diferencia del período.
   */
  fromOutflowWithoutPayment: string | null;
  /** DISPENSADO del período (cifra principal), valorizado (una sola moneda). */
  fromPeriodTotal: string | null;
  /**
   * El período elegido incluye algún cargue, así que «cargado − en dispensadores − rechazado»
   * es calculable y la comparación es entre ventanas comparables. Con `false` (máquina sin
   * cargues en el período, caso real Pay+ Inder 1 mirando «Hoy» con el último cargue de hace
   * días) la diferencia contra la auditoría NO es un descuadre y se declara como tal.
   */
  periodComparable: boolean;
  /** De dónde sale la cifra del sistema (`null` = no hay medición admisible). */
  systemSource: "detalles" | "returnAmount" | null;
  /**
   * El detalle y `Σ returnAmount` discrepan (más allá de la tolerancia). Se publican las dos
   * cifras con su origen: en una máquina de cambio divisa `Σ returnAmount` no mide el dispensador.
   */
  systemSourceConflict: boolean;
  /** Pagos registrados por el detalle DENTRO de la ventana del arqueo (una sola moneda). */
  paymentsSinceBaseTotal: string | null;
  /** Cifra del sistema usada en la verificación (una sola moneda; `null` si hay varias). */
  systemTotal: string | null;
  /** `Σ returnAmount` del período (referencia; mezcla monedas en máquinas multimoneda). */
  returnAmountTotal: string | null;
  /** Cuántas transacciones respaldan la cifra del sistema. */
  transactionCount: number;
  /**
   * Salvedad sobre el origen de la cifra (p. ej. que el detalle indique una lectura invertida
   * y la verificación caiga a `Σ returnAmount`). `null` = sin salvedad.
   */
  note: string | null;
}

/**
 * Cuadre interno del arqueo base: la suma valorizada de sus detalles por denominación
 * contra los totales que el propio arqueo declara (los mismos que muestra la tabla
 * «Cargues y arqueos»). Si no coinciden, el punto de partida del cuadre físico es
 * sospechoso y el panel lo dice en lugar de dar por buena la salida calculada.
 */
export interface DispensingBaseSelfCheck {
  /** Totales declarados por el arqueo (`totalAp/totalDp/totalRj`). */
  declared: { ap: string; dp: string; rj: string };
  /** Suma de los detalles del arqueo (unidades × valor de la denominación). */
  details: { ap: string; dp: string; rj: string };
  /** `false` = los detalles no explican los totales declarados. */
  matches: boolean;
}

export interface DispensingMetrics {
  ap: { count: number; total: string };
  apPhysical: { at: string | null; currentTotal: string; total: string | null };
  cancelled: { count: number; total: string };
  /**
   * `outflowTotal` = salida del período del cargue (`Σ (cargada − saldo) × valor`, la
   * cifra operativa). `baseOutflowTotal` = salida desde el arqueo base (referencia).
   * `storageTotal` = inventario actual.
   */
  /**
   * El cuadre del período, valorizado: `cargado = dispensado + rechazado + en
   * dispensadores`. `dispensedTotal` es la cifra principal (DISPENSADO); `storageTotal` es
   * el total en dispensadores hoy (virtual); `arqueoTotal` es la auditoría con el inventario
   * previo del arqueo; `total` es el `totalDp` del último arqueo.
   */
  dp: {
    arqueoTotal: string | null;
    at: string | null;
    dispensedTotal: string | null;
    loadedTotal: string;
    rejectedTotal: string;
    storageTotal: string;
    total: string | null;
  };
  lastLoad: { at: string | null; elapsedMs: number | null; total: string | null };
  /** Verificación del cuadre físico contra `Σ returnAmount` (lo que el sistema registró). */
  reconciliationCheck: DispensingReconciliationCheck | null;
  /**
   * Frescura de la lectura del baúl (`dpStored`) que alimenta el cuadre y las columnas
   * «Dispensado»/«En dispensadores». El operador la necesita para saber si las cifras que ve
   * son las de la máquina ahora o las de la última vez que el tablero consultó.
   */
  storageSnapshot: { readAtMs: number | null };
  /**
   * Ventana del cuadre físico: del arqueo base hasta hoy (o del período UI si no hay
   * base). `baseSelfCheck` valida que el arqueo base cuadre consigo mismo; `null` cuando
   * no es comparable (sin base, sin detalles, cantidades firmadas legacy o varias monedas).
   */
  reconciliation: {
    baseAt: string | null;
    baseSelfCheck: DispensingBaseSelfCheck | null;
    hasBase: boolean;
    loadsSinceBaseCount: number;
    loadsSinceBaseTotal: string;
    /** Cargues desde el último cargue (incluido él): base del cuadre operativo. */
    loadsSinceLastLoadCount: number;
    loadsSinceLastLoadTotal: string;
    /**
     * Lo que se LLEYÓ del historial de arqueos. Permite decir en pantalla si la máquina
     * nunca se ha arqueado, si el API no devolvió registros o si los arqueos vienen sin
     * fecha, en vez de culpar a la máquina por un fallo de lectura.
     */
    arqueoHistory: DispensingArqueoHistory;
  };
  rj: { count: number; currentTotal: string; physicalTotal: string | null; total: string };
  /** Etiquetas de las monedas que la máquina trabaja hoy (p. ej. `["COP","USD"]`). */
  currencyLabels: string[];
  /**
   * `true` si el inventario en uso abarca más de una moneda: los importes agregados
   * (AP/RJ del período y el total del arqueo) suman monedas distintas y no son
   * comparables entre sí. El desglose por moneda sigue disponible.
   */
  multiCurrency: boolean;
  /** Sólo denominaciones en uso hoy (lo que la máquina realmente maneja). */
  rows: DispensingDenominationRow[];
  /** Filas del storage que NO son inventario en uso hoy, con su motivo (no se ocultan: se explican). */
  excludedRows: DispensingDenominationRow[];
  /** Inventario del baúl dispensador separado por moneda (una entrada por moneda en uso). */
  storageTotalsByCurrency: DispensingCurrencyTotal[];
  /** CARGADO del período por moneda (`Σ unidades × valor`); nunca suma monedas distintas. */
  loadedTotalsByCurrency: DispensingCurrencyTotal[];
  /** DISPENSADO del período por moneda (misma base que `loadOutflowTotalsByCurrency`). */
  dispensedTotalsByCurrency: DispensingCurrencyTotal[];
  /** RECHAZADO del período por moneda. */
  rejectedTotalsByCurrency: DispensingCurrencyTotal[];
  /** Aceptador HOY (`apTotal` del baúl) por moneda: el lado AP, separado. */
  acceptorTotalsByCurrency: DispensingCurrencyTotal[];
  /** Baúl de rechazo HOY (`rjTotal`) por moneda: el lado RJ, separado. */
  rejectionTotalsByCurrency: DispensingCurrencyTotal[];
  /** Totales del arqueo base (AP/DP/RJ) por moneda, valorizados desde sus detalles. */
  arqueoTotalsByCurrency: DispensingArqueoCurrencyTotal[];
  /** Identidad del cuadre por moneda (una entrada por moneda en uso). */
  identityByCurrency: DispensingCurrencyIdentity[];
  /** Salida del período del cargue por moneda (`Σ (cargada − saldo) × valor`); vacío sin cargues. */
  loadOutflowTotalsByCurrency: DispensingCurrencyTotal[];
  /** Salida física desde el arqueo base, por moneda (vacío sin arqueo base). */
  outflowTotalsByCurrency: DispensingCurrencyTotal[];
}

function toInt(value: string | number | null | undefined, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : fallback;
  }

  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toMillis(value: string | null | undefined): number {
  if (!value) {
    return Number.NaN;
  }

  const time = new Date(value).getTime();
  return time;
}

/** Centavos con signo desde un decimal del API (tolerante: `null` si no interpreta). */
function decimalToCents(value: string): bigint | null {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/u.exec(value.trim());
  if (!match) {
    return null;
  }

  const fraction = (match[3] ?? "").slice(0, 2).padEnd(2, "0");
  const cents = BigInt(match[2] ?? "0") * 100n + BigInt(fraction);
  return match[1] === "-" ? -cents : cents;
}

function centsToDecimal(cents: bigint): string {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const integer = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return fraction === "00"
    ? `${negative ? "-" : ""}${integer.toString()}`
    : `${negative ? "-" : ""}${integer.toString()}.${fraction}`;
}

function sumDecimalStrings(values: readonly string[]): string {
  let cents = 0n;
  let anyParsed = false;

  for (const value of values) {
    const parsed = decimalToCents(value);
    if (parsed === null) {
      continue;
    }
    anyParsed = true;
    cents += parsed;
  }

  return anyParsed ? centsToDecimal(cents) : "0";
}

/** Importe de `units` (con signo) × valor de la denominación, en centavos. */
function unitsValueCents(denominationValue: string, units: number): bigint {
  const valueCents = decimalToCents(denominationValue);
  if (valueCents === null) {
    return 0n;
  }

  return valueCents * BigInt(units);
}

function latestBy<T>(items: readonly T[], key: (item: T) => number): T | null {
  let best: T | null = null;
  let bestKey = Number.NEGATIVE_INFINITY;

  for (const item of items) {
    const value = key(item);
    if (!Number.isNaN(value) && value > bestKey) {
      best = item;
      bestKey = value;
    }
  }

  return best;
}

interface MovementDetail {
  denominationValue: string;
  idCurrencyDenomination: number | null;
  quantity: string;
}

function detailMatches(detail: MovementDetail, denominationId: number, denominationValue: string): boolean {
  if (detail.idCurrencyDenomination !== null) {
    return detail.idCurrencyDenomination === denominationId;
  }

  // Los arqueos/cargues viejos pueden venir sin id de denominación (el lector V4 lo
  // admite como `null`): el valor visible es el respaldo determinista, igual que en
  // el motor de atascos para los cargues.
  return toInt(detail.denominationValue) === toInt(denominationValue);
}

function detailQuantity(
  details: readonly MovementDetail[],
  denominationId: number,
  denominationValue: string,
): number {
  let total = 0;
  for (const detail of details) {
    if (detailMatches(detail, denominationId, denominationValue)) {
      total += toInt(detail.quantity);
    }
  }
  return total;
}

function traceTime(value: string | null): number {
  const time = toMillis(value);
  return Number.isNaN(time) ? 0 : time;
}

function tonnageDetailFor(
  tonnage: Tonnage | null,
  denominationId: number,
  denominationValue: string,
): Tonnage["details"][number] | undefined {
  if (!tonnage) {
    return undefined;
  }

  return (
    tonnage.details.find((item) => item.idCurrencyDenomination === denominationId) ??
    tonnage.details.find(
      (item) => item.idCurrencyDenomination === null && toInt(item.denominationValue) === toInt(denominationValue),
    )
  );
}

export function computeDispensingMetrics(input: DispensingMetricsInput): DispensingMetrics {
  const { byState, lastTonnage, loads, now, rangeFrom, rangeTo, storage } = input;
  const currencyIndex = buildDenominationCurrencyIndex({
    denominations: input.denominations ?? [],
    machineCurrency: input.machineCurrency ?? null,
    storage,
  });
  const machineCurrencyId = input.machineCurrency?.id ?? null;

  const lastLoad = latestBy(loads, (load) => toMillis(load.dateCreated));
  const lastLoadTime = lastLoad ? toMillis(lastLoad.dateCreated) : Number.NaN;
  const lastLoadInRange = !Number.isNaN(lastLoadTime) && lastLoadTime >= rangeFrom.getTime() && lastLoadTime <= rangeTo.getTime();
  const loadsInRange = loads.filter((load) => {
    const time = toMillis(load.dateCreated);
    return !Number.isNaN(time) && time >= rangeFrom.getTime() && time <= rangeTo.getTime();
  });
  const rangeLoadsTotal = sumDecimalStrings(loadsInRange.map((load) => load.totalLoaded));

  // Ventana del cuadre físico: (arqueo base → hoy]. El límite inferior es EXCLUSIVO
  // (un cargue incluido en el snapshot de la base no se vuelve a sumar), igual que la
  // caída física del motor de atascos. Sin base no hay inicial: los cargues caen al
  // período UI como referencia y la salida física queda indeterminada.
  const baseTime = toMillis(lastTonnage?.dateCreated ?? null);
  const hasBase = lastTonnage !== null && !Number.isNaN(baseTime);
  // Diagnóstico del historial: qué se LLEYÓ (no qué se supone). `tonnages` puede venir vacío
  // cuando nadie lo pasa; en ese caso el único arqueo conocido es la base ya elegida.
  const arqueoHistoryList = input.tonnages ?? (lastTonnage ? [lastTonnage] : []);
  const arqueoHistory: DispensingArqueoHistory = {
    baseId: lastTonnage?.id ?? null,
    count: arqueoHistoryList.length,
    errorMessage: input.arqueoHistoryError ?? null,
    lastAt: lastTonnage?.dateCreated ?? null,
    withoutDate: arqueoHistoryList.filter((tonnage) => Number.isNaN(toMillis(tonnage.dateCreated ?? null))).length,
  };
  const loadsSinceBase = hasBase
    ? loads.filter((load) => {
        const time = toMillis(load.dateCreated);
        return !Number.isNaN(time) && time > baseTime;
      })
    : loadsInRange;
  const loadsSinceBaseTotal = sumDecimalStrings(loadsSinceBase.map((load) => load.totalLoaded));

  // Ventana del ÚLTIMO CARGUE (INCLUSIVO: el cargue mismo es la base). Es el cuadre que
  // la operación usa a diario — «cargué 140 el 19 y hoy quedan 16 ⇒ entregó 124» — y no
  // depende de ningún arqueo: por eso nunca puede dar más de lo cargado.
  const hasLastLoad = lastLoad !== null && !Number.isNaN(lastLoadTime);
  const hasLoadInRange = loadsInRange.length > 0;
  // Arqueo inmediatamente anterior (o al inicio) del período: dice cuánto había en los
  // baúles cuando empezó la ventana. Es referencia de auditoría, no parte del cuadre.
  const periodStartTonnage = latestBy(
    (input.tonnages ?? []).filter((tonnage) => {
      const time = toMillis(tonnage.dateCreated);
      return !Number.isNaN(time) && time <= rangeFrom.getTime();
    }),
    (tonnage) => toMillis(tonnage.dateCreated),
  );
  const loadsSinceLastLoad = hasLastLoad
    ? loads.filter((load) => {
        const time = toMillis(load.dateCreated);
        return !Number.isNaN(time) && time >= lastLoadTime;
      })
    : [];
  const loadsSinceLastLoadTotal = sumDecimalStrings(loadsSinceLastLoad.map((load) => load.totalLoaded));

  const allRows: DispensingDenominationRow[] = storage
    .map((entry) => {
      const baseDetail = tonnageDetailFor(lastTonnage, entry.idCurrencyDenomination, entry.denominationValue);
      const rawInitialDp = hasBase && baseDetail ? toInt(baseDetail.quantityDp) : 0;
      const rawInitialRj = hasBase && baseDetail ? toInt(baseDetail.quantityRj) : 0;
      const rawInitialAp = hasBase && baseDetail ? toInt(baseDetail.quantityAp) : 0;
      const balance = toInt(entry.dpStored);
      const minDpQuantity = toInt(entry.minDpQuantity);
      const rejectionStock = toInt(entry.rjStored);
      const acceptedStock = toInt(entry.apStored);
      const loadedInRange = detailQuantity(
        loadsInRange.flatMap((load) => load.details),
        entry.idCurrencyDenomination,
        entry.denominationValue,
      );
      const loadedSinceBase = detailQuantity(
        loadsSinceBase.flatMap((load) => load.details),
        entry.idCurrencyDenomination,
        entry.denominationValue,
      );
      const loadedSinceLastLoad = detailQuantity(
        loadsSinceLastLoad.flatMap((load) => load.details),
        entry.idCurrencyDenomination,
        entry.denominationValue,
      );
      // Trazabilidad: qué cargues (con fecha) aportaron esta cifra. Ordenada por fecha
      // para que el operador vea si alguno quedó fuera del período filtrado.
      const loadsSinceBaseTrace = loadsSinceBase
        .flatMap((load) =>
          load.details
            .filter((detail) => detailMatches(detail, entry.idCurrencyDenomination, entry.denominationValue) && toInt(detail.quantity) !== 0)
            .map((detail) => ({ at: load.dateCreated ?? null, quantity: toInt(detail.quantity) })),
        )
        .sort((left, right) => traceTime(left.at) - traceTime(right.at));

      // Un arqueo legacy puede traer cantidades NEGATIVAS (firmadas). El inicial se
      // acota a 0 y se declara el valor reportado; la SALIDA física, en cambio, sí
      // admite negativos (el conteo subió: cargue no registrado o descuadre previo).
      const negatives: string[] = [];
      if (hasBase && baseDetail && rawInitialDp < 0) {
        negatives.push(`${rawInitialDp} en dispensador`);
      }
      if (hasBase && baseDetail && rawInitialRj < 0) {
        negatives.push(`${rawInitialRj} en rechazo`);
      }
      if (hasBase && baseDetail && rawInitialAp < 0) {
        negatives.push(`${rawInitialAp} en aceptador`);
      }
      const negativeReport = negatives.length === 0 ? null : `El arqueo base reporta ${negatives.join(", ")}: se toma 0.`;

      const initialDp = Math.max(0, rawInitialDp);
      const initialRj = Math.max(0, rawInitialRj);
      const initialAp = Math.max(0, rawInitialAp);
      // AUDITORÍA (arqueo): lo que habría salido contando el inventario previo del arqueo.
      const deliveredFromBase = hasBase ? initialDp + loadedSinceBase - balance : null;
      const rejectedDelta = hasBase ? rejectionStock - initialRj : null;
      const rejectGrowth = rejectedDelta === null ? 0 : Math.max(0, rejectedDelta);
      const dispensedFromArqueo = deliveredFromBase === null ? null : deliveredFromBase - rejectGrowth;
      // CUADRE DEL PERÍODO (cifra principal): CARGADO − EN DISPENSADORES HOY − RECHAZADO
      // DEL PERÍODO. Cierra por construcción: dispensado + rechazado + en dispensadores =
      // cargado («cargué 140, quedan 11, 5 al rechazo ⇒ entregué 124»).
      const loadedInPeriod = loadedInRange;
      const startDetail = tonnageDetailFor(periodStartTonnage, entry.idCurrencyDenomination, entry.denominationValue);
      const rejectedAtPeriodStart = startDetail ? Math.max(0, toInt(startDetail.quantityRj)) : null;
      const stockAtPeriodStart = startDetail ? Math.max(0, toInt(startDetail.quantityDp)) : null;
      // El baúl de rechazo que CRECE viene del dispensador (salió y no llegó al cliente); el que
      // BAJA se vació en mantenimiento o extracción: no es entrega a clientes y no puede sumar al
      // dispensado (antes un Δ −9 producía «dispensado +9» y rompía el cuadre y el estado quieto).
      const rejectedInPeriod = Math.max(0, rejectionStock - (rejectedAtPeriodStart ?? 0));
      const dispensedInPeriod = hasLoadInRange ? loadedInPeriod - balance - rejectedInPeriod : null;
      const deliveredFromLoad = dispensedInPeriod;
      const currency = currencyIndex.get(entry.idCurrencyDenomination);
      const foreignCurrency = machineCurrencyId !== null && currency?.currencyId != null && currency.currencyId !== machineCurrencyId;

      // ¿La máquina usa HOY esta denominación? La misma regla del motor de atascos: la
      // configuración, el saldo (DP/RJ/AP), los cargues desde la base o las existencias
      // del arqueo base. Una fila heredada —el billete de USD 1 que solo aparece en
      // `PayPad/GetStorage` con todo en cero y un arqueo negativo— no es inventario de
      // la máquina y no debe figurar en el desglose. El dashboard antiguo tampoco la
      // muestra: su «Lista de Denominaciones» filtra el catálogo por la moneda del Pay+
      // (`idCurrency === paypad.idCurrency`).
      const usageSignals = {
        acceptedLastArqueo: hasBase ? rawInitialAp : null,
        acceptedStock,
        configured: entry.isDispensing,
        deliveredInPeriod: false,
        deliveredLastArqueo: hasBase ? rawInitialDp : null,
        dispensingStock: balance,
        failedInPeriod: false,
        loadedInPeriod: loadedSinceBase,
        minDpQuantity,
        rejectedLastArqueo: hasBase ? rawInitialRj : null,
        rejectionStock,
      };
      const inUse = isDenominationInUse(usageSignals);
      const inUseReasons = describeDenominationUsage(usageSignals);

      const excludedParts: string[] = [];
      if (!inUse) {
        excludedParts.push(DENOMINATION_NOT_IN_USE_REASON);
        if (negativeReport) {
          excludedParts.push(negativeReport);
        }
        if (foreignCurrency) {
          excludedParts.push(
            `Su moneda (${denominationCurrencyText(currency) ?? "no declarada"}) no es la del Pay+ (${input.machineCurrency?.label ?? "no declarada"}).`,
          );
        }
      }

      return {
        balance,
        balanceValue: entry.dpTotal,
        currencyId: currency?.currencyId ?? null,
        currencyLabel: denominationCurrencyText(currency),
        denominationId: entry.idCurrencyDenomination,
        denominationValue: entry.denominationValue,
        delivered: dispensedInPeriod,
        deliveredFromBase,
        deliveredFromLoad,
        dispensedFromArqueo,
        dispensedInPeriod,
        loadedInPeriod,
        rejectedAtPeriodStart,
        rejectedInPeriod,
        stockAtPeriodStart,
        excludedReason: excludedParts.length === 0 ? null : excludedParts.join(" "),
        foreignCurrency,
        initialAp,
        initialDp,
        initialRj,
        inUse,
        inUseReasons,
        isDispensing: entry.isDispensing,
        loadedInRange,
        loadedSinceBase,
        loadedSinceLastLoad,
        loadsSinceBaseTrace,
        low: entry.isDispensing && balance <= minDpQuantity + LOW_BALANCE_TOLERANCE,
        minDpQuantity,
        negativeReport,
        rejected: rejectionStock,
        rejectedDelta,
        rejectedValue: entry.rjTotal,
        isNegativeStock: dispensedInPeriod !== null && dispensedInPeriod < 0,
        shortage: deliveredFromBase !== null && deliveredFromBase < 0,
      };
    })
    // Moneda primero (agrupada) y valor descendente dentro de ella: sin esto, un
    // billete de USD 100 se ordenaba entre los de COP 50.000 y el operador no podía
    // distinguir de qué moneda era cada baúl.
    .sort((left, right) => {
      const leftLabel = left.currencyLabel ?? "";
      const rightLabel = right.currencyLabel ?? "";
      if (leftLabel !== rightLabel) {
        return leftLabel.localeCompare(rightLabel);
      }
      return toInt(right.denominationValue) - toInt(left.denominationValue);
    });

  const rows = allRows.filter((row) => row.inUse);
  const excludedRows = allRows.filter((row) => !row.inUse);
  const inUseIds = new Set(rows.map((row) => row.denominationId));

  // Los totales se calculan SOLO con el inventario en uso: si no, un saldo residual de
  // una moneda que la máquina no maneja aparece como «USD $0».
  const storageTotal = sumDecimalStrings(rows.map((entry) => entry.balanceValue));
  const totalsByCurrency = new Map<string, DispensingCurrencyTotal>();
  for (const row of rows) {
    const key = row.currencyId === null ? "none" : String(row.currencyId);
    const current = totalsByCurrency.get(key) ?? { currencyId: row.currencyId, label: row.currencyLabel, total: "0" };
    current.total = sumDecimalStrings([current.total, row.balanceValue]);
    totalsByCurrency.set(key, current);
  }

  /**
   * Entregado a clientes valorizado, por modelo y moneda. Se valoriza al final
   * (unidades × valor) y NUNCA se suman monedas distintas entre sí.
   */
  function valueByCurrency(pick: (row: DispensingDenominationRow) => number | null): { byCurrency: Map<string, DispensingCurrencyTotal>; total: string } {
    const byCurrency = new Map<string, DispensingCurrencyTotal>();
    const centsByCurrency = new Map<string, { currencyId: number | null; cents: bigint; label: string | null }>();
    for (const row of rows) {
      const cents = unitsValueCents(row.denominationValue, pick(row) ?? 0);
      const key = row.currencyId === null ? "none" : String(row.currencyId);
      const current = centsByCurrency.get(key) ?? { currencyId: row.currencyId, cents: 0n, label: row.currencyLabel };
      current.cents += cents;
      centsByCurrency.set(key, current);
    }
    for (const [key, entry] of centsByCurrency) {
      byCurrency.set(key, { currencyId: entry.currencyId, label: entry.label, total: centsToDecimal(entry.cents) });
    }
    return { byCurrency, total: centsToDecimal([...centsByCurrency.values()].reduce((sum, entry) => sum + entry.cents, 0n)) };
  }

  // CUADRE DEL PERÍODO, valorizado por moneda: cargado = dispensado + rechazado + en
  // dispensadores. Es la vista que la operación usa («cargué 140, quedan 11, 5 al rechazo,
  // entregué 124») y se publica completa para que cada columna se pueda auditar.
  const valuedLoaded = valueByCurrency((row) => row.loadedInPeriod);
  const valuedDispensed = valueByCurrency((row) => row.dispensedInPeriod);
  const valuedRejected = valueByCurrency((row) => row.rejectedInPeriod);
  const valuedStorage = valueByCurrency((row) => row.balance);
  // Auditoría de ventanas: lo que el cargue repuso desde el arqueo base y lo que el baúl ya
  // tenía cuando empezó el período. Sin estas dos cifras el operador no puede explicar por qué
  // «cargado − en dispensadores − rechazado» da $0 en una máquina que sí pagó.
  const valuedLoadedSinceBase = valueByCurrency((row) => row.loadedSinceBase);
  const valuedPeriodStartStock = valueByCurrency((row) => row.stockAtPeriodStart);
  const loadOutflowTotalsByCurrency = [...valuedDispensed.byCurrency.values()];
  const outflowByCurrency = new Map<string, DispensingCurrencyTotal>();
  if (hasBase) {
    const valuedArqueo = valueByCurrency((row) => row.dispensedFromArqueo);
    for (const [key, entry] of valuedArqueo.byCurrency) {
      outflowByCurrency.set(key, entry);
    }
  }
  const clientsFromBaseTotal = hasBase ? valueByCurrency((row) => row.dispensedFromArqueo).total : null;
  const clientsFromLoadTotal = hasLoadInRange ? valuedDispensed.total : null;

  const inUseStorage = storage.filter((entry) => inUseIds.has(entry.idCurrencyDenomination));
  const rejectCurrentTotal = sumDecimalStrings(inUseStorage.map((entry) => entry.rjTotal));
  const acceptorCurrentTotal = sumDecimalStrings(inUseStorage.map((entry) => entry.apTotal));

  /** Totales del baúl por moneda (AP o RJ): los importes de monedas distintas no se suman. */
  function storageTotalsByCurrencyOf(pick: (entry: PayPadStorage) => string): DispensingCurrencyTotal[] {
    const totals = new Map<string, DispensingCurrencyTotal>();
    for (const entry of inUseStorage) {
      const currency = currencyIndex.get(entry.idCurrencyDenomination);
      const currencyId = currency?.currencyId ?? null;
      const key = currencyId === null ? "none" : String(currencyId);
      const current = totals.get(key) ?? { currencyId, label: denominationCurrencyText(currency), total: "0" };
      current.total = sumDecimalStrings([current.total, pick(entry)]);
      totals.set(key, current);
    }
    return [...totals.values()].sort((left, right) => (left.label ?? "").localeCompare(right.label ?? ""));
  }

  const acceptorTotalsByCurrency = storageTotalsByCurrencyOf((entry) => entry.apTotal);
  const rejectionTotalsByCurrency = storageTotalsByCurrencyOf((entry) => entry.rjTotal);

  // Totales del ARQUEO BASE por moneda, valorizados desde sus detalles: los `totalAp/totalDp/
  // totalRj` que declara el arqueo agregan monedas distintas y no se pueden leer entre sí.
  const arqueoTotalsByCurrency: DispensingArqueoCurrencyTotal[] = (() => {
    if (!hasBase || lastTonnage === null) {
      return [];
    }

    const totals = new Map<string, { ap: bigint; currencyId: number | null; dp: bigint; label: string | null; rj: bigint }>();
    for (const detail of lastTonnage.details) {
      // Un detalle legacy puede venir sin id de denominación: se resuelve por el valor visible
      // contra el inventario en uso (mismo respaldo determinista que usa el resto del módulo).
      const byId = detail.idCurrencyDenomination === null ? undefined : currencyIndex.get(detail.idCurrencyDenomination);
      const byValue = rows.find((row) => toInt(row.denominationValue) === toInt(detail.denominationValue));
      const currencyId = byId ? byId.currencyId : (byValue?.currencyId ?? null);
      const label = byId ? denominationCurrencyText(byId) : (byValue?.currencyLabel ?? null);
      const key = currencyId === null ? "none" : String(currencyId);
      const current = totals.get(key) ?? { ap: 0n, currencyId, dp: 0n, label, rj: 0n };
      current.ap += unitsValueCents(detail.denominationValue, Math.max(0, toInt(detail.quantityAp)));
      current.dp += unitsValueCents(detail.denominationValue, Math.max(0, toInt(detail.quantityDp)));
      current.rj += unitsValueCents(detail.denominationValue, Math.max(0, toInt(detail.quantityRj)));
      totals.set(key, current);
    }

    return [...totals.values()]
      .map((entry) => ({
        ap: centsToDecimal(entry.ap),
        currencyId: entry.currencyId,
        dp: centsToDecimal(entry.dp),
        label: entry.label,
        rj: centsToDecimal(entry.rj),
      }))
      .sort((left, right) => (left.label ?? "").localeCompare(right.label ?? ""));
  })();

  /* ── VERIFICACIÓN CONTRA LO QUE REGISTRÓ EL SISTEMA ─────────────────────────────────
   * Dos orígenes posibles, y NO son intercambiables (caso real Pay+ ODRB Rionegro, ID 1288,
   * máquina de cambio divisa COP ⇄ USD, que acusaba «hay dinero sin registro» por $8.041.000):
   *
   *  1. DETALLE por transacción (`systemEvidence`): cada billete con su operación y su moneda,
   *     o sea el lado DP real y el único atribuible por moneda.
   *  2. `Σ returnAmount` de las aprobadas: sólo admisible con UNA moneda, porque el DTO de
   *     transacción no declara la moneda de cada importe y, en una máquina que recibe dólares
   *     y entrega pesos, ese campo describe lo que ENTRÓ al aceptador (AP), no lo que salió
   *     del dispensador (DP).
   *
   * La comparación se hace POR MONEDA y sólo cuando el período tiene cargues en esa moneda:
   * sin cargue no existe «cargado − en dispensadores − rechazado» que despejar. Cuando ningún
   * origen es admisible, el resultado es «verificación no aplicable» con el motivo, nunca una
   * acusación de descuadre.
   * ─────────────────────────────────────────────────────────────────────────────────── */
  const evidence = input.systemEvidence ?? null;
  const evidenceUsable = isSystemEvidenceUsable(evidence);
  // La máquina puede ser multimoneda por su inventario o por lo que muestran los detalles
  // (entra USD, sale COP): en ambos casos `Σ returnAmount` deja de ser atribuible.
  const machineMultiCurrency = new Set(rows.map((row) => row.currencyId)).size > 1 || (evidence?.multiCurrency ?? false);
  const returnAmountCents = input.cashDispensedTotal == null ? null : decimalToCents(input.cashDispensedTotal);
  const approvedCount = byState[APPROVED_STATE]?.count ?? 0;
  const periodComparable = hasLoadInRange;
  // Monedas con cargue en el período: sólo ahí se puede despejar el dispensado.
  const currenciesWithLoad = new Set<string>();
  for (const row of rows) {
    if (row.loadedInPeriod !== 0) {
      currenciesWithLoad.add(row.currencyId === null ? "none" : String(row.currencyId));
    }
  }

  // Identidad por moneda: cada columna valorizada en su propia moneda (nunca se suman).
  const identityByCurrency: DispensingCurrencyIdentity[] = [...valuedDispensed.byCurrency.entries()]
    .map(([key, dispensed]) => ({
      currencyId: dispensed.currencyId,
      dispensed: dispensed.total,
      hasLoad: currenciesWithLoad.has(key),
      label: dispensed.label,
      loaded: valuedLoaded.byCurrency.get(key)?.total ?? "0",
      rejected: valuedRejected.byCurrency.get(key)?.total ?? "0",
      storage: valuedStorage.byCurrency.get(key)?.total ?? "0",
    }))
    .sort((left, right) => (left.label ?? "").localeCompare(right.label ?? ""));

  const reconciliationCheck: DispensingReconciliationCheck | null = (() => {
    if (evidence === null && returnAmountCents === null) {
      return null;
    }

    const abs = (value: bigint): bigint => (value < 0n ? -value : value);
    /** Tolerancia 1 % (billetes sueltos, redondeos del API), mínimo un centavo. */
    const tolerance = (value: bigint): bigint => (abs(value) / 100n > 1n ? abs(value) / 100n : 1n);

    // Período SIN transacciones y sin salida física (máquina recién cargada, cargue íntegro en
    // los baúles): no hay dos cifras que comparar. Antes caía en «cobertura»/«multimoneda» y
    // pintaba «$0 contra $8.013.400 del arqueo»: ruido que parece faltante y no lo es. OJO: con
    // salida física y cero transacciones SÍ es descuadre (salió dinero sin registro) y se acusa.
    const periodTransactionCount = Object.values(byState).reduce((sum, bucket) => sum + bucket.count, 0);
    const physicallyQuiet =
      identityByCurrency.length > 0 &&
      identityByCurrency.every((entry) => !entry.hasLoad || (decimalToCents(entry.dispensed) ?? 1n) === 0n);
    const quietPeriod = periodTransactionCount === 0 && physicallyQuiet && identityByCurrency.some((entry) => entry.hasLoad);

    const systemSource: DispensingReconciliationCheck["systemSource"] = evidenceUsable
      ? "detalles"
      : quietPeriod
        ? null
        : !machineMultiCurrency && returnAmountCents !== null
          ? "returnAmount"
          : // Con cero transacciones «Σ devuelto» es 0 en cualquier moneda (no mezcla nada): es
            // admisible incluso en multimoneda, y es lo que permite acusar una salida sin registro.
            periodTransactionCount === 0 && returnAmountCents !== null
            ? "returnAmount"
            : null;

    const coverage =
      evidence === null
        ? null
        : {
            analyzed: evidence.analyzedTransactions,
            complete: evidenceUsable,
            detailsFailures: evidence.detailsFailures,
            truncated: evidence.truncated,
          };

    const evidenceByCurrency = new Map<string, SystemDispensedEvidence["byCurrency"][number]>();
    for (const entry of evidence?.byCurrency ?? []) {
      evidenceByCurrency.set(entry.currencyId === null ? "none" : String(entry.currencyId), entry);
    }

    // Monedas en juego: las del cuadre físico y las que aparecen en el detalle.
    const currencyKeys = new Map<string, { currencyId: number | null; label: string | null }>();
    for (const entry of [...valuedDispensed.byCurrency.values(), ...outflowByCurrency.values()]) {
      const key = entry.currencyId === null ? "none" : String(entry.currencyId);
      if (!currencyKeys.has(key)) {
        currencyKeys.set(key, { currencyId: entry.currencyId, label: entry.label });
      }
    }
    for (const [key, entry] of evidenceByCurrency) {
      if (!currencyKeys.has(key)) {
        currencyKeys.set(key, { currencyId: entry.currencyId, label: entry.label });
      }
    }
    if (systemSource === "returnAmount" && currencyKeys.size === 0) {
      // Sin filas físicas (máquina sin baúles en uso): la comparación cae a los totales escalares.
      currencyKeys.set("maquina", { currencyId: machineCurrencyId, label: input.machineCurrency?.label ?? null });
    }

    // ── TRAMOS ENTRE ARQUEOS ────────────────────────────────────────────────────
    // La ventana del arqueo base sólo ve (base → ahora]. Los bajones ENTRE arqueos
    // intermedios del historial quedan invisibles aunque estén contados (caso real Inder 1:
    // −$124.000 entre los arqueos #5690 y #5692 del mismo día). Se audita cada tramo entre
    // arqueos consecutivos —arrancando en la referencia anterior al período— restando de la
    // salida CONTADA los pagos registrados DENTRO del tramo (por diferencia de acumulados
    // de la evidencia). Sólo se declara lo que queda sin pago más allá de la tolerancia.
    const tramosByCurrency = new Map<string, DispensingArqueoTramo[]>();
    (() => {
      // Los pagos del tramo sólo se afirman con cobertura COMPLETA del barrido (mismo
      // candado que `paymentsSinceBase`): un barrido truncado subestima los pagos y
      // fabricaría un «sin pago» inexistente. Sin cobertura se declara «sin medición».
      const tramoEvidence = evidenceUsable ? evidence : null;
      const rangeFromMs = input.rangeFrom.getTime();
      const rangeToMs = input.rangeTo.getTime();
      const usable = (input.tonnages ?? [])
        .map((tonnage) => ({ atMs: toMillis(tonnage.dateCreated ?? null), tonnage }))
        .filter((entry) => !Number.isNaN(entry.atMs) && entry.atMs > rangeFromMs && entry.atMs <= rangeToMs)
        .sort((left, right) => left.atMs - right.atMs);
      const startAtMs = toMillis(periodStartTonnage?.dateCreated ?? null);
      const boundaries = [
        ...(periodStartTonnage !== null && !Number.isNaN(startAtMs)
          ? [{ atMs: startAtMs, tonnage: periodStartTonnage }]
          : []),
        ...usable,
      ];
      if (boundaries.length < 2) {
        return;
      }
      // Moneda de un detalle de arqueo/cargue: por id contra el catálogo y, si es legacy sin
      // id, por el valor visible contra el inventario en uso (mismo respaldo que usa
      // `arqueoTotalsByCurrency`).
      const currencyKeyOfDetail = (detail: {
        idCurrencyDenomination: number | null;
        denominationValue: string | number | null;
      }): { key: string; currencyId: number | null } => {
        const byId = detail.idCurrencyDenomination === null ? undefined : currencyIndex.get(detail.idCurrencyDenomination);
        if (byId) {
          return { key: byId.currencyId === null ? "none" : String(byId.currencyId), currencyId: byId.currencyId };
        }
        const byValue = rows.find((row) => toInt(row.denominationValue) === toInt(detail.denominationValue));
        const currencyId = byValue?.currencyId ?? null;
        return { key: currencyId === null ? "none" : String(currencyId), currencyId };
      };
      for (let index = 0; index + 1 < boundaries.length; index += 1) {
        const from = boundaries[index]!;
        const to = boundaries[index + 1]!;
        if (from.tonnage.id !== null && from.tonnage.id === to.tonnage.id) {
          continue;
        }
        const loadsInTramo = loads.filter((load) => {
          const time = toMillis(load.dateCreated);
          return !Number.isNaN(time) && time > from.atMs && time <= to.atMs;
        });
        // Identidad por denominación: contado inicial + cargues del tramo − contado final −
        // rechazo NUEVO (el rechazo que baja se vació: no es entrega y no suma).
        const denominations = new Map<
          string,
          { currencyId: number | null; dpFrom: number; dpTo: number; loaded: number; rjFrom: number; rjTo: number; value: string }
        >();
        const detailKey = (detail: { idCurrencyDenomination: number | null; denominationValue: string | number | null }) =>
          `${detail.idCurrencyDenomination ?? "?"}|${String(detail.denominationValue ?? "")}`;
        const denominationEntry = (
          detail: { idCurrencyDenomination: number | null; denominationValue: string | number | null },
        ) => {
          const key = detailKey(detail);
          let entry = denominations.get(key);
          if (!entry) {
            entry = {
              currencyId: currencyKeyOfDetail(detail).currencyId,
              dpFrom: 0,
              dpTo: 0,
              loaded: 0,
              rjFrom: 0,
              rjTo: 0,
              value: String(detail.denominationValue ?? "0"),
            };
            denominations.set(key, entry);
          }
          return entry;
        };
        for (const detail of from.tonnage.details) {
          const entry = denominationEntry(detail);
          entry.dpFrom = Math.max(0, toInt(detail.quantityDp));
          entry.rjFrom = Math.max(0, toInt(detail.quantityRj));
        }
        for (const detail of to.tonnage.details) {
          const entry = denominationEntry(detail);
          entry.dpTo = Math.max(0, toInt(detail.quantityDp));
          entry.rjTo = Math.max(0, toInt(detail.quantityRj));
        }
        for (const load of loadsInTramo) {
          for (const detail of load.details) {
            denominationEntry(detail).loaded += Math.max(0, toInt(detail.quantity));
          }
        }
        // Acumulado por moneda: salida del tramo y conteos de cada extremo (en unidades
        // valorizadas; el conteo que SUBE deja la salida negativa y no se declara).
        const byCurrencyOutflow = new Map<string, bigint>();
        const byCurrencyFrom = new Map<string, bigint>();
        const byCurrencyTo = new Map<string, bigint>();
        const currencyIdByKey = new Map<string, number | null>();
        for (const entry of denominations.values()) {
          const key = entry.currencyId === null ? "none" : String(entry.currencyId);
          currencyIdByKey.set(key, entry.currencyId);
          const outflowUnits = entry.dpFrom + entry.loaded - entry.dpTo - Math.max(0, entry.rjTo - entry.rjFrom);
          byCurrencyOutflow.set(key, (byCurrencyOutflow.get(key) ?? 0n) + unitsValueCents(entry.value, outflowUnits));
          byCurrencyFrom.set(key, (byCurrencyFrom.get(key) ?? 0n) + unitsValueCents(entry.value, entry.dpFrom));
          byCurrencyTo.set(key, (byCurrencyTo.get(key) ?? 0n) + unitsValueCents(entry.value, entry.dpTo));
        }
        // Pagos DENTRO del tramo, por diferencia de acumulados de la evidencia:
        // desde(b_from) − desde(b_to) = dispensado en (b_from, b_to].
        for (const [key, outflowCents] of byCurrencyOutflow) {
          const boundaryEntry =
            tramoEvidence?.byCurrency.find((row) => (row.currencyId === null ? "none" : String(row.currencyId)) === key) ?? null;
          const cumulative = (atMs: number): bigint | null => {
            const boundary = boundaryEntry?.dispensedSinceBoundaries.find(
              (candidate) => candidate !== null && candidate.atMs === atMs,
            );
            return boundary === undefined || boundary === null ? null : decimalToCents(boundary.value);
          };
          const fromCumulative = cumulative(from.atMs);
          const toCumulative = cumulative(to.atMs);
          const paymentsCents = fromCumulative !== null && toCumulative !== null ? fromCumulative - toCumulative : null;
          const sinPagoCents = paymentsCents === null ? null : outflowCents - paymentsCents;
          // Sin medición de pagos NO se declara un «sin pago»: se declaran los conteos y la
          // falta de medición. Con medición, sólo lo que supera la tolerancia es noticia.
          const tol = tolerance(outflowCents > 0n ? outflowCents : 1n);
          const declare = sinPagoCents !== null ? sinPagoCents > tol : outflowCents > tol;
          if (!declare) {
            continue;
          }
          const list = tramosByCurrency.get(key) ?? [];
          list.push({
            fromArqueo: { at: from.tonnage.dateCreated ?? null, id: from.tonnage.id ?? null },
            toArqueo: { at: to.tonnage.dateCreated ?? null, id: to.tonnage.id ?? null },
            fromValue: centsToDecimal(byCurrencyFrom.get(key) ?? 0n),
            toValue: centsToDecimal(byCurrencyTo.get(key) ?? 0n),
            outflow: centsToDecimal(outflowCents),
            payments: paymentsCents === null ? null : centsToDecimal(paymentsCents),
            sinPago: sinPagoCents === null ? null : centsToDecimal(sinPagoCents),
          });
          tramosByCurrency.set(key, list);
        }
      }
    })();

    const currencies: DispensingReconciliationCurrencyRow[] = [...currencyKeys.entries()]
      .map(([key, currency]) => {
        const detailEntry = evidenceByCurrency.get(key) ?? null;
        const fallbackRow = key === "maquina";
        const periodEntry = fallbackRow ? null : (valuedDispensed.byCurrency.get(key) ?? null);
        const arqueoEntry = fallbackRow ? null : (outflowByCurrency.get(key) ?? null);
        const currencyHasLoad = fallbackRow ? periodComparable : currenciesWithLoad.has(key);
        const periodTotal = fallbackRow
          ? clientsFromLoadTotal
          : currencyHasLoad && periodEntry
            ? periodEntry.total
            : null;
        const arqueoTotal = fallbackRow ? clientsFromBaseTotal : (arqueoEntry?.total ?? null);
        const systemTotal =
          systemSource === "detalles"
            ? (detailEntry?.dispensedValue ?? "0")
            : systemSource === "returnAmount"
              ? centsToDecimal(returnAmountCents ?? 0n)
              : null;
        // Lado del sistema EN LA VENTANA DEL ARQUEO BASE: es la única comparación exacta
        // (salida = inicial + cargues − saldo − rechazo, desde un conteo real del baúl).
        // Sin esa ventana se conserva la cifra del período, que es lo único que hay.
        // Sin la ventana pedida NO se asume cero: se declara «sin medición» para esa ventana.
        const paymentsSinceBase = systemSource === "detalles" ? (detailEntry?.dispensedSinceBase?.value ?? null) : null;
        const paymentsSinceBaseTransactions =
          systemSource === "detalles" ? (detailEntry?.dispensedSinceBase?.transactions ?? null) : null;
        const periodCents = periodTotal === null ? null : decimalToCents(periodTotal);
        const arqueoCents = arqueoTotal === null ? null : decimalToCents(arqueoTotal);
        const systemCents = systemTotal === null ? null : decimalToCents(systemTotal);
        const paymentsSinceBaseCents = paymentsSinceBase === null ? null : decimalToCents(paymentsSinceBase);
        const alignedArqueoSystemCents = paymentsSinceBaseCents ?? systemCents;
        const matches = (modelCents: bigint | null): boolean =>
          modelCents !== null && systemCents !== null && abs(modelCents - systemCents) <= tolerance(systemCents);
        const matchesAgainst = (modelCents: bigint | null, againstCents: bigint | null): boolean =>
          modelCents !== null && againstCents !== null && abs(modelCents - againstCents) <= tolerance(againstCents);
        const periodMatches = matches(periodCents);
        const arqueoMatches = matchesAgainst(arqueoCents, alignedArqueoSystemCents);
        // Inventario del baúl AL EMPEZAR EL PERÍODO (`null` = no hay arqueo de inicio). Si había
        // unidades, «cargado − en dispensadores − rechazado» deja de ser una identidad exacta:
        // mide pagos + retiros − inventario previo, y una máquina recargada puede dar $0 aunque
        // haya pagado (caso real Pay+ Inder 1, 2026-09-22).
        const periodStartStockCents =
          fallbackRow ? null : decimalToCents(valuedPeriodStartStock.byCurrency.get(key)?.total ?? "0");
        // Firma del RETIRO AL CARGAR: hubo cargue desde el arqueo y el baúl reporta exactamente
        // lo cargado (el sobrante anterior no está). Con esa firma la salida sin pago de la
        // ventana es un retiro/reemplazo, no un faltante de pagos.verificar
        const loadedSinceBaseCents =
          fallbackRow ? null : decimalToCents(valuedLoadedSinceBase.byCurrency.get(key)?.total ?? "0");
        const balanceCents = fallbackRow ? null : decimalToCents(valuedStorage.byCurrency.get(key)?.total ?? "0");
        const stockReplacedAtLoad =
          hasBase &&
          loadedSinceBaseCents !== null &&
          loadedSinceBaseCents > 0n &&
          balanceCents !== null &&
          abs(balanceCents - loadedSinceBaseCents) <= tolerance(loadedSinceBaseCents);
        const periodExact = periodStartStockCents === null || periodStartStockCents === 0n;
        // Salida del baúl en la ventana del arqueo base que NINGÚN pago registrado explica
        // (candidato a retiro / reemplazo del sobrante al cargar).
        const outflowWithoutPaymentCents =
          arqueoCents === null || paymentsSinceBaseCents === null ? null : arqueoCents - paymentsSinceBaseCents;
        // Descomposición del período: pagos = operativo + inventario previo − salida sin pago.
        // Cierra cuando el cargue reemplazó el sobrante, y es lo que permite decir «coincide»
        // en vez de acusar por la resta que no puede ver esos pagos.
        const periodExplainedCents =
          periodCents === null || systemCents === null || periodStartStockCents === null
            ? null
            : periodCents + periodStartStockCents - (outflowWithoutPaymentCents ?? 0n);
        // La descomposición NO decide por sí sola: con un término libre (la salida sin pago)
        // cualquier cifra del sistema «cerraría». Sólo se usa cuando HAY pagos que explicar.
        const periodExplainedMatches =
          periodExplainedCents !== null &&
          systemCents !== null &&
          systemCents > 0n &&
          // Un «retiro» negativo no explica nada: significa que el sistema registró MÁS salidas
          // que la caída del baúl (el baúl no puede perder dinero que nunca salió).
          (outflowWithoutPaymentCents ?? 0n) >= 0n &&
          abs(periodExplainedCents - systemCents) <= tolerance(systemCents);
        // 0 contra 0 no es una verificación, es ausencia de movimiento: una moneda que la
        // máquina no dispensó (p. ej. los dólares que sólo entran al aceptador en una máquina
        // de cambio divisa) no puede decidir el veredicto global con un «cuadra» vacío.
        const nothingToVerify =
          systemCents === 0n && (periodCents ?? 0n) === 0n && (arqueoCents ?? 0n) === 0n;

        return {
          acceptedTotal: systemSource === "detalles" ? (detailEntry?.acceptedValue ?? "0") : null,
          arqueoTotal,
          best:
            systemCents === null || nothingToVerify
              ? null
              : periodMatches && (periodExact || periodExplainedMatches || periodStartStockCents === null)
                ? "periodo"
                : arqueoMatches
                  ? "arqueo"
                  : periodExplainedMatches
                    ? "periodo"
                    : // Se acusa sólo cuando la comparación puede atribuir la diferencia: el
                      // cuadre del período es exacto, o el sistema no registró NI UN pago
                      // (entonces toda la salida es dinero sin registro), o existe la medición
                      // de la ventana del arqueo. Con inventario previo y sin esa ventana, la
                      // resta mide pagos + retiros − inventario previo: se declara, no se acusa.
                      currencyHasLoad && (periodExact || systemCents === 0n || paymentsSinceBase !== null)
                      ? stockReplacedAtLoad &&
                        outflowWithoutPaymentCents !== null &&
                        outflowWithoutPaymentCents > 0n &&
                        systemCents > 0n
                        ? "retiro"
                        : "ninguno"
                      : null,
          currencyId: currency.currencyId,
          differenceArqueo:
            arqueoCents === null || alignedArqueoSystemCents === null ? null : centsToDecimal(arqueoCents - alignedArqueoSystemCents),
          differencePeriodo: periodCents === null || systemCents === null ? null : centsToDecimal(periodCents - systemCents),
          label: currency.label,
          loadedSinceBaseValue:
            fallbackRow ? (hasBase ? valuedLoadedSinceBase.total : null) : (hasBase ? (valuedLoadedSinceBase.byCurrency.get(key)?.total ?? null) : null),
          loadedTotal: fallbackRow ? (periodComparable ? valuedLoaded.total : null) : (currencyHasLoad ? (valuedLoaded.byCurrency.get(key)?.total ?? null) : null),
          outflowWithoutPayment: outflowWithoutPaymentCents === null ? null : centsToDecimal(outflowWithoutPaymentCents),
          paymentsSinceBase,
          paymentsSinceBaseTransactions,
          periodExact,
          periodStartStockValue: fallbackRow ? null : (valuedPeriodStartStock.byCurrency.get(key)?.total ?? null),
          stockReplacedAtLoad,
          periodTotal,
          systemTotal,
          transactions: detailEntry?.payoutTransactions ?? 0,
          tramos: fallbackRow ? [] : (tramosByCurrency.get(key) ?? []),
        } satisfies DispensingReconciliationCurrencyRow;
      })
      .sort((left, right) => (left.label ?? "").localeCompare(right.label ?? ""));

    // Escalares de compatibilidad: sólo se publican cuando todas las filas son de la MISMA
    // moneda. Con varias monedas la suma agregada no es comparable y queda en `null`: la UI
    // muestra el desglose por moneda en su lugar.
    const singleCurrency = new Set(currencies.map((row) => row.currencyId)).size <= 1;
    const scalarOf = (pick: (row: DispensingReconciliationCurrencyRow) => string | null): string | null => {
      const values = currencies.map(pick).filter((value): value is string => value !== null);
      if (!singleCurrency || values.length === 0) {
        return null;
      }
      return sumDecimalStrings(values);
    };

    const comparableRows = currencies.filter((row) => row.best !== null);
    const best: DispensingReconciliationCheck["best"] =
      comparableRows.length === 0
        ? null
        : comparableRows.some((row) => row.best === "ninguno")
          ? "ninguno"
          : comparableRows.some((row) => row.best === "retiro")
            ? "retiro"
            : comparableRows.every((row) => row.best === "periodo")
              ? "periodo"
              : "arqueo";

    // El detalle y `Σ returnAmount` miden cosas distintas en esta máquina: se publican las dos
    // cifras con su origen para que el operador vea de dónde sale cada una (en cambio divisa,
    // `Σ returnAmount` sigue al aceptador y no al dispensador).
    const detailDispensedCents = evidence === null ? null : decimalToCents(evidence.dispensedTotal);
    const systemSourceConflict =
      evidenceUsable &&
      detailDispensedCents !== null &&
      returnAmountCents !== null &&
      abs(detailDispensedCents - returnAmountCents) > tolerance(detailDispensedCents > 0n ? detailDispensedCents : returnAmountCents);

    const blocker: DispensingReconciliationCheck["blocker"] = (() => {
      if (systemSource !== null && best !== null) {
        return null;
      }
      if (quietPeriod) {
        return {
          code: "sin-transacciones",
          detail:
            "El período no tiene transacciones (ni aprobadas ni con error) y el cuadre físico confirma que no salió nada del dispensador: no hay dos cifras que comparar.",
        };
      }
      if (!periodComparable) {
        return {
          code: "sin-cargues",
          detail:
            "El período consultado no tiene cargues, así que «cargado − en dispensadores − rechazado» no es calculable y la auditoría del arqueo cubre otra ventana.",
        };
      }
      if (evidence !== null && !evidenceUsable) {
        return {
          code: "cobertura",
          detail: evidence.blind || evidence.withoutDetails
            ? "El barrido de detalles no devolvió ninguna composición legible: no hay medición del lado DP."
            : `El barrido de detalles es parcial (${evidence.analyzedTransactions} transacción(es) analizadas${
                evidence.detailsFailures > 0 ? `, ${evidence.detailsFailures} sin detalle` : ""
              }${evidence.truncated ? ", período truncado por el tope del motor" : ""}): la cifra del sistema no cubre el período.`,
        };
      }
      if (machineMultiCurrency) {
        return {
          code: "multimoneda",
          detail:
            "La máquina trabaja varias monedas y el DTO de transacción no declara la moneda de cada importe: «Σ devuelto» (returnAmount) suma monedas distintas y, en una máquina de cambio divisa, describe lo que entró al aceptador (AP) y no lo que salió del dispensador (DP).",
        };
      }
      // Inventario previo al período y sin medición del sistema EN la ventana del arqueo:
      // la resta del período mide pagos + retiros − inventario previo, así que una diferencia
      // no prueba dinero sin registro (caso real Pay+ Inder 1: cargue que reemplazó el sobrante
      // del baúl y pagos del día que la resta no puede ver).
      if (
        currencies.some((row) => !row.periodExact && row.loadedSinceBaseValue !== null) &&
        currencies.every((row) => row.paymentsSinceBase === null)
      ) {
        return {
          code: "inventario-previo",
          detail:
            "El baúl ya tenía inventario cuando empezó el período, así que «cargado − en dispensadores − rechazado» mide pagos + retiros − inventario previo y no puede acusar por sí solo. Falta la medición del sistema dentro de la ventana del arqueo (el detalle por transacción con su fecha).",
        };
      }
      return {
        code: "sin-medicion",
        detail: "No hay una medición del lado del sistema que se pueda comparar con el cuadre físico.",
      };
    })();

    // Salvedad del origen: se publica siempre que la cifra usada necesite explicación.
    const note = (() => {
      if (evidence?.amountsInverted === true) {
        return "Los importes indican que las operaciones «de salida» del detalle describen dinero ACEPTADO (AP), no dispensado (DP): la verificación usa «Σ devuelto» y no el detalle.";
      }
      if (systemSource === "detalles" && machineMultiCurrency) {
        return "La verificación usa el detalle por denominación (cada billete con su moneda y su dirección): «Σ devuelto» de las transacciones mezcla monedas y, en una máquina que recibe una moneda y entrega otra, sigue al aceptador (AP) y no al dispensador (DP).";
      }
      if (systemSource === "detalles" && systemSourceConflict) {
        return "El detalle y «Σ devuelto» no coinciden: se verifica contra el detalle, que es el que registra los billetes que salieron del dispensador.";
      }
      return null;
    })();

    return {
      best,
      blocker,
      coverage,
      note,
      currencies,
      differences: {
        arqueo: scalarOf((row) => row.differenceArqueo),
        periodo: scalarOf((row) => row.differencePeriodo),
      },
      fromArqueoTotal: scalarOf((row) => row.arqueoTotal),
      // Salida del baúl de la ventana del arqueo que ningún pago registrado explica.
      fromOutflowWithoutPayment: scalarOf((row) => (row.outflowWithoutPayment !== null && Number(row.outflowWithoutPayment) > 0 ? row.outflowWithoutPayment : null)),
      fromPeriodTotal: scalarOf((row) => row.periodTotal),
      paymentsSinceBaseTotal: scalarOf((row) => row.paymentsSinceBase),
      periodComparable,
      periodStartArqueo:
        periodStartTonnage === null
          ? null
          : { at: periodStartTonnage.dateCreated ?? null, id: periodStartTonnage.id ?? null },
      windowArqueo:
        lastTonnage === null
          ? null
          : { at: lastTonnage.dateCreated ?? null, id: lastTonnage.id ?? null },
      returnAmountTotal: input.cashDispensedTotal ?? null,
      systemSource,
      systemSourceConflict,
      systemTotal: scalarOf((row) => row.systemTotal),
      transactionCount: approvedCount,
    };
  })();

  // ¿El arqueo base cuadra consigo mismo? El operador ve sus totales en «Cargues y
  // arqueos»; si sus detalles no los explican, el punto de partida del cuadre físico no
  // es confiable y hay que decirlo ANTES de discutir la salida. Se omite cuando no es
  // comparable: sin detalles, con cantidades firmadas legacy (Prueba1) o con varias
  // monedas (los totales del arqueo no se pueden sumar entre monedas).
  const baseSelfCheck = (() => {
    if (!hasBase || lastTonnage === null || lastTonnage.details.length === 0) {
      return null;
    }
    if (lastTonnage.details.some((detail) => toInt(detail.quantityDp) < 0)) {
      return null;
    }

    let ap = 0n;
    let dp = 0n;
    let rj = 0n;
    const currencyIds = new Set<number | null>();
    for (const detail of lastTonnage.details) {
      if (detail.idCurrencyDenomination === null) {
        return null;
      }
      currencyIds.add(currencyIndex.get(detail.idCurrencyDenomination)?.currencyId ?? null);
      ap += unitsValueCents(detail.denominationValue, toInt(detail.quantityAp));
      dp += unitsValueCents(detail.denominationValue, toInt(detail.quantityDp));
      rj += unitsValueCents(detail.denominationValue, toInt(detail.quantityRj));
    }
    if (currencyIds.size > 1) {
      return null;
    }

    const declaredAp = decimalToCents(lastTonnage.totalAp);
    const declaredDp = decimalToCents(lastTonnage.totalDp);
    const declaredRj = decimalToCents(lastTonnage.totalRj);
    if (declaredAp === null || declaredDp === null || declaredRj === null) {
      return null;
    }

    return {
      declared: { ap: lastTonnage.totalAp, dp: lastTonnage.totalDp, rj: lastTonnage.totalRj },
      details: { ap: centsToDecimal(ap), dp: centsToDecimal(dp), rj: centsToDecimal(rj) },
      matches: declaredAp === ap && declaredDp === dp && declaredRj === rj,
    };
  })();

  return {
    ap: {
      count: byState[APPROVED_STATE]?.count ?? 0,
      total: byState[APPROVED_STATE]?.total ?? "0",
    },
    apPhysical: {
      at: lastTonnage?.dateCreated ?? null,
      currentTotal: acceptorCurrentTotal,
      total: lastTonnage?.totalAp ?? null,
    },
    cancelled: {
      count: byState[CANCELLED_STATE]?.count ?? 0,
      total: byState[CANCELLED_STATE]?.total ?? "0",
    },
    dp: {
      arqueoTotal: clientsFromBaseTotal,
      at: lastTonnage?.dateCreated ?? null,
      dispensedTotal: clientsFromLoadTotal,
      loadedTotal: valuedLoaded.total,
      rejectedTotal: valuedRejected.total,
      storageTotal: valuedStorage.total === "0" ? storageTotal : valuedStorage.total,
      total: lastTonnage?.totalDp ?? null,
    },
    lastLoad: {
      at: lastLoad?.dateCreated ?? null,
      elapsedMs: lastLoad && !Number.isNaN(lastLoadTime) ? Math.max(0, now.getTime() - lastLoadTime) : null,
      // Referencia del período: si el último cargue está dentro del rango,
      // su valor; si no, la suma de cargues del rango (puede ser "0").
      total: lastLoadInRange ? (lastLoad?.totalLoaded ?? null) : rangeLoadsTotal === "0" ? null : rangeLoadsTotal,
    },
    reconciliationCheck,
    storageSnapshot: { readAtMs: input.storageReadAt ?? null },
    reconciliation: {
      baseAt: lastTonnage?.dateCreated ?? null,
      baseSelfCheck,
      hasBase,
      loadsSinceBaseCount: loadsSinceBase.length,
      loadsSinceBaseTotal,
      loadsSinceLastLoadCount: loadsSinceLastLoad.length,
      loadsSinceLastLoadTotal,
      arqueoHistory,
    },
    rj: {
      count: byState[RETURNED_ERROR_STATE]?.count ?? 0,
      currentTotal: rejectCurrentTotal,
      physicalTotal: lastTonnage?.totalRj ?? null,
      total: byState[RETURNED_ERROR_STATE]?.total ?? "0",
    },
    excludedRows,
    currencyLabels: [
      ...new Set([
        ...rows.map((row) => row.currencyLabel ?? "moneda no declarada"),
        // El detalle puede revelar una moneda que el inventario en uso no muestra (p. ej. el
        // dólar que entra al aceptador de una máquina declarada en pesos).
        ...(evidence?.byCurrency ?? []).map((entry) => entry.label ?? "moneda no declarada"),
      ]),
    ].filter((label, index, all) => all.indexOf(label) === index),
    acceptorTotalsByCurrency,
    arqueoTotalsByCurrency,
    dispensedTotalsByCurrency: loadOutflowTotalsByCurrency,
    identityByCurrency,
    loadedTotalsByCurrency: [...valuedLoaded.byCurrency.values()],
    loadOutflowTotalsByCurrency,
    multiCurrency: machineMultiCurrency,
    outflowTotalsByCurrency: [...outflowByCurrency.values()],
    rejectedTotalsByCurrency: [...valuedRejected.byCurrency.values()],
    rejectionTotalsByCurrency,
    rows,
    storageTotalsByCurrency: [...totalsByCurrency.values()],
  };
}

export function formatElapsed(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) {
    return "—";
  }

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) {
    return "menos de 1 min";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
  }

  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest === 0 ? `${days} d` : `${days} d ${rest} h`;
}
