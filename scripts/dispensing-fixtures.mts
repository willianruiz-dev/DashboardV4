/**
 * Regresiones del control de dispensado (motor de atascos + desglose de saldos).
 *
 * Ejecutar:  npm run fixtures:dispensing
 * (Node ≥ 22 con `--experimental-strip-types`: los módulos del motor sólo importan TIPOS
 *  con alias `@/…`, que se borran al interpretar, así que no hacen falta dependencias.)
 *
 * Cada escenario fija un caso reportado por el operador o un falso positivo corregido:
 *   usuario-actual  – una caída de participación (tendencia) NO es un atasco (C6)
 *   compensacion    – el culpable es el que no entrega, no el que compensa (C4)
 *   inder2          – el monedero marcado «No dispensa» que sí debía entregar (C2)
 *   jam             – dos módulos atascados + ráfaga de error devuelta
 *   ciego           – sin detalles legibles el diagnóstico es incompleto, no «limpio» (C3)
 *   cc-centro-usd1  – el billete de USD 1 de una máquina de solo pesos no se evalúa (C8/C9)
 *   divisa          – máquina COP ⇄ USD: nada se mezcla entre monedas (C8)
 *   alerta-inicio   – la alerta del inicio declara las máquinas multimoneda en vez de sumar
 *   monedas-tx      – el recaudo de Transacciones/Reportes se agrupa por moneda (nunca se suma)
 *   arqueo-cargue   – el cuadre físico va del arqueo base a hoy: entregada = inicial +
 *                     cargada − saldo, y el rechazo mostrado es el baúl actual (C10)
 */
import { summarizeMachineCurrencies } from "../src/features/dispensing-control/denomination-usage.ts";
import { computeJamDiagnostics, type JamDiagnostics } from "../src/features/dispensing-control/dispensing-jams.ts";
import { computeDispensingMetrics } from "../src/features/dispensing-control/dispensing-metrics.ts";
import { summarizeTransactionsByCurrency } from "../src/features/transactions/transaction-search.ts";

/* ------------------------------------------------------------------ utilidades */

let failures = 0;
let checks = 0;

function expect(label: string, condition: boolean, detail = ""): void {
  checks += 1;
  if (condition) {
    console.log(`  ✓ ${label}`);
    return;
  }

  failures += 1;
  console.log(`  ✗ ${label}${detail ? ` → ${detail}` : ""}`);
}

interface StorageOptions {
  accepted?: string;
  acceptedTotal?: string;
  creating?: boolean;
  dispensing?: boolean;
  dispensingTotal?: string;
  min?: string;
  rejected?: string;
  rejectedTotal?: string;
}

function storageRow(value: string, id: number, stock: string, options: StorageOptions = {}) {
  const dispensing = options.dispensing ?? true;
  return {
    apStored: options.accepted ?? "0",
    apTotal: options.acceptedTotal ?? "0",
    dateCreated: null,
    denominationValue: value,
    dpStored: stock,
    dpTotal: options.dispensingTotal ?? "0",
    id,
    idCurrencyDenomination: id,
    idPayPad: 10,
    imgDenom: null,
    isDispensing: dispensing,
    minDpQuantity: options.min ?? "0",
    quantityStored: stock,
    rjStored: options.rejected ?? "0",
    rjTotal: options.rejectedTotal ?? "0",
    total: "0",
  };
}

function tonnageDetail(value: string, id: number, quantityDp: string, quantityRj = "0", quantityAp = "0") {
  return {
    denominationValue: value,
    idCurrencyDenomination: id,
    quantityAp,
    quantityDp,
    quantityRj,
    quantityTotal: quantityDp,
  };
}

function tonnage(id: number, dateCreated: string, details: ReturnType<typeof tonnageDetail>[]) {
  return { dateCreated, details, id, total: "0", totalAp: "0", totalDp: "0", totalRj: "0" };
}

interface DetailInput {
  denominationId: number;
  operation: string;
  operationId: number;
  quantity: string;
}

function transaction(
  id: number,
  dateCreated: string,
  details: DetailInput[],
  amounts: { income: string; real: string; ret: string },
  stateTransaction = "Aprobada",
) {
  return {
    dateCreated,
    details,
    id,
    incomeAmount: amounts.income,
    realAmount: amounts.real,
    returnAmount: amounts.ret,
    stateTransaction,
    totalAmount: amounts.real,
  };
}

function scan(transactions: ReturnType<typeof transaction>[], overrides: Partial<{ detailsFailures: number; detailsRequests: number; failureReasons: string[] }> = {}) {
  return {
    detailsFailures: overrides.detailsFailures ?? 0,
    detailsMalformed: 0,
    detailsRequests: overrides.detailsRequests ?? transactions.length,
    failureReasons: overrides.failureReasons ?? [],
    generatedAt: "2026-09-17T23:00:00.000Z",
    maxTransactions: 60,
    scannedFrom: transactions[0]?.dateCreated ?? null,
    scannedTo: transactions.at(-1)?.dateCreated ?? null,
    transactions,
    truncated: false,
  };
}

const RANGE = { rangeFrom: "2026-09-17T05:00:00.000Z", rangeTo: "2026-09-18T04:59:59.999Z" };

const COP = 1;
const USD = 2;
function catalogDenomination(id: number, idCurrency: number, value: string, currency: string) {
  return { currency, id, idCurrency, img: null, imgList: [] as number[], value };
}

function incidentTitles(diagnostics: JamDiagnostics): string {
  return diagnostics.incidents.map((incident) => `${incident.title} [${incident.level}]`).join(" | ");
}

function rowOf(diagnostics: JamDiagnostics, denominationValue: string) {
  return diagnostics.rows.find((row) => row.denominationValue === denominationValue) ?? null;
}

/* ------------------------------------------------------------------ 1) usuario-actual: tendencia ≠ atasco */

console.log("\n[usuario-actual] caída de participación reciente sin evidencia actual (C6)");

