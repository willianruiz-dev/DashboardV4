# Viabilidad y diseño — Módulo "Dispensing Control"

> **Actualizado:** 2026-09-21 — **IMPLEMENTADO (fases A–D) + corrección del cuadre físico (C10)**
> **Veredicto:** **VIABLE**. El ~90% de los datos se resuelve con endpoints ya existentes (frontend + BFF). **Cero cambios en el backend .NET** para el núcleo; 1 extensión BFF de ~15 líneas (resumen por estado, ya aplicada) y 1 registro de ruta en datos (vía UI, sin código).
> **Estado del código:** implementado en `src/features/dispensing-control/` + ruta `/dashboard/transactions/dispensing-control`. **Sin operaciones de datos**: el acceso SuperAdmin se resuelve en el frontend por nombre de rol (ítem inyectado en el sidebar + guard de página). Pendiente: validación E2E autenticada con Pay+ real.
>
> **Corrección 2026-09-21 — el cuadre físico va del arqueo base a hoy (C10):** el
> desglose mostraba el `quantityDp`/`quantityRj` del último arqueo como «entregada/
> rechazada del período», pero el arqueo es un **inventario** (snapshot del storage al
> momento de arquear, igual que en el dashboard viejo), no un movimiento. La tabla ahora
> cuadra por denominación: `Entregada (física) = Inicial (arqueo base) + Cargada (desde la
> base) − Saldo (hoy)`, el rechazo mostrado es el baúl **actual** con su delta, la tarjeta
> DP es la salida física valorizada, y hay preset «Desde último cargue» para el arqueo
> operativo. Sin arqueo base la salida queda indeterminada (no se inventa). D3/D5 y §5.1
> actualizados; regresión `arqueo-cargue` en `scripts/dispensing-fixtures.mts`.
>
> **Corrección D5 — la «Entregada» es la del CARGUE (2026-09-21, caso Inder Uno id 70):** el
> operador vio `Entregada 213` frente a `Cargada 140` y lo rechazó con razón: «si cargué 140
> no puedo tener 213 entregados». El 213 era el cuadre **desde el arqueo base** (`84` que ya
> había en el baúl al arquear `+ 140` cargues `− 11` saldo), una cifra legítima de inventario
> pero **no** lo que él pide: la salida atribuible a su cargue. Ahora la columna «Entregada»
> y la tarjeta DP usan el **período del último cargue** (`cargues − saldo`, que por
> construcción **nunca supera lo cargado**), y el cuadre desde el arqueo queda como
> **referencia auditada** en el subtítulo de la fila. Además: (a) cada fila muestra su
> **ecuación** y el reparto cliente/rechazo (con tu caso: `140 − 11 = 129` salidas, `5` al
> rechazo ⇒ `124` al cliente, el número del operador); (b) la columna «Inicial (arqueo →
> cargue)» es el **puente**: `84` había al cargar, y `84 + 140 − 11 = 213` cierra el cuadre
> del arqueo; (c) la «Cargada» lleva **traza de cargues** (fecha y unidades); (d) el arqueo
> base se **valida contra sus propios totales** (`totalAp/totalDp/totalRj` de «Cargues y
> arqueos») y una base incoherente se declara. Regresión `arqueo-trazabilidad` (79 checks).

> **Extensión 2026-09-17 — detección de atascos:** el módulo incorpora el diagnóstico de
> atascos por denominación (motor `dispensing-jams.ts`, BFF `POST /api/dispensing/jams` y
> panel «Detección de atascos»). Fórmulas, señales, umbrales, límites y validación local en
> **`docs/DISPENSING_JAM_DETECTION.md`**. No cambia ninguna decisión de este documento: sigue
> sin requerir cambios en el backend .NET.
>
> **Extensión 2026-09-17 — alerta del inicio y multimoneda:** el inicio del panel muestra las
> máquinas con errores de devuelta del día (`POST /api/dispensing/return-alerts` +
> `components/return-alerts-home.tsx`, §9 de `DISPENSING_JAM_DETECTION.md`) y el módulo separa
> **por moneda** todo cálculo y agregado (C8/C9: `denomination-currency.ts`,
> `denomination-usage.ts`). Este documento describe el diseño original: la lista de archivos de
> §2 y la tabla de riesgos se actualizaron al resultado final, y el estado por fases vive en
> `docs/AGENT_TASK_BACKLOG.md`.

