# Viabilidad y diseño — Módulo "Dispensing Control"

> **Actualizado:** 2026-09-17 — **IMPLEMENTADO (fases A–D)**
> **Veredicto:** **VIABLE**. El ~90% de los datos se resuelve con endpoints ya existentes (frontend + BFF). **Cero cambios en el backend .NET** para el núcleo; 1 extensión BFF de ~15 líneas (resumen por estado, ya aplicada) y 1 registro de ruta en datos (vía UI, sin código).
> **Estado del código:** implementado en `src/features/dispensing-control/` + ruta `/dashboard/transactions/dispensing-control`. **Sin operaciones de datos**: el acceso SuperAdmin se resuelve en el frontend por nombre de rol (ítem inyectado en el sidebar + guard de página). Pendiente: validación E2E autenticada con Pay+ real.

### Decisiones resueltas (2026-09-17)

- **D1 — Acceso SuperAdmin:** **resuelto en el frontend por nombre de rol** (`isSuperAdminRole` en `src/lib/roles/super-admin.ts`, normaliza `SuperAdmin`/`super admin`/`super-admin`, e incluye `root` como super-rol legacy, igual que la página de Usuarios). El sidebar inyecta el ítem para ese rol (`withDispensingControl` en `dashboard-navigation.ts`) y la página aplica el mismo guard. **Cero operaciones de datos, cero cambios al API.** Si en el futuro se crea la ruta en datos para el rol, el ítem no se duplica.
- **D2 — Umbral de alerta:** `minDpQuantity` existente (con la tolerancia legacy de +10 unidades). Opción B (porcentaje sobre capacidad en `extraDataJson`) queda como evolución.
- **D3 — Tarjeta DP:** último arqueo (físico) con subtítulo de fecha; sin arqueo, referencia del inventario actual (storage).
- **D4 — byState:** extensión BFF aplicada (`summary.byState` en `src/app/api/transactions/search/route.ts`).
- **D5 — "Cantidad Entregada":** `quantityDp` del último arqueo; sin arqueo, inventario actual (DP).

---

## 1. Mapeo de datos: cada métrica → fuente real

Toda la evidencia proviene de código actual (frontend V4 + backend legado consumido por el BFF).

| Métrica del módulo | Fuente (endpoint existente) | Campos | Precisión |
| --- | --- | --- | --- |
| **AP (valor que el sistema dice que se debió entregar, período)** | `POST /api/transactions/search` (BFF) → internally `Transaction/GetByDate` | Transacciones con `stateTransaction === "Aprobada"`: `incomeAmount − returnAmount` (misma fórmula del `summary` actual del BFF) | **Exacta** |
| **RJ (período, por estado)** | Ídem | Transacciones con `stateTransaction === "Aprobada Error Devuelta"` | **Exacta** (requiere extensión `byState` del BFF, §4-D4) |
| **DP (valor real entregado)** | `GET /api/PayPad/Tonnage/GetByPaypad/{id}` (arqueos) | Último arqueo: `totalDp` + `details[].quantityDp` por denominación | **Exacta** (física, al momento del último arqueo) |
| **Saldo actual por denominación (baúles)** | `GET /api/PayPad/GetStorage/{id}` | `dpStored`/`dpTotal` (dispensador), `apStored`/`apTotal` (aceptadores), `rjStored`/`rjTotal` (rechazo) | **Exacta** (inventario del sistema) |
| **Umbral de alerta** | Ídem (storage) | `minDpQuantity` por denominación (editable hoy en "Configurar denominaciones"). El backend legado ya alerta con `DpStored <= MinDpQuantity + 10` | **Exacta** (alternativa al "20% de capacidad", §4-D2) |
| **Tiempo desde último cargue** | `GET /api/Load/GetByPaypad/{id}` | `max(loads[].dateCreated)` | **Exacta** |
| **Cargada por denominación (período)** | Ídem (loads) | `Σ loads[].details[].quantity` con `dateCreated ∈ [from, to]` | **Exacta** |
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
src/app/dashboard/transactions/dispensing-control/
  page.tsx                      # Server component: guard de permiso + render del cliente