const usuarioActual = (() => {
  const storage = [
    storageRow("10000", 1, "79", { min: "5" }),
    storageRow("2000", 2, "94", { min: "5" }),
    storageRow("500", 3, "97", { min: "5" }),
    storageRow("100", 4, "115", { min: "5" }),
  ];
  // El 2.000 participa en los primeros pagos y deja de hacerlo en los últimos, pero
  // SIGUE entregando (18 unidades) y su arqueo bajó 255: es una tendencia, no un atasco.
  const payouts = Array.from({ length: 8 }, (_, index) =>
    transaction(
      900 + index,
      `2026-09-17T${String(10 + index).padStart(2, "0")}:05:00.000Z`,
      [
        { denominationId: 4, operation: "Aceptada", operationId: 1, quantity: "20" },
        ...(index < 5 ? [{ denominationId: 2, operation: "Devuelta", operationId: 2, quantity: "1" }] : [{ denominationId: 1, operation: "Devuelta", operationId: 2, quantity: "2" }]),
      ],
      { income: "25000", real: "23000", ret: "2000" },
    ),
  );
  // Arqueos del día ANTERIOR al período consultado: la caída física queda fuera de la
  // ventana y no puede usarse como evidencia del período (igual que en el caso real).
  const tonnages = [
    tonnage(1, "2026-09-16T09:00:00.000Z", [tonnageDetail("10000", 1, "385"), tonnageDetail("2000", 2, "112"), tonnageDetail("500", 3, "306"), tonnageDetail("100", 4, "337")]),
    tonnage(2, "2026-09-16T21:30:00.000Z", [tonnageDetail("10000", 1, "79"), tonnageDetail("2000", 2, "94"), tonnageDetail("500", 3, "97"), tonnageDetail("100", 4, "115")]),
  ];

  return computeJamDiagnostics({ byState: { Aprobada: { count: 8, total: "184000" } }, loads: [], scan: scan(payouts), storage, tonnages, ...RANGE });
})();

console.log(`  headline: ${usuarioActual.headline}`);
expect("sin incidentes", usuarioActual.incidents.length === 0, incidentTitles(usuarioActual));
expect("el 2.000 queda sin evidencia", rowOf(usuarioActual, "2000")?.level === "sin_evidencia", String(rowOf(usuarioActual, "2000")?.level));

/* ------------------------------------------------------------------ 2) compensacion: culpable vs compensador */

console.log("\n[compensacion] el 500 no entrega y el 100 compensa (C4)");

const compensacion = (() => {
  const storage = [
    storageRow("500", 1, "34", { dispensing: false }),
    storageRow("100", 2, "900", { min: "5" }),
    storageRow("2000", 3, "98"),
  ];
  const payouts = Array.from({ length: 10 }, (_, index) =>
    transaction(
      500 + index,
      `2026-09-17T${String(10 + index).padStart(2, "0")}:05:00.000Z`,
      [
        { denominationId: 3, operation: "Aceptada", operationId: 1, quantity: "1" },
        { denominationId: 2, operation: "Devuelta", operationId: 2, quantity: "10" },
      ],
      { income: "3000", real: "2000", ret: "1000" },
    ),
  );
  const errors = [0, 1].map((index) =>
    transaction(
      700 + index,
      `2026-09-17T21:0${index}:00.000Z`,
      [{ denominationId: 2, operation: "Devuelta Error", operationId: 3, quantity: "12" }],
      { income: "20000", real: "18800", ret: "1200" },
      "Aprobada Error Devuelta",
    ),
  );
  const tonnages = [
    tonnage(1, "2026-09-17T09:00:00.000Z", [tonnageDetail("2000", 3, "105"), tonnageDetail("500", 1, "34"), tonnageDetail("100", 2, "1300")]),
    tonnage(2, "2026-09-17T21:30:00.000Z", [tonnageDetail("2000", 3, "98"), tonnageDetail("500", 1, "34"), tonnageDetail("100", 2, "1150")]),
  ];

  return computeJamDiagnostics({
    byState: { Aprobada: { count: 10, total: "20000" }, "Aprobada Error Devuelta": { count: 2, total: "2400" } },
    loads: [],
    scan: scan([...payouts, ...errors]),
    storage,
    tonnages,
    ...RANGE,
  });
})();

console.log(`  headline: ${compensacion.headline}`);
expect("el incidente principal es el 500", compensacion.primary?.denominationValue === "500", String(compensacion.primary?.denominationValue));
expect("el 100 queda como compensando", rowOf(compensacion, "100")?.compensating === true);
expect("el 100 no tiene señales de atasco", (rowOf(compensacion, "100")?.signals ?? []).every((signal) => signal.code === "compensando_entrega"));
expect("el titular nombra al compensador", compensacion.headline.includes("se entrega con 100"));

/* ------------------------------------------------------------------ 3) inder2: «No dispensa» que sí debía entregar */

console.log("\n[inder2] monedero marcado «No dispensa» con saldo (C2)");

const inder2 = (() => {
  const storage = [
    storageRow("500", 1, "34", { dispensing: false }),
    storageRow("100", 2, "85", { min: "5" }),
    storageRow("2000", 3, "98"),
    storageRow("10000", 4, "14"),
  ];
  const payouts = Array.from({ length: 12 }, (_, index) =>
    transaction(
      300 + index,
      `2026-09-17T${String(10 + (index % 9)).padStart(2, "0")}:${String(index * 4).padStart(2, "0")}:00.000Z`,
      [
        { denominationId: 3, operation: "Aceptada", operationId: 1, quantity: "1" },
        { denominationId: 2, operation: "Devuelta", operationId: 2, quantity: "15" },
      ],
      { income: "3000", real: "1500", ret: "1500" },
    ),
  );
  const tonnages = [
    tonnage(1, "2026-09-17T09:00:00.000Z", [tonnageDetail("500", 1, "131"), tonnageDetail("100", 2, "9"), tonnageDetail("2000", 3, "244"), tonnageDetail("10000", 4, "34")]),
    tonnage(2, "2026-09-17T21:30:00.000Z", [tonnageDetail("500", 1, "34"), tonnageDetail("100", 2, "85"), tonnageDetail("2000", 3, "98"), tonnageDetail("10000", 4, "14")]),
  ];

  return computeJamDiagnostics({ byState: { Aprobada: { count: 12, total: "18000" } }, loads: [], scan: scan(payouts), storage, tonnages, ...RANGE });
})();