### Decisiones resueltas (2026-09-17)

- **D1 — Acceso SuperAdmin:** **resuelto en el frontend por nombre de rol** (`isSuperAdminRole` en `src/lib/roles/super-admin.ts`, normaliza `SuperAdmin`/`super admin`/`super-admin`, e incluye `root` como super-rol legacy, igual que la página de Usuarios). El sidebar inyecta el ítem para ese rol (`withDispensingControl` en `dashboard-navigation.ts`) y la página aplica el mismo guard. **Cero operaciones de datos, cero cambios al API.** Si en el futuro se crea la ruta en datos para el rol, el ítem no se duplica.
- **D2 — Umbral de alerta:** `minDpQuantity` existente (con la tolerancia legacy de +10 unidades). Opción B (porcentaje sobre capacidad en `extraDataJson`) queda como evolución.
- **D3 — Tarjeta DP (corregida C10):** salida física valorizada desde el arqueo base (`Σ entregada × denominación`), con subtítulo de base/cargado/inventario; sin arqueo base, «—» + inventario actual como referencia (antes mostraba el stock del arqueo viejo como si fuera entrega del período).
- **D4 — byState:** extensión BFF aplicada (`summary.byState` en `src/app/api/transactions/search/route.ts`).
- **D5 — "Cantidad Entregada" (corregida C10):** salida física `inicial (base) + cargada (desde la base) − saldo (hoy)`; la «Rechazada» es el baúl actual (`rjStored`) con su delta. Sin base, indeterminada (antes: `quantityDp`/`quantityRj` del arqueo, que son inventario, no movimiento).

---

## 1. Mapeo de datos: cada métrica → fuente real

Toda la evidencia proviene de código actual (frontend V4 + backend legado consumido por el BFF).

| Métrica del módulo | Fuente (endpoint existente) | Campos | Precisión |
| --- | --- | --- | --- |
| **AP (valor que el sistema dice que se debió entregar, período)** | `POST /api/transactions/search` (BFF) → internally `Transaction/GetByDate` | Transacciones con `stateTransaction === "Aprobada"`: `incomeAmount − returnAmount` (misma fórmula del `summary` actual del BFF) | **Exacta** |
| **RJ (período, por estado)** | Ídem | Transacciones con `stateTransaction === "Aprobada Error Devuelta"` | **Exacta** (requiere extensión `byState` del BFF, §4-D4) |
| **DP (valor real entregado)** | Arqueo base + cargues desde la base + storage actual | Por denominación: `quantityDp(base) + Σ cargues(base→hoy) − dpStored(hoy)`, valorizado × denominación | **Exacta** (física, del arqueo base a hoy; sin base: indeterminada) |
| **Saldo actual por denominación (baúles)** | `GET /api/PayPad/GetStorage/{id}` | `dpStored`/`dpTotal` (dispensador), `apStored`/`apTotal` (aceptadores), `rjStored`/`rjTotal` (rechazo) | **Exacta** (inventario del sistema) |
| **Umbral de alerta** | Ídem (storage) | `minDpQuantity` por denominación (editable hoy en "Configurar denominaciones"). El backend legado ya alerta con `DpStored <= MinDpQuantity + 10` | **Exacta** (alternativa al "20% de capacidad", §4-D2) |
| **Tiempo desde último cargue** | `GET /api/Load/GetByPaypad/{id}` | `max(loads[].dateCreated)` | **Exacta** |
| **Cargada por denominación (desde la base)** | Ídem (loads) | `Σ loads[].details[].quantity` con `dateCreated > arqueoBase` (sin base: cae al período UI como referencia) | **Exacta** |
| **Inicial por denominación** | Último arqueo = base física | `details[].quantityDp/Rj/Ap` (inventario de ese día, no movimiento) | **Exacta** (snapshot) |
| **Rechazo por denominación** | Storage actual + base | `rjStored` (hoy) + delta `hoy − base` | **Exacta** |
| **Lista de máquinas** | `GET /api/PayPad` (BFF `/api/paypads`) | — | — |
| **Metadata de denominaciones** | `GET /api/masters/denominations` | `value`, `img`, `idCurrency` | — |

