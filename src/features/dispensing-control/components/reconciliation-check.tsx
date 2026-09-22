"use client";

import { CircleCheck, Scale, TimerReset, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type {
  DispensingReconciliationBlockerCode,
  DispensingReconciliationCheck,
  DispensingReconciliationCurrencyRow,
} from "@/features/dispensing-control/dispensing-metrics";
import { formatDashboardDateTime } from "@/lib/formatters/date";
import { formatDashboardMoney } from "@/lib/formatters/money";

/**
 * Verificación del cuadre contra lo que registró el sistema.
 *
 * Regla de oro (caso real Pay+ ODRB Rionegro, ID 1288 — máquina multimoneda que recibe dólares
 * y entrega pesos): **una cifra del sistema sólo se compara con una cifra física de la MISMA
 * moneda y del MISMO lado del dinero.** `Σ devuelto` (`returnAmount`) de las aprobadas describe
 * lo que entró al aceptador (AP) en una máquina de cambio divisa, y además mezcla monedas porque
 * el DTO de transacción no declara la moneda de cada importe. Compararla con el dispensado físico
 * (DP) producía un falso «hay dinero sin registro» de $8.041.000 sobre un dispensado de $9.207.900.
 *
 * Por eso este componente:
 *  - dice de dónde sale la cifra del sistema (detalle por denominación = lado DP real, o `Σ devuelto`);
 *  - compara POR MONEDA, con lo aceptado (AP) separado de lo dispensado (DP);
 *  - y cuando la comparación no es válida, lo declara con el motivo en vez de acusar un descuadre.
 */

const blockerTitles: Record<DispensingReconciliationBlockerCode, string> = {
  cobertura: "El detalle del período está incompleto: la verificación no concluye",
  "inventario-previo": "El baúl ya tenía inventario al empezar el período: la resta del período no puede acusar sola",
  multimoneda: "«Σ devuelto» no es comparable en esta máquina (trabaja varias monedas)",
  "sin-cargues": "Sin período comparable para verificar",
  "sin-medicion": "Sin medición del sistema para verificar",
  "sin-transacciones": "Sin transacciones en el período: nada que verificar",
};

const blockerIcons: Record<DispensingReconciliationBlockerCode, typeof TimerReset> = {
  cobertura: TimerReset,
  "inventario-previo": TimerReset,
  multimoneda: Scale,
  "sin-cargues": TimerReset,
  "sin-medicion": TimerReset,
  "sin-transacciones": CircleCheck,
};

function money(value: string | null, fallback = "sin dato"): string {
  return value === null ? fallback : formatDashboardMoney(value);
}

function currencyName(row: DispensingReconciliationCurrencyRow): string {
  return row.label ?? (row.currencyId === null ? "Moneda no declarada" : `Moneda ${row.currencyId}`);
}

function isMeaningful(row: DispensingReconciliationCurrencyRow): boolean {
  return row.systemTotal !== null || row.periodTotal !== null || row.arqueoTotal !== null;
}

/**
 * Moneda que NO cuadró y donde el sistema sólo registró dinero ACEPTADO (AP), sin ninguna
 * salida (DP). Se limita a las filas con veredicto «ninguno»: en una máquina de cambio divisa
 * la moneda que sólo entra al aceptador (los dólares) no falla, así que no debe señalarse.
 */
function acceptedOnlyCurrencies(rows: readonly DispensingReconciliationCurrencyRow[]): string[] {
  return rows
    .filter((row) => row.best === "ninguno" && !isZero(row.acceptedTotal) && row.systemTotal === "0")
    .map((row) => currencyName(row));
}

function isZero(value: string | null): boolean {
  return value === null || Number(value) === 0;
}

/** Una moneda que la máquina no dispensa (sólo entra al aceptador) no tiene nada que verificar. */
function isAcceptOnlyRow(row: DispensingReconciliationCurrencyRow): boolean {
  return row.systemTotal === "0" && row.periodTotal === null && !isZero(row.acceptedTotal);
}

/** Texto de una moneda: físico contra sistema, con la auditoría del arqueo y el lado AP aparte. */
function describeRow(
  row: DispensingReconciliationCurrencyRow,
  fromDetails: boolean,
  quiet: boolean,
  periodStartReference: { at: string | null; id: number | null } | null,
): string {
  if (isAcceptOnlyRow(row)) {
    return `no se dispensa en el período: entra al aceptador (AP) ${formatDashboardMoney(row.acceptedTotal ?? "0")} · nada que verificar`;
  }

  // Período sin transacciones y sin salida física: se dice qué pasó con el cargue en vez de
  // poner «sistema: sin medición» al lado de un $0 (eso era el ruido que confundía).
  if (quiet && row.systemTotal === null && isZero(row.periodTotal)) {
    return row.loadedTotal === null
      ? "sin cargue de esta moneda en el período: nada que despejar"
      : `sin movimiento: cargado ${formatDashboardMoney(row.loadedTotal)}, sigue íntegro en los dispensadores (dispensado $0)`;
  }

  const parts: string[] = [
    `físico del período (cargado − en dispensadores − rechazado): ${money(row.periodTotal, "no calculable (sin cargue de esta moneda en el período)")}`,
    row.systemTotal === null
      ? "sistema (DP): sin medición"
      : // La diferencia del período sólo se publica cuando ESA resta es una identidad exacta:
        // con inventario previo en el baúl el número confunde (da $0 en máquinas que pagaron).
        `sistema (DP) del período: ${formatDashboardMoney(row.systemTotal)}${
          row.differencePeriodo === null || row.periodTotal === null || !row.periodExact
            ? ""
            : ` · diferencia ${formatDashboardMoney(row.differencePeriodo)}`
        }`,
  ];
  // Ventana del arqueo: es la única comparación exacta (inicial contado + cargues − saldo −
  // rechazo). Se publica con los pagos REGISTRADOS EN ESA MISMA VENTANA, no con los del día.
  if (row.arqueoTotal !== null) {
    const paid = row.paymentsSinceBase === null ? "sin medición en esa ventana" : `pagos registrados desde ese arqueo: ${formatDashboardMoney(row.paymentsSinceBase)}`;
    parts.push(`ventana del arqueo (inventario previo + cargues − en dispensadores − rechazado): ${formatDashboardMoney(row.arqueoTotal)} · ${paid}`);
  }
  if (row.periodStartStockValue !== null && Number(row.periodStartStockValue) > 0 && !row.periodExact) {
    const reference =
      periodStartReference === null
        ? "en el arqueo de referencia anterior al período"
        : `en el arqueo #${periodStartReference.id ?? "?"}${
            periodStartReference.at ? ` del ${formatDashboardDateTime(periodStartReference.at)}` : ""
          } (referencia anterior al período)`;
    parts.push(
      `el baúl tenía ${formatDashboardMoney(row.periodStartStockValue)} ${reference}: la resta del período mezcla esos pagos con los retiros, así que no se usa para acusar`,
    );
  }
  // Dinero que salió del baúl y ningún pago explica: candidato a retiro/reemplazo al cargar.
  if (row.outflowWithoutPayment !== null && Number(row.outflowWithoutPayment) > 0) {
    parts.push(
      `salida del baúl sin pago registrado en esa ventana: ${formatDashboardMoney(row.outflowWithoutPayment)}${
        row.loadedSinceBaseValue !== null && Number(row.loadedSinceBaseValue) > 0
          ? " (hubo cargue en la ventana: si fue el retiro del sobrante al cargar, regístralo como retiro)"
          : ""
      }`,
    );
  }
  // La auditoría del arqueo sólo se muestra cuando hay algo contra qué compararla: con el
  // período quieto y sin cifra del sistema, «$0 contra $8.013.400» parece un faltante y no lo es.

  if (fromDetails && !isZero(row.acceptedTotal) && !isAcceptOnlyRow(row)) {
    parts.push(`aceptado (AP) según el detalle: ${formatDashboardMoney(row.acceptedTotal ?? "0")}`);
  }
  if (fromDetails && row.transactions > 0) {
    parts.push(
      `${row.transactions} transacción(es) con salida${
        row.paymentsSinceBaseTransactions === null ? "" : ` (${row.paymentsSinceBaseTransactions} posterior(es) al arqueo)`
      }`,
    );
  }

  return parts.join(" · ");
}

export interface ReconciliationCheckAlertProps {
  /** Fecha del arqueo base: explica las ventanas cuando no son comparables. */
  baseAtIso: string | null;
  check: DispensingReconciliationCheck;
  /** Fecha del último cargue (misma explicación de ventanas). */
  lastLoadAt: string | null;
  rangeLabel: string;
}

export function ReconciliationCheckAlert({ baseAtIso, check, lastLoadAt, rangeLabel }: ReconciliationCheckAlertProps) {
  const rows = check.currencies.filter(isMeaningful);
  const blocker = check.blocker;
  const fromDetails = check.systemSource === "detalles";
  const Icon =
    blocker !== null ? blockerIcons[blocker.code] : check.best === "ninguno" || check.best === "retiro" ? TriangleAlert : CircleCheck;
  const variant: "default" | "warning" =
    blocker === null && (check.best === "ninguno" || check.best === "retiro") ? "warning" : "default";
  const acceptedOnly = acceptedOnlyCurrencies(rows);

  const title =
    blocker !== null
      ? blockerTitles[blocker.code]
      : check.best === "retiro"
        ? "Salida del baúl sin pago registrado"
        : check.best === "periodo"
        ? `El dispensado coincide con lo que el sistema registró${rows.length > 1 ? " (por moneda)" : ""}`
        : check.best === "arqueo"
          ? "Sólo cuadra contando el inventario previo del arqueo"
          : check.best === "ninguno"
            ? "El dispensado no coincide con lo que el sistema registró"
            : "Sin veredicto para este período";

  // Explicación de las dos ventanas cuando el período no tiene cargues.
  const windowNote =
    baseAtIso === null
      ? ""
      : lastLoadAt
        ? ` La auditoría del arqueo arranca el ${formatDashboardDateTime(baseAtIso)} y el último cargue fue el ${formatDashboardDateTime(lastLoadAt)}.`
        : ` La auditoría del arqueo arranca el ${formatDashboardDateTime(baseAtIso)}, antes del período.`;

  const quiet = blocker?.code === "sin-transacciones";
  const systemLine = quiet
    ? "Sin transacciones aprobadas ni con error en el período: el sistema no registró entradas ni salidas que comparar."
    : fromDetails
      ? `Sistema por moneda, lado DP (detalle de ${check.coverage?.analyzed ?? 0} transacción(es) del período): ${
        rows
          .filter((row) => row.systemTotal !== null)
          .map((row) => `${currencyName(row)} ${money(row.systemTotal)}`)
          .join(" · ") || "sin salidas registradas"
      }`
      : check.systemSource === "returnAmount"
        ? `Sistema (Σ devuelto de ${check.transactionCount} transacción(es) aprobadas): ${money(check.systemTotal)}`
        : // Sin medición admisible: el número se muestra como referencia, rotulado como tal.
          `Σ devuelto de ${check.transactionCount} transacción(es) aprobadas (referencia, no comparable): ${money(check.returnAmountTotal)}`;

  return (
    <Alert variant={variant}>
      <Icon aria-hidden="true" className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {/* Origen de la cifra del sistema: sin esto el número no es auditable. */}
        <span className="block">{systemLine}</span>

        {/* Comparación por moneda: nunca se suman monedas distintas entre sí. */}
        {rows.length > 0 ? (
          <span className="mt-1 block">
            {rows.map((row) => (
              <span className="block" key={row.currencyId === null ? "none" : String(row.currencyId)}>
                <strong>{currencyName(row)}</strong> · {describeRow(row, fromDetails, quiet, check.periodStartArqueo)}
              </span>
            ))}
          </span>
        ) : null}

        {/* `Σ devuelto` queda como referencia cuando la verificación usa el detalle: explica de
            dónde salía el número que antes se comparaba con el dispensado físico. */}
        {fromDetails && check.returnAmountTotal !== null ? (
          <span className="mt-1 block text-muted-foreground">
            Referencia: Σ devuelto de las {check.transactionCount} aprobadas = {formatDashboardMoney(check.returnAmountTotal)}
            {check.systemSourceConflict ? " — no sigue al dispensador en esta máquina." : " (coincide con el detalle)."}
          </span>
        ) : null}

        <span className="mt-1 block">
          {blocker !== null
            ? blocker.code === "sin-cargues"
              ? `${rangeLabel} no tiene cargues, así que «cargado − en dispensadores − rechazado» no es calculable: no hay dispensado del período que comparar y las cifras miden ventanas distintas.${windowNote} Su diferencia no es un descuadre. Para cuadrar el tramo completo usa el preset «Desde último cargue».`
              : blocker.code === "multimoneda"
                ? "La comparación válida es por moneda y con el detalle por denominación (sección «Detección de atascos»): ahí cada billete tiene moneda y dirección (AP entra, DP sale). Sin ese detalle el panel no concluye descuadre."
                : blocker.code === "cobertura"
                ? "Re-analiza el período (o acótalo) para completar el detalle: mientras la cobertura sea parcial no se declara descuadre."
                : blocker.code === "inventario-previo"
                  ? "El baúl ya tenía inventario al empezar el período: «cargado − en dispensadores − rechazado» mide pagos + retiros − inventario previo, así que una diferencia no prueba dinero sin registro. Para verificarlo hace falta el detalle por transacción DENTRO de la ventana del arqueo: revisa el período sobre el que se hizo el barrido o acótalo al tramo del arqueo."
                  : blocker.code === "sin-transacciones"
                  ? rows.some((row) => row.loadedTotal !== null)
                    ? "El cuadre físico confirma que no salió nada: lo cargado sigue íntegro en los dispensadores. Las operaciones que buscas ocurrieron ANTES del último cargue (quedaron fuera de esta ventana): amplía el período («Últimos 7 días» o un rango personalizado desde el cargue anterior) para incluirlas en el cuadre."
                    : "El período no tiene cargues ni transacciones: no hay cuadre que calcular. Elige una ventana con actividad (p. ej. «Desde último cargue» o «Últimos 7 días»)."
                  : "Selecciona un período con cargues y transacciones para poder verificar el cuadre."
            : check.best === "periodo"
              ? rows.some((row) => row.outflowWithoutPayment !== null && Number(row.outflowWithoutPayment) > 0)
                ? "El cuadre cierra por moneda una vez descontados el inventario previo del baúl y la salida que ningún pago explica (retiro o reemplazo del sobrante al cargar): esa salida NO es dispensado a clientes. Regístrala como retiro para que el próximo cuadre no la tenga que declarar."
                : "El cuadre cierra por moneda: cargado − en dispensadores − rechazado explica lo entregado a clientes."
              : check.best === "arqueo"
                ? "El inventario previo del arqueo sí pasó por el dispensador: revisa si el baúl se cargó sobre saldo existente o si esas unidades se retiraron en mantenimiento."
                : check.best === "retiro"
                  ? "El baúl quedó exactamente en el cargue: lo que había antes (el inventario del arqueo) salió de los dispensadores durante la carga y ningún pago lo explica. Dos lecturas posibles: (1) fue el retiro del sobrante al cargar — regístralo como retiro para que el cuadre pueda conciliarlo; (2) el baúl está reportando sólo lo cargado, sin el sobrante anterior — en ese caso la lectura del baúl no sirve como inventario y hay que revisarla con el proveedor."
                  : check.best === "ninguno"
                  ? `Hay dinero sin registro en una de las dos partes (${rows
                      .filter((row) => row.best === "ninguno")
                      .map((row) => currencyName(row))
                      .join(", ")}): revisa cargues no registrados, retiros manuales o el estado de los baúles.`
                  : "Ninguna moneda tiene las dos cifras comparables en este período."}
        </span>

        {/* Caso «las aprobadas son AP, no DP»: el sistema registró dinero que entró y ninguna
            salida del dispensador en esa moneda. Se dice explícitamente, con las dos lecturas
            posibles, en vez de dejar sólo la acusación de descuadre. */}
        {blocker === null && check.best === "ninguno" && acceptedOnly.length > 0 ? (
          <span className="mt-1 block">
            En {acceptedOnly.join(", ")} el detalle sólo registra dinero ACEPTADO (AP), sin salidas del dispensador (DP): o esas operaciones
            son de ingreso/cambio y el dispensado se registra en otro campo, o los detalles no traen el tipo de operación de salida. Antes de
            concluir un faltante, abre el detalle de una transacción y verifica qué operación describe la entrega.
          </span>
        ) : null}

        {check.note ? <span className="mt-1 block text-muted-foreground">{check.note}</span> : null}
        {blocker !== null && blocker.code !== "sin-cargues" && blocker.code !== "sin-transacciones" ? (
          <span className="mt-1 block text-muted-foreground">{blocker.detail}</span>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