console.log(`  headline: ${inder2.headline}`);
expect("el 500 queda en probable", rowOf(inder2, "500")?.level === "probable", String(rowOf(inder2, "500")?.level));
expect("el 500 acumula sustituciones no configuradas", (rowOf(inder2, "500")?.unconfiguredSubstitutionEvents ?? 0) > 0);

/* ------------------------------------------------------------------ 4) jam: dos módulos atascados + ráfaga */

console.log("\n[jam] 50.000 y 500 atascados con ráfaga de error devuelta");

const jam = (() => {
  const storage = [
    storageRow("50000", 1, "5", { min: "5" }),
    storageRow("500", 2, "140"),
    storageRow("20000", 3, "12"),
    storageRow("10000", 4, "25"),
    storageRow("100", 5, "310"),
  ];
  const payouts = [
    ...[0, 1, 2].map((index) =>
      transaction(
        100 + index,
        `2026-09-17T10:0${index}:00.000Z`,
        [{ denominationId: 1, operation: "Devuelta", operationId: 2, quantity: "1" }],
        { income: "100000", real: "50000", ret: "50000" },
      ),
    ),
    ...[3, 4, 5].map((index) =>
      transaction(
        100 + index,
        `2026-09-17T11:0${index - 3}:00.000Z`,
        [
          { denominationId: 3, operation: "Devuelta", operationId: 2, quantity: "2" },
          { denominationId: 4, operation: "Devuelta", operationId: 2, quantity: "1" },
        ],
        { income: "100000", real: "50000", ret: "50000" },
      ),
    ),
    ...[6, 7, 8, 9, 10].map((index) =>
      transaction(
        100 + index,
        `2026-09-17T12:0${index - 6}:00.000Z`,
        [{ denominationId: 5, operation: "Devuelta", operationId: 2, quantity: "5" }],
        { income: "1500", real: "1000", ret: "500" },
      ),
    ),
  ];
  const errors = [
    ...["14:05:00", "15:05:00"].map((time, index) =>
      transaction(
        700 + index,
        `2026-09-17T${time}.000Z`,
        [{ denominationId: 2, operation: "Devuelta Error", operationId: 3, quantity: "3" }],
        { income: "20000", real: "18500", ret: "1500" },
        "Aprobada Error Devuelta",
      ),
    ),
    transaction(
      703,
      "2026-09-17T16:05:00.000Z",
      [{ denominationId: 3, operation: "Devuelta Error", operationId: 3, quantity: "1" }],
      { income: "50000", real: "48000", ret: "2000" },
      "Aprobada Error Devuelta",
    ),
  ];
  const tonnages = [
    tonnage(1, "2026-09-17T09:00:00.000Z", [
      tonnageDetail("50000", 1, "5"),
      tonnageDetail("500", 2, "140"),
      tonnageDetail("20000", 3, "18"),
      tonnageDetail("10000", 4, "28"),
      tonnageDetail("100", 5, "335"),
    ]),
    tonnage(2, "2026-09-17T21:30:00.000Z", [
      tonnageDetail("50000", 1, "5"),
      tonnageDetail("500", 2, "140"),
      tonnageDetail("20000", 3, "12"),
      tonnageDetail("10000", 4, "25"),
      tonnageDetail("100", 5, "310"),
    ]),
  ];

  return computeJamDiagnostics({
    byState: { Aprobada: { count: 11, total: "551000" }, "Aprobada Error Devuelta": { count: 3, total: "5000" } },
    loads: [],
    scan: scan([...payouts, ...errors]),
    storage,
    tonnages,
    ...RANGE,
  });
})();

console.log(`  headline: ${jam.headline}`);
console.log(`  incidentes: ${incidentTitles(jam)}`);
expect("el 50.000 queda confirmado", rowOf(jam, "50000")?.level === "confirmado", String(rowOf(jam, "50000")?.level));
expect("el 500 queda confirmado", rowOf(jam, "500")?.level === "confirmado", String(rowOf(jam, "500")?.level));
expect("hay incidente de ráfaga", jam.incidents.some((incident) => incident.kind === "salida"));
expect("la caída física está cubierta por el análisis", rowOf(jam, "20000")?.physicalDrop.coveredByScan === true);

/* ------------------------------------------------------------------ 5) ciego: sin detalles no hay diagnóstico limpio */

console.log("\n[ciego] 30/30 detalles fallidos (C3)");

const ciego = (() => {
  const storage = [storageRow("500", 1, "34", { dispensing: false }), storageRow("100", 2, "85")];
  const transactions = Array.from({ length: 30 }, (_, index) =>
    transaction(800 + index, `2026-09-17T${String(10 + (index % 9)).padStart(2, "0")}:${String(index).padStart(2, "0")}:00.000Z`, [], { income: "3000", real: "1500", ret: "1500" }),
  );

  return computeJamDiagnostics({
    byState: { Aprobada: { count: 30, total: "45000" } },
    loads: [],
    scan: scan(transactions, { detailsFailures: 30, failureReasons: ["502 · La respuesta del servicio no cumple el contrato esperado."] }),
    storage,
    tonnages: [],
    ...RANGE,
  });
})();

console.log(`  headline: ${ciego.headline}`);
expect("marca el diagnóstico como ciego", ciego.blind === true);
expect("el titular no declara «sin señales»", ciego.headline.startsWith("Diagnóstico incompleto"));
expect("publica el motivo sanitizado", ciego.failureReasons.length > 0);