### Hallazgo clave (reducirá la complejidad)

El BFF de búsqueda de transacciones **ya descarga el conjunto completo** del período (`GetByDate` sin paginación en el API) y calcula el `summary` sobre **todo** el conjunto (no solo la página visible); `items` es solo la página para mostrar, y `total`/`transactionIds` cubren el todo. Por tanto:

- Las métricas de período **no requieren paginar ni acumular pags en el cliente**.
- Extender `createSummary` con un desglose `byState` (conteo + neto por `stateTransaction`) es un cambio de ~15 líneas **solo en el BFF** (Next.js), sin tocar el .NET.

### Estados reales del dominio (verificado en el dashboard antiguo)

`Aprobada` · `Aprobada Error Devuelta` · `Cancelada` · `Cancelada Error Devuelta`

Semántica propuesta (consistente con el legacy `TransactionsResume.js`):

- **AP** = `Aprobada` (valor neto `income − return`).
- **RJ** = `Aprobada Error Devuelta` (lo que la máquina "aprobó" pero no entregó; se devuelve al baúl de rechazo).
- Contexto adicional opcional: conteo de `Cancelada` y `Cancelada Error Devuelta`.

---

## 2. Arquitectura de archivos (propuesta)

```
src/app/dashboard/transactions/dispensing-control/page.tsx   # Server: ?paypad= → preselección
src/app/api/dispensing/jams/route.ts                         # BFF acotado del análisis de detalles
src/app/api/dispensing/return-alerts/route.ts                # BFF de la alerta del inicio

src/features/dispensing-control/
  schemas.ts                    # Tipos Zod: filtros, métricas, barrido de detalles, alerta del inicio
  api.ts                        # searchTransactions / storage / tonnages / loads + jams + return-alerts
  dispensing-metrics.ts         # FUNCIÓN PURA: computeDispensingMetrics(...) (saldos, AP/DP/RJ)
  dispensing-jams.ts            # FUNCIÓN PURA: motor de atascos (señales, niveles, atribución)
  detail-normalizer.ts          # Normalizador tolerante de `Transaction/{id}/Details` (C1)
  denomination-currency.ts      # Moneda y valor de cada denominación (COP ≠ USD) — C8
  denomination-usage.ts         # ¿La máquina usa hoy esta denominación? + monedas por máquina — C9
  hooks.ts                      # useDispensingMetrics, useDispensingJamScan, useDispensingReturnAlerts
  components/
    dispensing-control-page.tsx # Composición general + estados (pending/error/empty) + aviso multimoneda
    dispensing-filters.tsx      # Select Pay+ + presets Hoy/24h/7d + rango custom
    metric-card.tsx             # Card reutilizable (título, valor, ícono, tono, sub-texto)
    denomination-table.tsx      # Grid Inicial/Cargada/Entregada/Rechazo/Saldo + alertas por fila
                                # (LowBalanceAlert vive aquí) + filas fuera de inventario (C9)
                                # + conteo por encima de la base (C10)
    jam-diagnostics.tsx         # Panel de atascos: incidentes, evidencia por denominación, límites
    return-alerts-home.tsx      # Tarjetas de la alerta del inicio (errores de devuelta del día)

scripts/dispensing-fixtures.mts # Suite de regresiones: `npm run fixtures:dispensing` (en `check`)
```

Cambios transversales pequeños:

| Archivo | Cambio |
| --- | --- |
| `src/lib/navigation/dashboard-navigation.ts` | Añadir al mapa `legacyPathToAppPath`: `"/Admin/Transactions/DispensingControl": "/dashboard/transactions/dispensing-control"` (el path legado debe coincidir con el registro de ruta creado en el módulo Rutas) |
| `src/app/api/transactions/search/route.ts` | **Aplicado (D4)**: `createSummary` publica `byState` |
| `src/features/transactions/schemas.ts` | **Aplicado (D4)**: `transactionSummarySchema` incluye el mapa `byState` |