src/features/dispensing-control/
  schemas.ts                    # Tipos Zod: filtros, métricas, filas de denominación
  api.ts                        # Reusa searchTransactions / storage / tonnages / loads
                                # (nada nuevo salvo re-export de query keys)
  dispensing-metrics.ts         # FUNCIÓN PURA (testeable): computeDispensingMetrics(...)
  hooks.ts                      # useDispensingMetrics, presets de tiempo, elapsed
  components/
    dispensing-control-page.tsx # Composición general + estados (pending/error/empty)
    dispensing-filters.tsx      # Select Pay+ + presets Hoy/24h/7d + rango custom
    metric-card.tsx             # Card reutilizable (título, valor, ícono, tono, sub-texto)
    denomination-table.tsx      # Grid: Cargada / Entregada / Rechazada / Saldo + alerta por fila
    low-balance-alert.tsx       # <Alert type="warning" message="Baúl agotándose"/> por fila
```

Cambios transversales pequeños:

| Archivo | Cambio |
| --- | --- |
| `src/lib/navigation/dashboard-navigation.ts` | Añadir al mapa `legacyPathToAppPath`: `"/Admin/Transactions/DispensingControl": "/dashboard/transactions/dispensing-control"` (el path legado debe coincidir con el registro de ruta creado en el módulo Rutas) |
| `src/app/api/transactions/search/route.ts` | (Opcional, D4) Extender `createSummary` con `byState` |
| `src/features/transactions/schemas.ts` | (Opcional, D4) Extender `transactionSummarySchema` con el mapa `byState` |

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
| **D3** | Semántica de la tarjeta **DP** ("valor real entregado") | A) Último arqueo `totalDp` (físico) + subtítulo "Al último arqueo: fecha" · B) `dpTotal` de storage (inventario actual) · C) Transacciones exitosas del período | **A** (es "real"), con B como subtítulo de referencia |
| **D4** | Desglose por estado del período (RJ por `"Aprobada Error Devuelta"`) | A) Extensión BFF `byState` (~15 líneas, sin .NET) · B) Paginar `items` (pageSize≤100) en el cliente — inviable para períodos grandes | **A** |
| **D5** | Columna "Cantidad Entregada" de la tabla de denominaciones | A) `quantityDp` del último arqueo por denominación (físico) · B) Delta aproximado `cargada + DP_anterior − DP_actual` (requiere 2 arqueos) | **A**; la variante por período (B) queda como extensión |

---

## 5. Lógica y orquestación

### 5.1 Formulas (máquina `M`, período `[from, to]`, ahora `t`)

```
AP   = Σ neto(t)   donde t.estado = "Aprobada"                        [transacciones, período]
RJ   = Σ neto(t)   donde t.estado = "Aprobada Error Devuelta"         [transacciones, período]
neto(t) = incomeAmount(t) − returnAmount(t)                           [misma fórmula del BFF]

DP   = últimoArqueo(M).totalDp                                         [arqueos, físico]
AP_físico = últimoArqueo(M).totalAp     RJ_físico = últimoArqueo(M).totalRj

Cargada(d)  = Σ carga.detalle.cantidad(d)  donde carga.fecha ∈ [from, to]   [cargues]
Saldo(d)    = storage(M, d).dpStored     (valor: storage(M, d).dpTotal)     [storage]
Alerta(d)   = storage(M, d).isDispensing && storage(M, d).dpStored <= storage(M, d).minDpQuantity (+10 tol. legacy)

últimoCargue = max(carga.fecha) ;  transcurrido = t − últimoCargue
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
  loadedInRange: number;    // Cargada (período)
  delivered: number;        // Entregada (DP último arqueo)
  rejected: number;         // Rechazada (RJ último arqueo)
  balance: number;          // Saldo actual (dpStored)
  balanceValue: string;     // dpTotal
  isDispensing: boolean;
  minDpQuantity: number;
  low: boolean;             // saldo <= umbral
}
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
| Cantidades negativas legacy (Prueba1, backlog fase 3–4) | Filas de denominación con signos extraños | El reader ya conserva el signo solo en lecturas históricas; mostrar verbatim igual que el legacy |
| Umbral "20% de capacidad" no existe en datos | Imposible literal sin cambio de esquema | D2 (A): `minDpQuantity` (existente y editable por operador) |
| Zonas horarias | Métricas de "Hoy" desfasadas | Helpers existentes con zona UTC explícita (misma regla que Transacciones) |