/* ------------------------------------------------------------------ 6) cc-centro-usd1: fila heredada de USD 1 */

console.log("\n[cc-centro-usd1] máquina de solo pesos con billete de USD 1 en el storage (C8/C9)");

const denominations = [
  catalogDenomination(1, COP, "500", "Peso colombiano"),
  catalogDenomination(2, COP, "1000", "Peso colombiano"),
  catalogDenomination(10, USD, "1", "Dólar estadounidense"),
];
const ccCentroStorage = [
  storageRow("500", 1, "40"),
  storageRow("1000", 2, "20"),
  storageRow("1", 10, "0", { dispensing: false }),
];
const ccCentroTonnages = [
  // La caída física coincide con lo que el período registró (2 monedas de 500): sin señales.
  tonnage(1, "2026-09-17T09:00:00.000Z", [tonnageDetail("500", 1, "42"), tonnageDetail("1000", 2, "20"), tonnageDetail("1", 10, "6")]),
  tonnage(2, "2026-09-17T21:30:00.000Z", [tonnageDetail("500", 1, "40"), tonnageDetail("1000", 2, "20"), tonnageDetail("1", 10, "-6")]),
];
// Cambio de 500 entregado con el billete de 500 (combinación canónica): sin sustituciones.
const ccCentroPayouts = [0, 1].map((index) =>
  transaction(
    200 + index,
    `2026-09-17T${String(14 + index).padStart(2, "0")}:05:00.000Z`,
    [
      { denominationId: 2, operation: "Aceptada", operationId: 1, quantity: "1" },
      { denominationId: 1, operation: "Devuelta", operationId: 2, quantity: "1" },
    ],
    { income: "1500", real: "1000", ret: "500" },
  ),
);

const ccCentroDiagnostics = computeJamDiagnostics({
  byState: { Aprobada: { count: 2, total: "2000" } },
  denominations,
  loads: [],
  machineCurrency: { id: COP, label: "COP" },
  scan: scan(ccCentroPayouts),
  storage: ccCentroStorage,
  tonnages: ccCentroTonnages,
  ...RANGE,
});
const ccCentroMetrics = computeDispensingMetrics({
  byState: { Aprobada: { count: 2, total: "2000" } },
  denominations,
  lastTonnage: ccCentroTonnages[1] ?? null,
  loads: [],
  machineCurrency: { id: COP, label: "COP" },
  now: new Date("2026-09-17T22:00:00.000Z"),
  rangeFrom: new Date(RANGE.rangeFrom),
  rangeTo: new Date(RANGE.rangeTo),
  storage: ccCentroStorage,
});

console.log(`  headline: ${ccCentroDiagnostics.headline}`);
console.log(`  ignoradas: ${ccCentroDiagnostics.ignoredDenominations.map((entry) => `${entry.currencyLabel} ${entry.denominationValue}`).join(", ") || "ninguna"}`);
console.log(`  desglose: ${ccCentroMetrics.rows.map((row) => `${row.currencyLabel} ${row.denominationValue}`).join(" · ")} | excluidas: ${ccCentroMetrics.excludedRows.map((row) => `${row.currencyLabel} ${row.denominationValue}`).join(", ") || "ninguna"}`);

expect("el USD 1 no se evalúa en el motor", !ccCentroDiagnostics.rows.some((row) => row.denominationValue === "1"));
expect("el USD 1 se explica como no evaluada", ccCentroDiagnostics.ignoredDenominations.some((entry) => entry.currencyLabel === "USD"));
expect("el USD 1 sale del desglose", !ccCentroMetrics.rows.some((row) => row.currencyLabel === "USD"));
expect("el USD 1 queda explicado en excluidas", ccCentroMetrics.excludedRows.some((row) => row.currencyLabel === "USD"));
expect("no hay incidentes", ccCentroDiagnostics.incidents.length === 0, incidentTitles(ccCentroDiagnostics));
expect("los totales por moneda no incluyen USD", ccCentroMetrics.storageTotalsByCurrency.every((entry) => entry.label === "COP"));
expect(
  "la entrega negativa del arqueo se acota a 0",
  ccCentroMetrics.excludedRows.every((row) => (row.delivered ?? 0) >= 0 && (row.negativeReport === null || row.delivered === 0)),
);
expect(
  "cada fila en uso explica por qué (tooltip del panel)",
  ccCentroMetrics.rows.every((row) => row.inUseReasons.length > 0),
);
expect("una máquina de una sola moneda no se marca multimoneda", ccCentroMetrics.multiCurrency === false, ccCentroMetrics.currencyLabels.join(", "));
expect(
  "el USD 1 conserva su motivo canónico",
  (ccCentroMetrics.excludedRows.find((row) => row.currencyLabel === "USD")?.excludedReason ?? "").includes("Su moneda (USD)"),
);

/* ------------------------------------------------------------------ 7) divisa: COP ⇄ USD sin mezclas */

console.log("\n[divisa] máquina de cambio divisa: cada moneda por separado (C8)");