---

## 3. Ruteo y permisos (sección SuperAdmin)

### Cómo funciona hoy (evidencia)

1. La sesión trae `role.routes` (rutas asignadas al rol) y `role.permissions`.
2. El sidebar se construye **solo** con las rutas del rol (`buildDashboardNavigation(session.routes)`): lo que no está asignado al rol, no se ve. **No existe hardcoded de roles** en la navegación.
3. Cada página hace su guard propio: `hasPermission(session, "X")` → si no, `<ForbiddenState/>`.
4. **No existe un rol "superAdmin" en el código ni en los seeds.** El único caso especial de rol por nombre es `root` (página de Usuarios: `session.role.role?.toLowerCase() === "root"`).

### Implementado (resolución 100% en la app, sin datos ni API)

El acceso se resuelve **en el frontend por nombre de rol**, con el mismo patrón que ya usa la página de Usuarios para `root`:

1. **`src/lib/roles/super-admin.ts`** — `isSuperAdminRole(role)`: normaliza mayúsculas/espacios/guiones y reconoce `superadmin` (y `root` como super-rol legacy). Los muchos usuarios SuperAdmin acceden sin configurar nada.
2. **`dashboard-navigation.ts`** — `withDispensingControl(items, enabled)`: inyecta el ítem *Control de dispensado* (href `/dashboard/transactions/dispensing-control`, id `-1`) como **ítem totalmente separado, hermano justo debajo** de la entrada *Transacciones* —la cual se conserva intacta con su enlace original, nunca se convierte en grupo— o a nivel raíz si no existe; solo para SuperAdmin y sin duplicar si la ruta ya viniera asignada en datos.
3. **`dashboard-shell.tsx`** — aplica la inyección con `isSuperAdminRole(session.role.role ?? session.user.role)`; la navegación móvil usa el mismo árbol.
4. **Guard de página** — la página aplica el mismo `isSuperAdminRole` y muestra `ForbiddenState` al resto.
5. **`legacyPathToAppPath`** — el mapping `/Admin/Transactions/DispensingControl` se conserva: si algún día el rol lleva la ruta asignada en datos, el ítem se resuelve igual (sin duplicados).

> Si el equipo prefiere un permiso nombrado (`ReadDispensingControl`) como en otros módulos, basta crear la fila en la tabla de permisos (seed/DB) y cambiar 1 línea del guard.

---

## 4. Decisiones pendientes (con recomendación)

| # | Decisión | Opciones | Recomendación |
| --- | --- | --- | --- |
| **D1** | Qué es "superAdmin" | A) Permiso + ruta asignados solo al rol superAdmin (data-driven, patrón de la app) · B) Chequeo de nombre de rol (`root`/`superadmin`) | **A**. Pregunta: ¿cómo se llama el rol superAdmin en la BD de producción? |
| **D2** | Umbral de alerta del baúl (el spec dice "20% de capacidad máxima", **que no existe como campo en la BD**) | A) `minDpQuantity` ya existente por denominación (el backend legado ya usa `dpStored <= minDpQuantity + 10` para alertar) · B) % contra capacidad: almacenar `maxDpCapacity` por denominación en `PayPadConfiguration.extraDataJson` (key/value existente, **sin migración**) · C) Nueva columna + stored procedure (los SP no están en el repo; la más pesada) | **A** como v1 (cero cambios), **B** si se exige el porcentaje literal |
| **D3** | Semántica de la tarjeta **DP** ("valor real entregado") | A) ~~Último arqueo `totalDp`~~ (era stock, no entrega: corregido en C10) · B) Salida física desde la base (`Σ entregada × valor`) + subtítulo base/cargado/inventario · C) Transacciones exitosas del período | **B** (es lo realmente salido); sin base: «—» + inventario como referencia |
| **D4** | Desglose por estado del período (RJ por `"Aprobada Error Devuelta"`) | A) Extensión BFF `byState` (~15 líneas, sin .NET) · B) Paginar `items` (pageSize≤100) en el cliente — inviable para períodos grandes | **A** |
| **D5** | Columna "Cantidad Entregada" de la tabla de denominaciones | A) ~~`quantityDp` del último arqueo~~ (inventario, no movimiento: C10) · B) ~~`inicial (base) + cargada (desde la base) − saldo`~~ (puede superar lo cargado: rechazado por el operador) · C) **`cargada (desde el último cargue) − saldo (hoy)`** — la cifra del arqueo operativo, nunca mayor que lo cargado, con el cuadre desde el arqueo como referencia auditada y el puente «al cargar había X» | **C**; sin cargues se degrada a B y se declara |