const divisaDenominations = [
  catalogDenomination(1, COP, "100", "Peso colombiano"),
  catalogDenomination(2, COP, "1000", "Peso colombiano"),
  catalogDenomination(10, USD, "1", "Dólar estadounidense"),
  catalogDenomination(11, USD, "100", "Dólar estadounidense"),
  catalogDenomination(12, USD, "10", "Dólar estadounidense"),
  catalogDenomination(13, USD, "5", "Dólar estadounidense"),
];
const divisaStorage = [
  storageRow("100", 1, "200"),
  storageRow("1000", 2, "50"),
  storageRow("1", 10, "40"),
  storageRow("100", 11, "20"),
  storageRow("10", 12, "30"),
  storageRow("5", 13, "50"),
];
// Un pago de USD 100 entregado con el billete de USD 100: antes se «planeaba» con
// 1 × COP 100 y se acusaba al monedero de pesos de no participar.
const divisaPayouts = [
  ...[0, 1].map((index) =>
    transaction(
      600 + index,
      `2026-09-17T14:${index === 0 ? "10" : "40"}:00.000Z`,
      [{ denominationId: 11, operation: "Devuelta", operationId: 2, quantity: "1" }],
      { income: "500000", real: "500000", ret: "100" },
    ),
  ),
  // Sustitución REAL dentro de USD: el pago de USD 10 sale como 2 × USD 5.
  ...[2, 3].map((index) =>
    transaction(
      600 + index,
      `2026-09-17T15:${index === 2 ? "10" : "40"}:00.000Z`,
      [{ denominationId: 13, operation: "Devuelta", operationId: 2, quantity: "2" }],
      { income: "500000", real: "500000", ret: "10" },
    ),
  ),
];
const divisa = computeJamDiagnostics({
  byState: { Aprobada: { count: 4, total: "1000000" } },
  denominations: divisaDenominations,
  loads: [],
  machineCurrency: { id: COP, label: "COP" },
  scan: scan(divisaPayouts),
  storage: divisaStorage,
  tonnages: [],
  ...RANGE,
});

const divisaMetrics = computeDispensingMetrics({
  byState: { Aprobada: { count: 4, total: "1000000" } },
  denominations: divisaDenominations,
  lastTonnage: null,
  loads: [],
  machineCurrency: { id: COP, label: "COP" },
  now: new Date("2026-09-17T22:00:00.000Z"),
  rangeFrom: new Date(RANGE.rangeFrom),
  rangeTo: new Date(RANGE.rangeTo),
  storage: divisaStorage,
});

console.log(`  headline: ${divisa.headline}`);
console.log(`  filas: ${divisa.rows.map((row) => `${row.currencyLabel} ${row.denominationValue} [${row.level}]`).join(" · ")}`);

const cop100 = divisa.rows.find((row) => row.denominationValue === "100" && row.currencyLabel === "COP") ?? null;
const usd10 = divisa.rows.find((row) => row.denominationValue === "10" && row.currencyLabel === "USD") ?? null;
expect("el COP 100 no recibe señales por un pago en dólares", (cop100?.signals.length ?? -1) === 0, JSON.stringify(cop100?.signals.map((signal) => signal.code)));
expect("el USD 10 sí detecta la sustitución real", (usd10?.substitutionEvents ?? 0) > 0);
expect("el titular distingue la moneda", divisa.headline.includes("USD 10"));
expect("la máquina se declara multimoneda", divisa.multiCurrency === true);
expect("no hay pagos con monedas mezcladas", divisa.mixedCurrencyPayouts === 0);
expect("las tarjetas declaran la máquina como multimoneda", divisaMetrics.multiCurrency === true);
expect(
  "se publican las monedas en uso",
  divisaMetrics.currencyLabels.includes("COP") && divisaMetrics.currencyLabels.includes("USD"),
  divisaMetrics.currencyLabels.join(", "),
);

/* ------------------------------------------------------------------ 8) alerta del inicio: moneda por máquina */

console.log("\n[alerta-inicio] moneda de cada máquina para no sumar importes incomparables");

const catalogo = divisaDenominations.map((entry) => ({ currency: entry.currency, id: entry.id, idCurrency: entry.idCurrency }));
const aStorage = (entries: { id: number; isDispensing: boolean; min?: string; stock?: string }[]) =>
  entries.map((entry) => ({
    apStored: "0",
    dpStored: entry.stock ?? "0",
    idCurrencyDenomination: entry.id,
    isDispensing: entry.isDispensing,
    minDpQuantity: entry.min ?? "0",
    rjStored: "0",
  }));

const divisaCurrencies = summarizeMachineCurrencies({
  catalog: catalogo,
  fallbackCurrencyId: COP,
  storage: aStorage([
    { id: 1, isDispensing: true, stock: "200" },
    { id: 11, isDispensing: true, stock: "20" },
    { id: 10, isDispensing: false },
  ]),
});
const ccCentroCurrencies = summarizeMachineCurrencies({
  catalog: catalogo,
  fallbackCurrencyId: COP,
  storage: aStorage([
    { id: 1, isDispensing: true, stock: "40" },
    { id: 2, isDispensing: true, stock: "20" },
    { id: 10, isDispensing: false },
  ]),
});
// Los baúles con saldo siguen contando aunque la configuración esté desactualizada, y una
// fila sin configuración ni saldo (el USD 1 heredado) no convierte la máquina en multimoneda.
const sinCatalogo = summarizeMachineCurrencies({ catalog: [], fallbackCurrencyId: USD, storage: aStorage([{ id: 10, isDispensing: true, stock: "5" }]) });

console.log(`  divisa: ${JSON.stringify(divisaCurrencies)} · cc-centro: ${JSON.stringify(ccCentroCurrencies)}`);
expect("la máquina de divisa se declara multimoneda", divisaCurrencies.mixed === true);
expect("sus monedas son COP y USD", divisaCurrencies.labels.includes("COP") && divisaCurrencies.labels.includes("USD"), divisaCurrencies.labels.join(", "));
expect("la máquina de solo pesos no se declara multimoneda", ccCentroCurrencies.mixed === false);
expect("el USD 1 heredado no cuenta como moneda en uso", !ccCentroCurrencies.labels.includes("USD"), ccCentroCurrencies.labels.join(", "));
expect("sin catálogo cae a la moneda del Pay+", sinCatalogo.mixed === false && sinCatalogo.labels.includes("moneda del Pay+"), sinCatalogo.labels.join(", "));

/* ------------------------------------------------------------------ 9) transacciones: recaudo por moneda */

console.log("\n[monedas-tx] el recaudo del período se agrupa por moneda");