---

## 5. Lógica y orquestación

### 5.1 Formulas (máquina `M`, período `[from, to]`, ahora `t`)

```
AP   = Σ neto(t)   donde t.estado = "Aprobada"                        [transacciones, período]
RJ   = Σ neto(t)   donde t.estado = "Aprobada Error Devuelta"         [transacciones, período]
neto(t) = incomeAmount(t) − returnAmount(t)                           [misma fórmula del BFF]

base(M) = últimoArqueo(M)               [snapshot físico; sin arqueo, el cuadre desde base no existe]
InicialDP(d) = base.details(d).quantityDp      (inventario de ese día, acotado ≥ 0)
Cargada(d)   = Σ carga.detalle.cantidad(d)  donde carga.fecha > base.fecha     [cargues, desde base]
Saldo(d)     = storage(M, d).dpStored     (valor: storage(M, d).dpTotal)       [storage]
Rechazo(d)   = storage(M, d).rjStored     (Δ = hoy − base.details(d).quantityRj)

CARGUE(d)    = Σ carga.detalle.cantidad(d)  donde carga.fecha >= últimoCargue.fecha  [incluye el cargue]
Entregada(d) = CARGUE(d) − Saldo(d)            [CIFRA OPERATIVA: nunca > CARGUE(d)]
  alCliente(d) ≈ Entregada(d) − ΔRechazo(d)    [lo que quedó en el baúl de rechazo NO llegó al cliente]
AlCargar(d)  = InicialDP(d) + (Cargada(d) − CARGUE(d))   [puente: lo que había al cargar;
                AlCargar + CARGUE − Saldo = InicialDP + Cargada − Saldo = cuadre del arqueo]
DesdeBase(d) = InicialDP(d) + Cargada(d) − Saldo(d)   [REFERENCIA auditada; puede superar lo cargado]
DP   = Σ Entregada(d) × valor(d)          [valorizada por moneda; sin cargues: indeterminada]
DP_referencia = Σ DesdeBase(d) × valor(d) [la cifra C10 anterior, mostrada como referencia]
AP_físico: base.totalAp → aceptadores hoy (Σ apTotal)     RJ_físico: base.totalRj → reject hoy (Σ rjTotal)
Alerta(d) = storage(M, d).isDispensing && storage(M, d).dpStored <= storage(M, d).minDpQuantity (+10 tol. legacy)

últimoCargue = max(carga.fecha) ;  transcurrido = t − últimoCargue
preset "Desde último cargue" = período AP/RJ [últimoCargue → ahora] (arqueo operativo)

trazada(d)   = [ {fecha: carga.fecha, unidades: carga.detalle.cantidad(d)} | carga.fecha > base.fecha ]
               [auditoría de la «Cargada»: qué cargues la componen y con qué fechas]
autoCuadre   = Σ base.details × valor  vs  base.totalAp/totalDp/totalRj     [el arqueo base debe
               explicarse a sí mismo; si no, el panel lo declara en vez de dar la salida por buena]
ventanaFísica = (base.fecha → hoy] SIEMPRE: el filtro de período sólo mueve AP/RJ
```

### 5.2 Hook central (contrato)

```ts
// src/features/dispensing-control/hooks.ts
export interface DispensingFilters {
  paypadId: number | null;            // null → máquina no seleccionada
  preset: "hoy" | "24h" | "7d" | "rango";
  from: string; to: string;           // ISO UTC (localDateTimeToApiIso existente)
}

export function useDispensingMetrics(filters: DispensingFilters | null) {
  // 1) Orquestación de queries existentes (react-query)
  const storageQuery  = usePaypadStorage(filters?.paypadId ?? null);
  const tonnagesQuery = usePaypadTonnages(filters?.paypadId ?? null);
  const loadsQuery    = usePaypadLoads(filters?.paypadId ?? null);
  const searchQuery   = useTransactionSearch(toSearchRequest(filters)); // summary sobre el TODO del período
  const denominations = useDenominations(filters !== null);

  // 2) Cálculo puro (memoizado, testeable sin UI)
  return useMemo(
    () => computeDispensingMetrics({ storage, tonnages, loads, summary, denominations, now }),
    [storage, tonnages, loads, summary, denominations],
  );
}
```

```ts
// Resultado (schemas.ts)
interface DispensingMetrics {
  ap:   { count: number; value: string };   // período (sistema)
  dp:   { value: string; at: string | null }; // último arqueo (físico)
  rj:   { count: number; value: string };   // período (estado "Aprobada Error Devuelta")
  lastLoad: { at: string | null; elapsedMs: number | null; totalLoaded: string };
  denominations: DenominationRow[];         // ver abajo
  alerts: LowBalanceAlert[];                // derivado de denominations
  hasTonnage: boolean;
}

interface DenominationRow {
  id: number; value: string; img: string | null;
  initialDp/Rj/Ap: number;  // Inicial (arqueo base; negativos legacy → 0 + nota)
  loadedSinceBase: number;  // Cargada (desde la base; sin base: período UI)
  loadedSinceLastLoad: number;      // Cargada (desde el último cargue, incluido él)
  loadsSinceBaseTrace: { at: string | null; quantity: number }[];  // auditoría de la Cargada
  deliveredFromLoad: number | null; // OPERATIVA: cargada(último cargue) − saldo; nunca > cargada
  stockAtLastLoad: number | null;   // puente: unidades en el baúl al momento del último cargue
  deliveredFromBase: number | null; // REFERENCIA: inicial(base) + cargada(base) − saldo
  delivered: number | null;         // alias histórico de deliveredFromBase
  rejected: number;         // Rechazo actual (rjStored) + rejectedDelta (hoy − base)
  balance: number;          // Saldo actual (dpStored)
  balanceValue: string;     // dpTotal
  isDispensing: boolean;
  minDpQuantity: number;
  low: boolean;             // saldo <= umbral
  shortage: boolean;        // delivered < 0: el conteo subió (revisar, no es entrega)
}

// reconciliation.baseSelfCheck: detalles del arqueo base vs sus totales declarados.
// `null` = no comparable (sin detalles, cantidades firmadas legacy o varias monedas).
```

### 5.3 Orquestación (grafo de datos)

```
┌────────────────────────────────────────────────────────────────────┐
│ SELECT Pay+ (usePaypads)            presets de tiempo              │
└───────────────┬──────────────────────────────────────┬─────────────┘
                │ paypadId                             │ from/to
   ┌────────────▼───────────┬─────────────────┐        │
   │ usePaypadStorage(id)   │ usePaypadTonnages(id) │   │
   │ usePaypadLoads(id)     │ useDenominations()  │   │
   └────────────┬───────────┴──────────┬──────────┘   │
                │                      │              │
                │        useTransactionSearch(paypadId, from, to)
                │                      │              │
                └──────────┬───────────┴──────────────┘
                           ▼
                 computeDispensingMetrics()  ← useMemo (puro)
                           ▼
        4× MetricCard + DenominationTable (+ alertas por fila)
```

**Reglas de orquestación:**

- `enabled` por query: solo con `paypadId` (storage/tonnages/loads) y con rango válido (search). Sin máquina seleccionada → estado vacío con CTA ("Selecciona una máquina").
- `staleTime: 60s` para storage/tonnages/loads (datos operativos); el search usa el rango como parte de la query key (cada cambio de preset es una nueva clave, sin refetches fantasma).
- **Invalidación:** al registrar cargue/arqueo o guardar storage desde los diálogos existentes (mismas `queryKey` de `paypads`), react-query invalida automáticamente → el módulo se refresca solo.
- **Carga paralela:** storage/tonnages/loads/search/disposiciones en paralelo (independientes); las cards se pintan en cuanto llega cada fuente (skeleton por card, no por página).
- Tiempo "transcurrido": se recalcula con un `useNow(60s)` (intervalo) para que "hace 12 h" avance sin refetch.