const tx = (id: number, paypadId: number, state: string, income: string, returned: string, typePayment: string) => ({
  dateCreated: "2026-09-17T15:00:00.000Z",
  id,
  idPayPad: paypadId,
  incomeAmount: income,
  realAmount: income,
  returnAmount: returned,
  stateTransaction: state,
  totalAmount: income,
  typePayment,
});

const txCurrencyMap = new Map([
  [10, { currencyId: COP, label: "COP", mixed: false }],
  [20, { currencyId: USD, label: "USD", mixed: false }],
  [30, { currencyId: COP, label: "COP, USD", mixed: true }],
]);
const txRows = [
  tx(1, 10, "Aprobada", "50000", "0", "Efectivo"),
  tx(2, 10, "Aprobada", "30000", "5000", "Tarjeta"),
  tx(3, 10, "Cancelada", "20000", "0", "Efectivo"),
  tx(4, 20, "Aprobada", "100", "0", "Efectivo"),
  tx(5, 20, "Aprobada", "50", "0", "Efectivo"),
  tx(6, 30, "Aprobada", "500000", "0", "Efectivo"),
];

const buckets = summarizeTransactionsByCurrency(txRows, txCurrencyMap);
console.log(`  grupos: ${buckets.map((bucket) => `${bucket.currencyLabel}=${bucket.approvedTotal} (${bucket.approvedCount})`).join(" · ")}`);
expect("hay un grupo por moneda", buckets.length === 3, String(buckets.length));
expect(
  "COP suma sólo sus máquinas (50.000 + 30.000 − 5.000 devuelto)",
  buckets.find((bucket) => bucket.currencyLabel === "COP")?.approvedTotal === "75000",
  String(buckets.find((bucket) => bucket.currencyLabel === "COP")?.approvedTotal),
);
expect("USD suma sólo sus máquinas (150)", buckets.find((bucket) => bucket.currencyLabel === "USD")?.approvedTotal === "150");
expect(
  "la máquina de cambio divisa va al grupo «Varias monedas»",
  buckets.some((bucket) => bucket.mixed && bucket.currencyLabel.includes("Varias monedas")),
  buckets.map((bucket) => bucket.currencyLabel).join(" | "),
);
expect("el grupo mixto conserva sus propias monedas", buckets.find((bucket) => bucket.mixed)?.currencyLabel.includes("COP, USD") === true);
expect(
  "efectivo y tarjeta se separan dentro de cada moneda",
  buckets.find((bucket) => bucket.currencyLabel === "COP")?.cashTotal === "50000" &&
    buckets.find((bucket) => bucket.currencyLabel === "COP")?.cardTotal === "25000",
  `efectivo=${buckets.find((bucket) => bucket.currencyLabel === "COP")?.cashTotal} tarjeta=${buckets.find((bucket) => bucket.currencyLabel === "COP")?.cardTotal}`,
);
expect(
  "una sola moneda no se fragmenta",
  summarizeTransactionsByCurrency([tx(9, 10, "Aprobada", "1000", "0", "Efectivo")], txCurrencyMap).length === 1,
);

/* ------------------------------------------------------------------ 10) arqueo desde el cargue (C10) */

console.log("\n[arqueo-cargue] cuadre físico del arqueo base a hoy (Inder Uno, estilo id 70)");

function loadDetail(denominationId: number, denominationValue: string, quantity: string) {
  return { denominationValue, idCurrencyDenomination: denominationId, quantity };
}

function load(id: number, dateCreated: string, details: ReturnType<typeof loadDetail>[], totalLoaded: string) {
  return { dateCreated, details, id, totalLoaded };
}

const arqueoCase = (() => {
  // Inventario HOY: la máquina ya no dispensa 2.000 (módulo retirado) pero el baúl de
  // rechazo todavía guarda 2 billetes de 2.000 y 3 de 5.000. El 1.000 está muerto del
  // todo (sin configuración, sin saldo, sin cargues, sin existencias en la base).
  const storage = [
    storageRow("50000", 1, "10", { dispensingTotal: "500000", min: "2" }),
    storageRow("20000", 2, "5", { dispensingTotal: "100000", min: "2" }),
    storageRow("10000", 3, "0", { min: "2" }),
    storageRow("5000", 4, "20", { accepted: "7", acceptedTotal: "35000", dispensingTotal: "100000", min: "2", rejected: "3", rejectedTotal: "15000" }),
    storageRow("2000", 5, "0", { dispensing: false, rejected: "2", rejectedTotal: "4000" }),
    storageRow("1000", 6, "0", { dispensing: false }),
  ];
  // Arqueo BASE (15/09): todavía había 30 billetes de 2.000 en el dispensador.
  const base = tonnage(11, "2026-09-15T09:00:00.000Z", [
    tonnageDetail("50000", 1, "12"),
    tonnageDetail("20000", 2, "8"),
    tonnageDetail("10000", 3, "4"),
    tonnageDetail("5000", 4, "25", "1", "5"),
    tonnageDetail("2000", 5, "30"),
  ]);
  // Cargue posterior a la base (16/09): el período «Desde último cargue» lo cubre.
  const loads = [
    load(21, "2026-09-16T10:00:00.000Z", [
      loadDetail(1, "50000", "5"),
      loadDetail(2, "20000", "2"),
      loadDetail(4, "5000", "10"),
    ], "300000"),
  ];

  return computeDispensingMetrics({
    byState: { Aprobada: { count: 40, total: "900000" }, "Aprobada Error Devuelta": { count: 2, total: "15000" } },
    denominations: [
      catalogDenomination(1, COP, "50000", "Peso colombiano"),
      catalogDenomination(2, COP, "20000", "Peso colombiano"),
      catalogDenomination(3, COP, "10000", "Peso colombiano"),
      catalogDenomination(4, COP, "5000", "Peso colombiano"),
      catalogDenomination(5, COP, "2000", "Peso colombiano"),
      catalogDenomination(6, COP, "1000", "Peso colombiano"),
    ],
    lastTonnage: base,
    loads,
    machineCurrency: { id: COP, label: "COP" },
    now: new Date("2026-09-17T22:00:00.000Z"),
    rangeFrom: new Date("2026-09-16T10:00:00.000Z"),
    rangeTo: new Date("2026-09-17T22:00:00.000Z"),
    storage,
  });
})();