### 5.4 Filtros de tiempo

- Presets: `Hoy` (00:00 → ahora) · `Últimas 24 h` (ahora−24h → ahora) · `Últimos 7 días` (ahora−7d → ahora) · `Rango custom` (dos `datetime-local`, validación `from ≤ to`, toppers ≤ 31 días para no saturar `GetByDate`).
- Reutiliza helpers existentes: `createTodayDateRange`, `localDateTimeToApiIso(value, { endOfMinute: true })` (zona UTC explícita, como todo el módulo de transacciones).

---

## 6. Plan de implementación (fases)

| Fase | Alcance | Esfuerzo |
| --- | --- | --- |
| **A — Ruta y permisos** | Registro de ruta en UI + permiso `ReadDispensingControl` (operación de datos, 5 min) · `legacyPathToAppPath` · `page.tsx` con guard + `dispensing-control-page.tsx` esqueleto (filter bar + estados vacíos) | 0.5 d |
| **B — Métricas** | `schemas.ts` · `dispensing-metrics.ts` (puro) + unit tests · `hooks.ts` (orquestación §5.3) · `metric-card.tsx` · 4 cards (AP, DP, RJ, Último cargue) | 1 d |
| **C — Denominaciones y alertas** | `denomination-table.tsx` (grid por denominación con imagen del billete) · `low-balance-alert.tsx` (umbral D2) · vacíos (sin arqueo, sin cargue, máquina sin storage) | 0.5 d |
| **D — byState + pulido** | Extensión BFF `byState` (D4) + esquema · estilo pastel 2026 coherente con el resto (glows por tono, animaciones de entrada) · E2E autenticado con Pay+ real (Prueba1: cuidar cantidades negativas legacy, backlog fase 3–4) | 0.5 d |

**Total: ~2.5 días. Backend .NET: 0 cambios.** (Solo la opción D2-C implicaría SP nuevo: descartada.)

---

## 7. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Máquina sin arqueo/cargue registrado (p. ej. nueva) | Cards DP/sin "último cargue" vacías | Estados vacíos explícitos ("Sin arqueo todavía") + DP cae a `dpTotal` de storage como referencia |
| `GetByDate` devuelve el conjunto completo | Períodos muy amplios en máquinas de alto volumen → respuesta pesada | Topper de rango a 31 días en el selector custom; los presets (hoy/24h/7d) acotan por defecto |
| Cantidades negativas legacy (Prueba1, backlog fase 3–4) | Filas de denominación con signos extraños | El reader conserva el signo solo en lecturas históricas; en el desglose, el **inicial** negativo de la base se **acota a 0** con nota (`negativeReport`, C9/C10), pero la **salida física negativa** (el conteo subió) se muestra en rojo con «Revisar conteo» en lugar de ocultarse |
| Denominaciones heredadas en `PayPad/GetStorage` (p. ej. el billete de USD 1 de C.C. Centro2) | Filas sin inventario real que alarmaban o confundían | Regla de uso compartida (`denomination-usage.ts`, C9): solo se evalúan las que la máquina trabaja hoy; el resto se lista aparte con el motivo |
| Máquina de cambio divisa (COP ⇄ USD) | Importes de monedas distintas sumados como si fueran comparables | Cálculo y agregados **por moneda** (`currencyLabels`, `multiCurrency`), títulos con etiqueta (`USD 10`) y «Importe en varias monedas» donde no hay separación posible (C8) |
| Umbral "20% de capacidad" no existe en datos | Imposible literal sin cambio de esquema | D2 (A): `minDpQuantity` (existente y editable por operador) |
| Zonas horarias | Métricas de "Hoy" desfasadas | Helpers existentes con zona UTC explícita (misma regla que Transacciones) |