function arqueoRow(value: string) {
  return arqueoCase.rows.find((row) => row.denominationValue === value) ?? null;
}

console.log(`  entregadas: ${arqueoCase.rows.map((row) => `${row.denominationValue}=${String(row.delivered)}`).join(" · ")}`);
console.log(`  excluidas: ${arqueoCase.excludedRows.map((row) => row.denominationValue).join(", ") || "ninguna"}`);

expect("el 50.000 cuadra: 12 + 5 − 10 = 7", arqueoRow("50000")?.delivered === 7, String(arqueoRow("50000")?.delivered));
expect("el 20.000 cuadra: 8 + 2 − 5 = 5", arqueoRow("20000")?.delivered === 5, String(arqueoRow("20000")?.delivered));
expect("el 10.000 agotado sigue visible: 4 + 0 − 0 = 4", arqueoRow("10000")?.delivered === 4, String(arqueoRow("10000")?.delivered));
expect("el 5.000 cuadra: 25 + 10 − 20 = 15", arqueoRow("5000")?.delivered === 15, String(arqueoRow("5000")?.delivered));
expect(
  "el 2.000 retirado explica sus 30 salidos (30 + 0 − 0)",
  arqueoRow("2000")?.delivered === 30 && arqueoRow("2000")?.initialDp === 30,
  `delivered=${String(arqueoRow("2000")?.delivered)} inicial=${String(arqueoRow("2000")?.initialDp)}`,
);
expect("el 1.000 muerto queda excluido con motivo", arqueoCase.excludedRows.some((row) => row.denominationValue === "1000"));
expect(
  "el rechazo muestra el baúl ACTUAL (3 de 5.000 con Δ +2)",
  arqueoRow("5000")?.rejected === 3 && arqueoRow("5000")?.rejectedDelta === 2,
  `rejected=${String(arqueoRow("5000")?.rejected)} delta=${String(arqueoRow("5000")?.rejectedDelta)}`,
);
expect(
  "los 2.000 del reject se ven (no dispensa pero tiene reject)",
  arqueoRow("2000")?.rejected === 2,
  `rejected=${String(arqueoRow("2000")?.rejected)}`,
);
expect(
  "la salida valorizada suma 625.000 (7×50.000 + 5×20.000 + 4×10.000 + 15×5.000 + 30×2.000)",
  arqueoCase.dp.outflowTotal === "625000",
  String(arqueoCase.dp.outflowTotal),
);
expect("el baúl de rechazo actual vale 19.000", arqueoCase.rj.currentTotal === "19000", arqueoCase.rj.currentTotal);
expect("los aceptadores de hoy valen 35.000", arqueoCase.apPhysical.currentTotal === "35000", arqueoCase.apPhysical.currentTotal);
expect(
  "la cargada desde la base del 50.000 es 5",
  arqueoRow("50000")?.loadedSinceBase === 5,
  String(arqueoRow("50000")?.loadedSinceBase),
);
expect("hay base y un cargue desde la base por 300.000", arqueoCase.reconciliation.hasBase === true && arqueoCase.reconciliation.loadsSinceBaseTotal === "300000");

// Con una base FRESCA (arqueo posterior al retiro del módulo de 2.000, sin detalle de
// 2.000 ni de 1.000) y el reject vacío, el 2.000 desaparece del desglose: la máquina
// ya no lo trabaja y no hay dinero que explicar.
const arqueoFreshBase = computeDispensingMetrics({
  byState: { Aprobada: { count: 5, total: "100000" } },
  denominations: [catalogDenomination(1, COP, "50000", "Peso colombiano"), catalogDenomination(5, COP, "2000", "Peso colombiano")],
  lastTonnage: tonnage(12, "2026-09-17T09:00:00.000Z", [tonnageDetail("50000", 1, "10")]),
  loads: [],
  machineCurrency: { id: COP, label: "COP" },
  now: new Date("2026-09-17T22:00:00.000Z"),
  rangeFrom: new Date(RANGE.rangeFrom),
  rangeTo: new Date(RANGE.rangeTo),
  storage: [
    storageRow("50000", 1, "8", { dispensingTotal: "400000", min: "2" }),
    storageRow("2000", 5, "0", { dispensing: false }),
  ],
});

expect(
  "con base fresca el 2.000 sin saldo ni reject queda excluido",
  arqueoFreshBase.excludedRows.some((row) => row.denominationValue === "2000"),
  arqueoFreshBase.excludedRows.map((row) => row.denominationValue).join(", "),
);
expect("con base fresca el 50.000 cuadra: 10 + 0 − 8 = 2", arqueoFreshBase.rows.find((row) => row.denominationValue === "50000")?.delivered === 2);

// Sin arqueo base la salida física NO se inventa: queda indeterminada.
const arqueoNoBase = computeDispensingMetrics({
  byState: {},
  denominations: [],
  lastTonnage: null,
  loads: [],
  machineCurrency: null,
  now: new Date("2026-09-17T22:00:00.000Z"),
  rangeFrom: new Date(RANGE.rangeFrom),
  rangeTo: new Date(RANGE.rangeTo),
  storage: [storageRow("50000", 1, "8", { dispensingTotal: "400000", min: "2" })],
});

expect("sin base la entregada es indeterminada (null)", arqueoNoBase.rows[0]?.delivered === null, String(arqueoNoBase.rows[0]?.delivered));
expect("sin base no hay total de salida", arqueoNoBase.dp.outflowTotal === null, String(arqueoNoBase.dp.outflowTotal));
expect("sin base el delta de rechazo es indeterminado", arqueoNoBase.rows[0]?.rejectedDelta === null);

/* ---------------------------- 11) caso del operador: 84 + 140 − 11 = 213 (Inder Uno) */

console.log("\n[arqueo-trazabilidad] la «Entregada» se explica, se audita y se valida contra el arqueo");

const inderBase = {
  ...tonnage(31, "2026-09-19T17:56:44.000Z", [tonnageDetail("2000", 5, "84")]),
  total: "168000",
  totalAp: "0",
  totalDp: "168000",
  totalRj: "0",
};
const inderStorage = [storageRow("2000", 5, "11", { dispensingTotal: "22000", min: "5", rejected: "5", rejectedTotal: "10000" })];

function inderCase(loads: ReturnType<typeof load>[], storage = inderStorage) {
  return computeDispensingMetrics({
    byState: {},
    denominations: [catalogDenomination(5, COP, "2000", "Peso colombiano")],
    lastTonnage: inderBase,
    loads,
    machineCurrency: { id: COP, label: "COP" },
    now: new Date("2026-09-21T21:00:00.000Z"),
    rangeFrom: new Date("2026-09-20T15:00:00.000Z"),
    rangeTo: new Date("2026-09-21T21:00:00.000Z"),
    storage,
  });
}

// Dos cargues posteriores al arqueo (100 + 40) y el informe del operador («le cargaron
// 140»): la salida debe seguir siendo exacta y la «Cargada» debe poder auditarse.
const inder = inderCase([
  // Cargue ANTERIOR al arqueo base: sus 60 unidades ya están dentro del snapshot de la
  // base (84), así que no deben volver a sumarse a la «Cargada».
  load(40, "2026-09-19T12:00:00.000Z", [loadDetail(5, "2000", "60")], "120000"),
  load(41, "2026-09-20T15:00:00.000Z", [loadDetail(5, "2000", "100")], "200000"),
  load(42, "2026-09-21T13:30:00.000Z", [loadDetail(5, "2000", "40")], "80000"),
]);
const inderRow = inder.rows[0] ?? null;

console.log(`  entregada 2.000: ${String(inderRow?.delivered)} · cargada: ${String(inderRow?.loadedSinceBase)} · traza: ${inderRow?.loadsSinceBaseTrace.length ?? 0} cargues`);

expect("el caso 84 + 140 − 11 sigue dando 213", inderRow?.delivered === 213 && inderRow?.initialDp === 84, `delivered=${String(inderRow?.delivered)} inicial=${String(inderRow?.initialDp)}`);
expect("la cargada suma los dos cargues (100 + 40)", inderRow?.loadedSinceBase === 140, String(inderRow?.loadedSinceBase));
expect(
  "la traza dice de dónde sale la cargada, con fecha y orden",
  (inderRow?.loadsSinceBaseTrace.length ?? 0) === 2 &&
    inderRow?.loadsSinceBaseTrace[0]?.quantity === 100 &&
    inderRow?.loadsSinceBaseTrace[0]?.at === "2026-09-20T15:00:00.000Z" &&
    inderRow?.loadsSinceBaseTrace[1]?.quantity === 40,
  JSON.stringify(inderRow?.loadsSinceBaseTrace),
);
expect(
  "el arqueo base se valida contra sus propios totales (168.000 en dispensadores)",
  inder.reconciliation.baseSelfCheck?.matches === true && inder.reconciliation.baseSelfCheck?.details.dp === "168000",
  JSON.stringify(inder.reconciliation.baseSelfCheck),
);
expect(
  "las 5 unidades del rechazo se declaran dentro de la salida (Δ +5)",
  inderRow?.rejected === 5 && inderRow?.rejectedDelta === 5,
  `rejected=${String(inderRow?.rejected)} delta=${String(inderRow?.rejectedDelta)}`,
);
expect(
  "un cargue previo al arqueo base no vuelve a sumarse (ni entra a la traza)",
  (inderRow?.loadsSinceBaseTrace.length ?? 0) === 2 && inder.reconciliation.loadsSinceBaseCount === 2,
  `traza=${String(inderRow?.loadsSinceBaseTrace.length)} cargues=${String(inder.reconciliation.loadsSinceBaseCount)}`,
);

// Un arqueo que NO cuadra consigo mismo se detecta: sus detalles no explican sus totales.
const inderIncoherentBase = inderCase([], inderStorage);
const inderIncoherent = computeDispensingMetrics({
  byState: {},
  denominations: [catalogDenomination(5, COP, "2000", "Peso colombiano")],
  lastTonnage: { ...inderBase, totalDp: "999000" },
  loads: [],
  machineCurrency: { id: COP, label: "COP" },
  now: new Date("2026-09-21T21:00:00.000Z"),
  rangeFrom: new Date("2026-09-20T15:00:00.000Z"),
  rangeTo: new Date("2026-09-21T21:00:00.000Z"),
  storage: inderStorage,
});
expect(
  "un arqueo base incoherente se declara (no se da por bueno)",
  inderIncoherent.reconciliation.baseSelfCheck?.matches === false &&
    inderIncoherent.reconciliation.baseSelfCheck?.declared.dp === "999000",
  JSON.stringify(inderIncoherent.reconciliation.baseSelfCheck),
);
expect("sin cargues posteriores la traza queda vacía", inderIncoherentBase.rows[0]?.loadsSinceBaseTrace.length === 0);
expect("sin cargues la salida sigue siendo 84 − 11 = 73", inderIncoherentBase.rows[0]?.delivered === 73, String(inderIncoherentBase.rows[0]?.delivered));

/* ------------------------------------------------------------------ resumen */

console.log(`\n${checks - failures}/${checks} comprobaciones correctas.`);
if (failures > 0) {
  console.error(`${failures} comprobación(es) fallaron.`);
  process.exitCode = 1;
}
