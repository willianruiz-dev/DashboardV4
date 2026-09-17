# Detección temprana de atascos (monederos/billeteros) — estudio e implementación

> **Actualizado:** 2026-09-17 — **IMPLEMENTADO (F1–F3) + CORRECCIONES POR CASO REAL (C1–C9)** dentro de *Control de dispensado*.
> **Veredicto:** **VIABLE con la API y el dashboard actuales**, sin cambios en el backend .NET ni en la base de datos.
> **Archivos nuevos:** `src/features/dispensing-control/dispensing-jams.ts` (motor puro), `src/app/api/dispensing/jams/route.ts` (BFF acotado + caché), `src/features/dispensing-control/components/jam-diagnostics.tsx` (panel), `src/features/dispensing-control/api.ts` (cliente) y extensiones en `schemas.ts`, `hooks.ts` y la página.
> **Estado de validación:** `npm run check` (TypeScript, ESLint **y la suite**) y `npm run build` **PASA** (2026-09-17). La suite `npm run fixtures:dispensing` (`scripts/dispensing-fixtures.mts`, 37 comprobaciones, sin red) reproduce los ocho escenarios citados en este documento (C2, C3, C4, C6, C8, C9) y corre **dentro de `npm run check`**, así que una regresión del motor rompe la verificación estándar.

---

## 0. Correcciones obligadas por el caso real Pay+ Inder 2 (ID 71)

El operador reportó: **«empezó a dispensar todo en monedas de 100 porque se atascó el monedero de 500»**. La primera respuesta del panel fue *«No se detectaron señales de atasco»* y, tras corregir eso, señalaba al monedero **equivocado**: culpaba al **100** (que era el que estaba entregando todo el cambio) y no al **500**. Cinco defectos concretos, ya corregidos:

| # | Defecto encontrado | Evidencia | Corrección aplicada |
| --- | --- | --- | --- |
| **C1** | **Los 30 detalles fallaron por contrato**: el DTO legacy `TransactionDetailDto` declara `CurrencyDenomination` y `Quantity` como **`int`**, y el schema del BFF exigía `string` para `currencyDenomination`. Zod rechazaba cada respuesta ⇒ `30 consulta(s) de detalle (30 sin respuesta)` ⇒ cero evidencia por denominación. | Captura del módulo + `dashboardv2-backend/Dashboard.Domain/DTOs/Business/TransactionDetailDto.cs` | Nuevo `detail-normalizer.ts`: **nunca rechaza una respuesta**; convierte números/strings, tolera `response: null`, arreglos planos y entradas basura, y reporta `detailsMalformed`. El BFF ya no parsea con Zod estricto. |
| **C2** | **`isDispensing` bloqueaba la evidencia**: el monedero de 500 estaba marcado **«No dispensa»** en Pay+ → Configurar denominaciones, y el motor solo evaluaba esa bandera ⇒ la fila 500 quedaba sin señales… y también fuera de la combinación canónica, así que la sustitución por monedas de 100 no se habría detectado. | Captura: fila «$500 — No dispensa, saldo 34, caída física 97» | La configuración **informa pero no habilita ni bloquea**. El conjunto de denominaciones que pueden entregar cambio se deduce de la **evidencia**: configuración OR caída física positiva OR unidades dispensadas OR sustituciones. Nuevas señales `sustitucion_no_configurada` y `config_inconsistente`. |
| **C3** | **El panel declaraba «limpio» estando ciego**: con 30/30 detalles fallidos el titular seguía siendo *«No se detectaron señales de atasco»*. | Captura | Nuevos campos `blind` y `failureReasons`: el titular pasa a *«Diagnóstico incompleto…»*, se muestra una alerta destructiva con el motivo sanitizado del fallo y el pie indica el método de inferencia usado. |
| **C4** | **Se culpaba al que entrega, no al que no entrega.** El 100 cobraba `devuelto_con_saldo` (sus intentos fallidos aparecían en transacciones con error) y señales físicas porque su arqueo no cuadraba: era el **único** incidente reportado, mientras el 500 atascado quedaba invisible. | Reporte del operador: «me dice atasco en de 100 mientras que es en el de 500» | Nuevo concepto de **compensación**: si una denominación entrega *más* de su parte canónica (≥ 2 unidades y ≥ 2 pagos), se marca `compensando_entrega` (peso 0), **se suprimen todas sus señales de atasco** y el titular nombra al culpable: *«…el cambio se entrega con 100»*. Las filas muestran el rol **Implicada / Compensando / Normal**. |
| **C7** | **Consulta sin máquina dejaba la pantalla bloqueada.** Al pulsar un período o escribir en el selector sin máquina elegida, el módulo mostraba «Selecciona una máquina» y **toda la barra de filtros quedaba deshabilitada**: no se podía volver a elegir una máquina sin cambiar de ruta. Causa verificada: en TanStack Query v5 una query con `enabled: false` mantiene `status: "pending"`, por lo que `isPending` es `true` sin nada cargando; el hook lo interpretaba como «cargando» y la página deshabilitaba los filtros con `disabled={isLoading && selection !== null}`. | Reporte del usuario | `isLoading` solo es verdadero con máquina seleccionada (`paypadId !== null && …`) y el `disabled` de la barra se expresa de forma explícita (`paypadId !== null && isLoading`). El estado vacío ahora aparece también al entrar (antes solo tras interactuar) y explica qué hacer. Evidencia: `QueryObserver` con `enabled:false` devuelve `status:"pending"`, `isPending:true`, `isLoading:false`. |
| **C6** | **Alerta por tendencia (predecía con el pasado en vez de mirar el presente).** En Pay+ Inder 2 el 2.000 salió como *«Posible atasco»* cuando esa denominación **entregó 17 unidades en el período y bajó 255 en el arqueo**: la única prueba era que pasó de participar en el 100 % de los pagos previos al 40 % de los recientes. Una caída parcial es una tendencia, no un atasco. | Captura del panel + reporte: «¿por qué me dice que posible atasco si hay en el momento, no si hubo?» | `participacion_perdida` pasa a **peso 0** (nunca genera incidente por sí sola), exige **participación reciente ≈ 0** (≤ 5 %, no una caída parcial), **participación previa ≥ 50 %** y **ausencia de movimiento en el arqueo**. Además, `inactiva_con_saldo` ahora exige que los pagos hayan **requerido** esa denominación (`wasRequired`): estar quieta porque nadie la necesitó no es evidencia. |
| **C5** | **El análisis exigía pulsar un botón.** Sin clic, el motor no tenía detalles y no había alerta posible: el operador veía «Sin señales» hasta analizar manualmente. | Reporte: «primero debería lanzar la alerta apenas consulte la máquina» | El análisis se **dispara automáticamente** al seleccionar máquina o cambiar el período (clave de consulta por máquina+rango, `staleTime` 5 min y caché de detalles de 30 min en el BFF). El botón pasa a **«Re-analizar»**. |

| **C8** | **Las monedas se mezclaban y aparecían denominaciones que la máquina no usa.** El operador reportó dos cosas: (a) en una máquina de cambio divisa (COP ⇄ USD) los números salían raros, y (b) en una máquina que **solo maneja pesos** (CC Centro) aparecía un billete de **USD 1** como *Implicada* / *Posible atasco* con *«Configuración contradice el arqueo»*. Causas verificadas: la combinación canónica se armaba con **todas** las denominaciones, así que un pago de **USD 100** se "planeaba" con **1 × COP 100** (mismo valor numérico) y el monedero de pesos quedaba acusado de no participar; el valor de una denominación ausente del storage era **0**; los totales de baúl sumaban pesos y dólares; y una fila heredada ($1 sin configuración, sin saldo, con un arqueo antiguo que bajó 6) entraba al análisis solo por el **histórico** de arqueos. | Reporte del usuario + capturas + fixtures `multimoneda`/`metricas-multimoneda` | El motor es **consciente de la moneda** (`denomination-currency.ts`, `idCurrency` del catálogo): la combinación canónica, la sustitución, la compensación y la participación se evalúan **dentro de la moneda del pago**; el valor sale del catálogo ∪ storage; los pagos con denominaciones de varias monedas no se combinan (`mixedCurrencyPayouts`); la conciliación por importes se desactiva declarándolo cuando el período usa varias monedas; los totales se muestran **por moneda** (nunca sumados) y cada fila lleva su etiqueta de moneda (`COP 100` vs `USD 100`). Además una denominación solo se evalúa si la máquina **la usa hoy**: configurada, con saldo en el baúl, con existencia en el último arqueo o con entregas en el período; el histórico de arqueos ya no basta y las descartadas se informan con su motivo (`ignoredDenominations`). |

| **C9** | **La fila seguía apareciendo en el «Desglose por denominaciones».** Tras C8 el billete de **USD 1** desapareció del panel de atascos, pero seguía en el desglose como un baúl más, con «Entregada (DP) **−6**» y un «USD $0» en el inventario por moneda. El desglose se construía con **todas** las filas de `PayPad/GetStorage`, sin aplicar la regla de uso. Además mostraba como entrega un valor **negativo** del arqueo. | Captura del operador: `USD $1 · Entregada (DP) −6 · Saldo 0 · Estado OK`, frente a la «Lista de Denominaciones» del dashboard antiguo (`PayPadStorageForm.js` filtra el catálogo por `x.idCurrency === paypad.idCurrency`) donde esa denominación no existe | La regla de uso se extrae a **`denomination-usage.ts`** y la aplican **los dos** paneles (desglose y motor), de modo que no puedan contradecirse. El desglose principal muestra solo inventario en uso; el resto se lista aparte con el motivo (`excludedRows`, misma idea que `ignoredDenominations`). Los valores negativos del arqueo se **acotan a 0** con la nota «arqueo negativo, se muestra 0» (`negativeReport`). Los totales y el inventario por moneda se calculan solo con lo que está en uso (desaparece el «USD $0»). |

### Por qué el 500 quedaba invisible aunque estuviera atascado

Además de la compensación, había un problema de circularidad: para saber que el 500 *debía* participar se usaba la configuración (`isDispensing`) o el movimiento en el arqueo… pero un monedero atascado **no se mueve** y en Inder 2 estaba marcado «No dispensa». Era imposible que apareciera. Ahora la existencia del módulo se deduce del **saldo en el baúl dispensador** (actual o histórico en cualquier arqueo): 34 monedas guardadas significan que hay un monedero de 500 que puede entregar, esté bien configurado o no.

Además: el tope de análisis subió de 30 a **60** transacciones (la máquina tenía 33 solo ese día) y `confirmado` ahora exige **evidencia independiente** (física o fallo explícito), no solo composición de pagos.

### Verificación del falso positivo por tendencia (fixture `usuario-actual`)

Réplica de la captura del reporte: 14 pagos, el 2.000 participa en el 100 % de los
previos y en el 40 % de los recientes, entregó 18 unidades en el período y bajó 255 en el
arqueo, sin sustituciones ni intentos fallidos.

```
HEADLINE: No se detectaron señales de atasco en la ventana analizada.
INCIDENTES: 0
d=2000 | saldo=94 | disp=18 | caída=255 | nivel=sin_evidencia score=0 | señales=[]
```

Antes de C6 el mismo dato producía *«Posible atasco · Posible atasco en la denominación
2000»*, mientras la tabla mostraba que la denominación estaba entregando normalmente.

### Verificación del caso real (fixture `compensacion`)

Máquina con el monedero de 500 atascado (34 unidades guardadas, «No dispensa»), 10 pagos
cuyo cambio de 1.000 sale como 10 × 100, dos transacciones con error devuelta cuyos
detalles también salen en 100 (24 unidades) y un arqueo del 100 que baja menos de lo
dispensado — es decir, **todo lo que antes hacía señalar al 100**:

```
HEADLINE: Atasco probable · Posible atasco en la denominación 500 — el cambio se entrega con 100
PRIMARY:  Posible atasco en la denominación 500 (probable)
d=500 | saldo=34 | compensa=no | sust=10 (no configurada) | nivel=probable score=5
        señales=[sustitucion_no_configurada, inactiva_con_saldo]
d=100 | saldo=900 | compensa=SÍ | sobre-entrega=100 | devuelto=24 | caída=150
        nivel=sin_evidencia | señales=[compensando_entrega]   ← antes: "atasco probable en 100"
```

### Verificación del caso real (fixture `inder2`)

Con la configuración exacta de la captura (500 «No dispensa», saldo 34, caída física 97, sin ninguna `Aprobada Error Devuelta`) y 12 pagos cuyo cambio de 1.500 —que solo puede armarse con 3×500— salió en 15×100:

```
HEADLINE: 1 incidente(s) de dispensado: 0 confirmado(s), 1 probable(s) y 0 en observación.
d=500 | saldo=34 | config=NO dispensa | evidencia=sí | disp=0 | caída=97 | nivel=probable score=4
        señales=[sustitucion_no_configurada, config_inconsistente]
INCIDENTE: [probable] Posible atasco en la denominación 500
```

Antes de C1–C3 el mismo escenario producía `0 incidentes` y «sin señales»: la lógica no se equivocaba al concluir, simplemente **no llegaba a mirar**. Con el caso ciego (30/30 fallos) el titular ahora es *«Diagnóstico incompleto: no se pudo leer el detalle de ninguna transacción analizada…»*.

> **Acción operativa derivada:** en Inder 2 hay que marcar el 500 como dispensador en **Pay+ → Configurar denominaciones** (hoy dice «No dispensa»). Mientras siga mal, la señal `config_inconsistente` lo advierte en cada análisis.

---

### Verificación del billete de 1 dólar en una máquina de solo pesos (escenario `cc-centro-usd1`)

Réplica de la captura reportada: máquina con COP 1.000 (20) y COP 500 (40) configurados y
con saldo, más una fila heredada de **USD 1** sin configuración y sin saldo, cuyo arqueo
anterior tenía 6 unidades y el último 0.

```
ANTES  HEADLINE: Posible atasco · Posible atasco en la denominación 1.
       d=1 | saldo=0 | config=false | evidencia=true | caída=6 | cobertura=false
           | nivel=sospecha score=1 | señales=[config_inconsistente]   → Rol «Implicada»

DESPUÉS HEADLINE: No se detectaron señales de atasco en la ventana analizada.
       desglose: COP 1000 · COP 500   ← el desglose ya no muestra el USD 1
       excluidas: USD 1 → «Sin dispensación configurada, sin saldo (DP/RJ/AP), sin cargues en
       el período y sin entregas positivas en el último arqueo ni en el período consultado.
       El último arqueo reporta −6 entregada(s): se muestra 0. Su moneda (USD) no es la del
       Pay+ (COP).»
       totales por moneda: solo COP (desaparece el «USD $0»)
```

La denominación no desaparece del panel: sale del diagnóstico de atascos y se explica en la
lista de **no evaluadas**, porque sin unidades en el baúl no hay módulo que pueda estar
atascado hoy.

### Verificación de la máquina de cambio de divisa (escenario `divisa`)

Máquina COP ⇄ USD con cuatro módulos (COP 100, COP 1.000, USD 1, USD 100) y pagos de
**USD 100** entregados con un billete de USD 100, más dos pagos de **USD 10** entregados
como 2 × USD 5.

```
ANTES  HEADLINE: Atasco probable · Posible atasco en la denominación 100.
       d=100 (COP) | saldo=200 | sust=2 | nivel=probable score=3 | señales=[sustitucion]
       …y la fila «100» de USD era indistinguible de la de COP en el panel.

DESPUÉS HEADLINE: Atasco probable · Posible atasco en la denominación USD 10 — el cambio se entrega con USD 5.
       moneda=COP | d=1000 | sust=0 | nivel=sin_evidencia
       moneda=COP | d=100  | sust=0 | nivel=sin_evidencia        ← ya no se la culpa por un pago en dólares
       moneda=USD | d=10   | sust=2 | nivel=probable  | señales=[sustitucion]
       moneda=USD | d=5    | compensa=true | señales=[compensando_entrega]
       MULTIMONEDA: true | ignoradas: 0 | pagos mezclados: 0
```

El motor **sigue detectando** la sustitución real (dentro de USD) y ahora distingue
`COP 100` de `USD 100` en la tabla y en el titular.

### Verificación de los totales por moneda y del valor negativo acotado

```
FILAS: COP 1000 (saldo 20) · COP 500 (40) · USD 10 (20) · USD 1 (0)
TOTALES POR MONEDA: [ {currencyId: 1, label: "COP", total: "40000"},
                      {currencyId: 2, label: "USD", total: "200"} ]
Entregada del USD 1 (arqueo −6): 0  + negativeReport «El último arqueo reporta −6
entregada(s): se muestra 0.»
```

La suite del repositorio comprueba además que una máquina de divisa con módulos USD **reales**
(configurados y con saldo) los mantiene visibles: la exclusión no es «moneda distinta», es
«sin ninguna señal de uso».

---

## 1. El problema, dicho sin ambigüedad

Un Pay+ no publica un evento "atasco". Lo único que existe hoy es:

| Fuente | Endpoint | Qué dice | Qué **no** dice |
| --- | --- | --- | --- |
| Estado de transacciones del período | `POST api/Transaction/GetByDate` (BFF `POST /api/transactions/search`) | `Aprobada`, `Aprobada Error Devuelta`, `Cancelada`, … con `incomeAmount`, `returnAmount`, `realAmount`, `totalAmount` | No dice *qué denominación* falló |
| Detalle de una transacción | `GET api/Transaction/{id}/Details` | `idCurrencyDenomination`, `typeOperation`, `idTypeOperation`, `quantity` | No hay endpoint por rango: **una petición por transacción**; el catálogo de valores de `idTypeOperation` **no está en el repo** (vive en BD) |
| Inventario del sistema | `GET api/PayPad/GetStorage/{id}` | `dpStored`, `dpTotal`, `isDispensing`, `minDpQuantity`, `rjStored` por denominación | Es el inventario *del sistema*, no el conteo físico |
| Conteo físico | `GET api/Tonnage/GetByPaypad/{id}` | `quantityDp`, `quantityAp`, `quantityRj`, `quantityTotal` por denominación y fecha | Solo existe cuando alguien registra un arqueo |
| Cargues | `GET api/Load/GetByPaypad/{id}` | cantidades cargadas por denominación y fecha | — |
| Alertas | `api/Alerts/Subscription` (solo CRUD de suscripciones) | Suscripción por correo a la alerta **id 1** ("escasez en baúles"), definida en el frontend | **No existe** la alerta de atasco: no hay catálogo con `GET`, ni emisión desde el Pay+ |

Conclusión: el atasco hay que **inferirlo** cruzando esas fuentes. La buena noticia es que las cuatro piezas necesarias ya están implementadas en el dashboard (storage, arqueos, cargues y el resumen `byState` de transacciones), y el detalle por transacción ya existe como endpoint.

---

## 2. Las dos preguntas concretas del negocio y sus fórmulas

### 2.1 "Hay monedas de 500 suficientes y está soltando las de 100" → atasco en el monedero de 500

Tres evidencias independientes, todas con datos existentes:

1. **Devolvió teniendo saldo** (`devuelto_con_saldo`, peso 3).
   En la ventana analizada hay operaciones de salida **fallidas** de la denominación `d`
   (`Aprobada Error Devuelta` + detalles de esa denominación) y el baúl conserva
   unidades: `dpStored(d) > 0`.
   - Si `dpStored(d) == 0` → **agotamiento**, no atasco (ya lo cubre la alerta de umbral).
   - Si `0 < dpStored(d) ≤ minDpQuantity + 10` (umbral legacy) se emite igual, pero con
     la advertencia de que el desabasto también explica el fallo y el nivel se limita a
     *sospecha* cuando es la única señal.

2. **Sustitución por denominación menor** (`sustitucion`, peso 3).
   Para cada pago aprobado se reconstruye la combinación realmente entregada
   (`Σ cantidad × valor` de los detalles de salida) y se compara con el valor que el
   sistema debía devolver (`returnAmount`). Si cuadra, se calcula la **combinación
   canónica** (menor cantidad de unidades, mayor denominación primero) con las
   denominaciones habilitadas y su saldo; si el pago se completó **sin** la denominación
   canónica y con denominaciones menores, se cuenta un evento de sustitución.
   ≥ 2 eventos distintos ⇒ patrón (evita el falso positivo de un único pago).

3. **Sin caída física** (`sin_caida_fisica`, peso 3).
   Con los **dos últimos arqueos** (`quantityDp`) y los cargues entre ellos:
   `caidaFisica(d) = quantityDp(previo, d) + cargado(previo→actual, d) − quantityDp(actual, d)`.
   Si el sistema registra movimiento (`dispensado + fallido > 0`) y `caidaFisica(d) == 0`,
   las unidades **nunca salieron del monedero**: es la firma física del atasco.
   Corroboraciones: `caida_corroborada` (bajó exactamente lo dispensado ⇒ lo fallido se
   quedó), `caida_insuficiente` (bajó menos que lo entregado), `caida_sin_registro`
   (bajó más de lo registrado: liberación manual de la obstrucción sin arqueo).

Además, un patrón temporal (`participacion_perdida`, peso 2): la denominación participaba
en los pagos previos y dejó de hacerlo en la ventana reciente conservando saldo.

### 2.2 "No sé cómo calcular el atasco en el monedero de 100 cuando manda error devuelta por monedas"

`Aprobada Error Devuelta` significa: la máquina aprobó, **intentó devolver el cambio y
falló**. Los detalles de esa transacción dicen exactamente con qué denominaciones lo
intentó. La receta es:

```
fallidos(d)  = Σ |quantity| de detalles de d con operación fallida
               (o sin nombre legible) dentro de transacciones con estado de error y devolución > 0
disponible(d) = dpStored(d) del storage
si fallidos(d) ≥ 2 y disponible(d) > 0            → devuelto_con_saldo
si además caidaFisica(d) == 0 en la ventana del arqueo → sin_caida_fisica   ⇒ atasco confirmado
si disponible(d) == 0                              → agotamiento (cargue), no atasco
```

Reparto de responsabilidad entre señales: si **una sola** denominación concentra los fallos
y la caída física es 0, el atasco es del **monedero de esa denominación**; si los fallos se
reparten entre varias denominaciones sin concentración y el período acumula ≥ 3
`Aprobada Error Devuelta`, el incidente se marca como **ruta de salida común**
(`rafaga_salida`, peso 2) → revisar rodillos/sensor/boca de entrega antes que un módulo
concreto.

---

## 3. Arquitectura implementada

```
┌───────────────────────────── Navegador (panel «Detección de atascos») ─────────────────────────────┐
│ useDispensingMetrics  ─┬─ storage / arqueos / cargues / byState (queries ya existentes)            │
│                        └─ sources → computeJamDiagnostics(...)  ← motor PURO (sin red)             │
│ useDispensingJamScan ───── POST /api/dispensing/jams  (solo al pulsar «Analizar atascos»)          │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                          ┌─────────────▼────────────── BFF Next.js (nuevo) ──────────────┐
                          │ 1. Transaction/GetByDate (DTO legacy, sin paginación)          │
                          │ 2. Prioriza: error devuelta → aprobada con devolución → resto │
                          │ 3. Detalles con concurrencia 5 + caché por id (30 min, 600)    │
                          │ 4. Devuelve estado + importes + detalles por denominación      │
                          └────────────────────────────────────────────────────────────────┘
```

| Elemento | Archivo | Notas |
| --- | --- | --- |
| Uso de cada denominación | `src/features/dispensing-control/denomination-usage.ts` | `isDenominationInUse` + motivo canónico: decide si la denominación entra al desglose y al motor. Un valor negativo de arqueo no es evidencia de uso. |
| Moneda de cada baúl | `src/features/dispensing-control/denomination-currency.ts` | Índice `idCurrencyDenomination` → moneda y valor desde el catálogo ∪ storage; etiqueta corta (`COP`, `USD`) para la UI. Sin él, pesos y dólares se sumaban y dos denominaciones del mismo valor eran indistinguibles. |
| Motor puro | `src/features/dispensing-control/dispensing-jams.ts` | Sin red ni React: `computeJamDiagnostics`, `classifyJamOperation`, `canonicalPayoutMix`, `reconcileDetailInterpretation`, `JAM_THRESHOLDS`, `jamSignalWeights/Labels`, tipos. Testeable con Node (`--experimental-strip-types`). |
| BFF acotado | `src/app/api/dispensing/jams/route.ts` | `POST { paypadId, from, to, maxTransactions ≤ 60 }` (30 por defecto). Cachea detalles inmutables por `id`; 404 = sin detalles; un detalle ilegible no tumba el diagnóstico (`detailsFailures`). |
| Cliente + caché | `src/features/dispensing-control/api.ts`, `hooks.ts` | `useDispensingJamScan` es manual (`enabled` solo tras pulsar analizar), `staleTime` 5 min, `refetchOnWindowFocus: false`. |
| Panel | `src/features/dispensing-control/components/jam-diagnostics.tsx` | Banner por incidente con evidencia y acción sugerida, tabla/​cards de evidencia por denominación, advertencias y pie con ventana analizada y lectura del detalle. |
| Página | `components/dispensing-control-page.tsx` | Inyecta el panel entre las tarjetas y el desglose de denominaciones; al cambiar filtros se invalida el análisis. Acepta `?paypad=<id>` para preseleccionar la máquina (enlace desde la alerta del inicio). |
| Alerta del inicio | `src/app/api/dispensing/return-alerts/route.ts`, `components/return-alerts-home.tsx`, `hooks.ts` (`useDispensingReturnAlerts`) | Errores `Aprobada Error Devuelta` del día en curso por máquina, con sondeo cada 30 s y caché corta en el BFF (ver §9). |

### Sobre los nombres de operación (`typeOperation`)

El catálogo de `idTypeOperation`/`typeOperation` **no existe en el repositorio** (es dato de
BD). El motor no lo asume:

1. Clasifica por palabras clave con prioridad **fallo → aceptación → salida**
   (`Devuelta Error` = intento fallido; `Devuelta` = salida del dispensador; `Recibida` =
   aceptador, se ignora).
2. **Reconcilia con los importes**: si la suma de los detalles de salida de una transacción
   aprobada cuadra con `returnAmount` (el cambio que sale del dispensador), la lectura
   queda **verificada**; si cuadra con `incomeAmount`, se marca **invertida** y se
   desactivan sustitución y participación en lugar de inventar evidencia.
3. Si el nombre no es clasificable, **deduce el rol de cada `idTypeOperation` a partir de
   los importes** (`inferOperationRoles`): la operación cuyo valor acumulado sigue a
   `returnAmount` es de dispensado y la que sigue a `incomeAmount − returnAmount` es de
   aceptación (comparación con 5 % de tolerancia). El método usado se publica en
   `interpretation.roleMethod` y el panel lo indica.
4. Como último recurso, atribuye por estado (error ⇒ intento fallido; aprobada ⇒
   entregado) y **solo** cuando la transacción tiene devolución; esas unidades se cuentan
   en `inferredUnits` y el panel lo advierte.

---

## 4. Reglas, pesos y umbrales (todo explícito)

| Señal | Peso | Condición |
| --- | --- | --- |
| `devuelto_con_saldo` | 3 | `fallidos(d) ≥ 2` (umbral) y `dpStored(d) > 0` |
| `sustitucion` | 3 | ≥ 2 pagos completados sin la denominación canónica teniendo saldo |
| `sin_caida_fisica` | 3 | `sistemaTotal(d) > 0` y `caidaFisica(d) == 0` en la ventana del arqueo |
| `participacion_perdida` | 0 | Participación reciente ≈ 0 (≤ 5 %) vs ≥ 50 % previa, con saldo, **sin movimiento en el arqueo** y ≥ 3 pagos por segmento. Contexto: nunca genera incidente sola |
| `caida_corroborada` | 2 | `fallidos(d) ≥ 2`, `dispensado(d) > 0` y `caidaFisica(d) == dispensado(d)` |
| `caida_insuficiente` | 1 | `caidaFisica(d) < dispensado(d)` |
| `caida_sin_registro` | 1 | `caidaFisica(d) > sistemaTotal(d)` (extracción/liberación manual) |
| `rafaga_salida` | 2 | ≥ 3 `Aprobada Error Devuelta` en el período (nivel máquina) |
| `sustitucion_no_configurada` | 3 | Igual, pero la denominación está marcada «No dispensa»: posible atasco **o** configuración desactualizada |
| `inactiva_con_saldo` | 2 (1 si el arqueo está fuera del período) | Fue **requerida** por los pagos (hubo sustitución), no se movió en el intervalo de arqueo y conserva saldo; la máquina sí movió otras denominaciones |
| `rechazo_con_unidades` | 1 | El baúl de rechazo tiene unidades y hubo rechazos/intentos fallidos |
| `config_inconsistente` | 1 | Marcada «No dispensa», pero el arqueo muestra movimiento real del baúl |
| `compensando_entrega` | 0 | Entregó más que su parte canónica (≥ 2 unidades, ≥ 2 pagos): **suprime el resto de señales de esa denominación** |
| `descuadre_inventario` | 0 | `caidaFisica(d) < 0` (informativo; invalida la caída como evidencia) |

Niveles: `sin_evidencia` → `sospecha` (score ≥ 1) → `probable` (≥ 3) → `confirmado`
(≥ 6 con ≥ 2 señales, una señal núcleo **y una evidencia independiente**: física
—`sin_caida_fisica`, `caida_*`— o fallo explícito de entrega —`devuelto_con_saldo`—).
Una denominación **compensadora nunca recibe nivel de atasco**: está entregando, no fallando.

### Regla de oro de la temporización

> El motor alerta con el **estado actual**: transacciones del período consultado o del
> último intervalo de arqueos. Las **tendencias** (caídas de participación, uso
> decreciente) son contexto con peso 0 y nunca generan un incidente por sí solas.

### Regla de oro del uso (¿la máquina trabaja esta denominación?)

> Una denominación pertenece al inventario de la máquina solo si hay **alguna señal positiva**
> de que la trabaja: configuración de dispensado, umbral configurado, saldo (DP/RJ/AP),
> cargues del período, entregas/rechazos **positivos** del último arqueo, o entregas/intentos
> registrados en los detalles consultados. Un valor **negativo** del arqueo (artefacto legacy
> de cantidades firmadas) no cuenta como uso. Vale igual para el desglose de saldos y para el
> motor de atascos: `denomination-usage.ts` es la única fuente de la regla.

### Regla de oro de la moneda

> Todo cálculo (combinación canónica, sustitución, compensación, participación, saldos y
> totales) vive **dentro de una moneda**. Los importes de monedas distintas **nunca** se
> suman ni se comparan — tampoco en las tarjetas AP/DP/RJ ni en la alerta del inicio —, y una
> denominación solo se evalúa si la máquina **la usa hoy**:
> configurada, con saldo, con existencia en el último arqueo o entregando en el período.
> El histórico de arqueos por sí solo **no** alcanza para alarmar.

Consecuencias: (1) `denomination-currency.ts` resuelve la moneda con el `idCurrency` del
catálogo (`/api/masters/denominations`) y la etiqueta (`COP`, `USD`); (2) cada fila e
incidente publica `currencyId`/`currencyLabel` y los títulos usan `USD 10`, no `10`;
(3) los totales del baúl se publican por moneda (`storageTotalsByCurrency`), la tarjeta
«DP · Real entregado» aclara que el total del arqueo es el del backend y una máquina multimoneda
(`multiCurrency`, con sus `currencyLabels`) muestra un aviso arriba de las tarjetas y la nota
«suma monedas distintas (no comparable)» en las de AP/RJ; la alerta del inicio sustituye el
importe por «Importe en varias monedas» (§9);
(4) `ignoredDenominations` documenta qué quedó fuera y por qué, en lugar de omitirlo.

### Regla de oro de la atribución

> El módulo atascado es el que **debía participar y no participa**; el que **entrega de
> más** está tapando el hueco. Nunca se culpa al que compensa.

Consecuencias en el motor: (1) las señales físicas (`sin_caida_fisica`,
`caida_insuficiente`, `inactiva_con_saldo`) y `devuelto_con_saldo` solo se evalúan para
denominaciones no compensadoras; (2) el incidente principal (`primary`) nombra al
sospechoso y menciona explícitamente qué denominación está compensando; (3) el titular
del panel es el incidente principal, no un conteo genérico. `JAM_THRESHOLDS` se puede sobreescribir
por parámetro; la evolución natural es leerlos de `PayPadConfiguration.extraDataJson`
(key/value, sin migración).

**Validez de la caída física** (importante): solo se usa como evidencia cuando el intervalo
de los dos arqueos está dentro del período solicitado y, si el análisis quedó truncado por
el tope de transacciones, dentro de la ventana efectivamente analizada. En el panel se
muestra "cubierta por el análisis" o "fuera de la ventana analizada" en cada fila.

---

## 5. Validación local (suite del repositorio)

```bash
npm run check                   # typecheck + lint + la suite de dispensado (sin red, sin sesión)
npm run fixtures:dispensing     # sólo la suite, si se quiere iterar sobre un escenario
```

Ocho escenarios con aserciones (37 comprobaciones; el proceso termina con código 1 si algo
falla). Cada uno corresponde a un caso reportado por el operador o a un falso positivo ya
corregido, así que la suite es la red de seguridad de C2–C9: `usuario-actual`, `compensacion`,
`inder2`, `jam`, `ciego`, `cc-centro-usd1`, `divisa` y `alerta-inicio`.

### Escenario clásico del motor (50.000 y 500)

Escenario `jam` (sin red): 6 pagos de 50.000; los tres primeros usan el billete de
50.000, los tres siguientes se completan con 2×20.000 + 1×10.000; dos transacciones
`Aprobada Error Devuelta` con fallos en **500** (monedas) y una con fallo en 20.000; dos
arqueos donde los baúles de 50.000 y 500 **no bajan** y los demás sí. La suite lo ejecuta tal
cual y comprueba niveles, ráfaga y cobertura de la caída física.

| Denominación | Saldo | No entregado | Dispensado | Sustituciones | Caída física | Nivel | Señales |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 50.000 | 5 | 0 | 3 | 3 | 0 (cubierta) | **confirmado** | `sustitucion` + `sin_caida_fisica` |
| 500 | 140 | 5 | 0 | 0 | 0 (cubierta) | **confirmado** | `devuelto_con_saldo` + `sin_caida_fisica` |
| 20.000 | 12 | 1 | 6 | 0 | 6 (cubierta) | sin evidencia | (1 fallo aislado: no supera el mínimo) |
| 10.000 | 25 | 0 | 4 | 0 | 4 (cubierta) | sin evidencia | — |
| 100 | 310 | 0 | 25 | 0 | 25 (cubierta) | sin evidencia | — |

Incidentes: *Posible atasco en la denominación 50000* (confirmado), *500* (confirmado) y
*Ráfaga de «Aprobada Error Devuelta»* (sospecha). Reconciliación del detalle:
`returnMatches: 6`, `inverted: false` ⇒ lectura verificada contra `returnAmount`.

---

## 6. Fases

| Fase | Alcance | Estado |
| --- | --- | --- |
| **F1 — Motor** | Señales, pesos, niveles, umbrales, reconciliación de operaciones, tipos | **Implementado** |
| **F2 — BFF acotado** | `POST /api/dispensing/jams` con priorización, concurrencia y caché de detalles | **Implementado** |
| **F3 — Panel + orquestación** | Panel de incidentes, tabla de evidencia, análisis manual cacheado, invalidación por filtros | **Implementado** |
| **F4 — Prueba con datos reales** | Repetir el análisis en Pay+ Inder 2 (ID 71) tras desplegar C1–C3 y confirmar el incidente del monedero de 500; verificar los valores reales de `typeOperation`/`idTypeOperation`, calibrar `JAM_THRESHOLDS` y confirmar la ventana de arqueos con Pay+ Prueba1 | **Pendiente E2E (B-04/B-05)** — el modo de fallo ya está reproducido y cubierto por fixtures |
| **F5 — Alerta real del Pay+** | *Único caso que exige backend*: insertar la alerta (p. ej. id 2, «Atasco en monedero») en el catálogo, emitirla desde el Pay+ con la denominación y notificar por suscripción (mismo flujo del `AlertsController`/`Subscription`) | Documentado, no iniciado |

---

## 7. Riesgos y límites (declarados, no escondidos)

| Riesgo | Impacto | Mitigación implementada |
| --- | --- | --- |
| `typeOperation` con nombres desconocidos en producción | Escenario del catálogo real (no visible en el repo) | Clasificación por palabras clave + reconciliación con importes + `inferredUnits` visible + advertencia en el panel |
| Algoritmo de entrega del Pay+ distinto al canónico (p. ej. conserva billetes grandes) | Falso positivo de `sustitucion` | Se exige patrón (≥ 2 pagos) y el panel muestra el evento; nunca se declara "confirmado" solo por sustitución |
| Arqueos espaciados o sin registrar | `caidaFisica` no disponible | La fila indica "Sin 2 arqueos"; las demás señales siguen operando |
| Cantidades negativas legacy (Prueba1) | Números raros en detalles | Se conserva el signo solo al leer y se usa `|quantity|` para unidades; el descuadre negativo invalida la caída física (`descuadre_inventario`) |
| Costo de `Transaction/{id}/Details` (una petición por transacción) | Carga del API legado | Análisis **manual**, tope de 30 transacciones por defecto (máx. 60), concurrencia 5, caché de 30 min por `id` (600 entradas) y `staleTime` de 5 min |
| Ventana truncada | Evidencia parcial | `truncated` + advertencia explícita y regla de cobertura de la caída física |
| Falsos positivos por desabasto | Ruido operativo | `dpStored == 0` ⇒ agotamiento (no atasco); en el umbral de recarga la única señal de devolución se limita a *sospecha* |
| Cantidades negativas del arqueo en el desglose | Números que parecen entregas | Se acotan a 0 y la fila declara el valor reportado (`negativeReport`); el signo se conserva solo para lectura, como en los cargues/arqueos |
| Configuración obsoleta: una denominación marcada «Dispensa» sin módulo físico (p. ej. USD 1 en una máquina de solo pesos) | Fila sin evidencia que confunde al operador | La fila solo se evalúa si además tiene saldo, existencia en el último arqueo o entregas en el período; sin ellas queda vacía (peso 0) y su acción remite a Pay+ → Configurar denominaciones. Las que no la usan hoy se listan aparte con el motivo (`ignoredDenominations`) |

---

## 8. Qué falta para cerrar (y qué NO se puede con lo actual)

- **Se puede hoy:** detectar, atribuir por denominación, mostrar evidencia, sugerir acción y
  priorizar la revisión en sitio. Cero cambios de backend.
- **Sí se puede hoy sin backend nuevo:** avisar en el inicio del panel las máquinas con errores
  de devuelta del día en curso, con sondeo cada 30 s (ver §9).
- **No se puede hoy:** notificar automáticamente por correo ante un atasco (la alerta id 1
  es de "escasez en baúles" y el `AlertsController` solo expone suscripciones) ni recibir
  un pulso instantáneo del Pay+ (no hay WebSocket/SignalR, B-01). Requiere F5.
- **Pendiente de datos reales:** confirmar los nombres de `typeOperation`, la frecuencia con
  que se registran arqueos y calibrar los umbrales (`JAM_THRESHOLDS`) con Prueba1.

---

## 9. Alerta del inicio: errores de devuelta (`Aprobada Error Devuelta`)

El inicio del panel (`/dashboard`, el que solo tenía «Bienvenido») ahora muestra **arriba de
todo** las máquinas que hoy registran transacciones en estado `Aprobada Error Devuelta`. Es la
señal más barata y más temprana disponible: no necesita `Transaction/{id}/Details` ni arqueos, y
por eso puede refrescarse sola todo el día.

```
Navegador (/dashboard)                        BFF Next.js (/api/dispensing/return-alerts)
useDispensingReturnAlerts ── sondeo 30 s ──▶ 1. PayPad            (caché 60 s)
                                             2. Transaction/GetByDate { from, id, to }  (caché 20 s por
                                                máquina+rango, concurrencia 5)
                                             3. Resumen por máquina: conteo, importe, último error
```

### 9.1 Contrato

| Aspecto | Valor |
| --- | --- |
| Petición | `POST /api/dispensing/return-alerts` con `{ from, to, paypadId }` (`paypadId: null` = todas las máquinas) |
| Respuesta | `{ from, to, generatedAt, machines[], partialFailures }`; `Cache-Control: no-store` |
| Por máquina | `paypadId`, `paypadName`, `transactions` (total del día), `approvedCount`, `errorCount`, `errorTotal` (suma de `incomeAmount` de las transacciones en error), `errorTotalIncomplete`, `errorTotalMixedCurrency`, `currencyLabels`, `lastErrorAt` |
| Orden | `errorCount` desc, luego `lastErrorAt` desc (las máquinas que más fallan van primero) |
| Rango | Día local en curso: `00:00` → `23:59:59.999` (en Bogotá, `05:00Z` → `04:59:59.999Z` del día siguiente) |
| Permisos | `ReadTransactions` **y** `ReadPayPads`; sin ellos la sección no se renderiza |

### 9.2 «Tiempo real» sin contrato realtime (B-01)

El backend legado no expone WebSocket/SignalR, así que el tiempo real se resuelve con **sondeo
acotado del navegador**: cada 30 s (`RETURN_ALERTS_REFRESH_MS`), solo con la pestaña visible y
sin `refetch` al enfocar (`refetchOnWindowFocus: false`) para no duplicar vueltas. Para que el
sondeo no castigue al API:

1. **Caché por máquina + rango de 20 s** en el BFF: varias vueltas de varias personas comparten
   la misma respuesta (Map acotado a 200 entradas).
2. **Caché del listado de Pay+ de 60 s** (antes se pedía en cada vuelta).
3. **Concurrencia 5** (`src/lib/server/concurrency.ts`, compartido con `/api/dispensing/jams`).
4. Una máquina ilegible **no oculta** a las demás: se cuenta en `partialFailures` y el pie lo
   indica.
5. El rango se recalcula cuando cambia el día local, de modo que una pestaña abierta toda la
   noche pasa sola al día nuevo sin recargar.

### 9.3 Presentación

- Una **tarjeta pequeña por máquina** con errores: nombre, ID, cantidad de errores, importe total
  (`errorTotal`) y «último error hace …». Se muestran **solo** máquinas con `errorCount > 0`.
- **Máquinas multimoneda (cambio divisa):** si el baúl de la máquina trabaja hoy más de una
  moneda, la tarjeta **no muestra un importe** —que estaría sumando COP y USD— sino
  «Importe en varias monedas (COP, USD)», y el aviso emergente dice lo mismo. La moneda se
  resuelve con `summarizeMachineCurrencies` (misma regla de uso de C9) y **solo** para las
  máquinas que acumularon errores, con caché de 60 s y un tope de 10 consultas de baúl por
  vuelta (`MAX_STORAGE_LOOKUPS`): el costo extra del sondeo es marginal y acotado.
- Cuando el contador de una máquina **sube** entre dos vueltas del sondeo se emite un aviso
  emergente (`toast`) con máquina, cantidad nueva y total del día: es la alerta «por encima de
  todo» sin salir del inicio.
- Sin errores el inicio no queda vacío: indica cuántas máquinas se consultaron y, si hubo,
  cuántas no respondieron.
- Cada tarjeta enlaza a
  `/dashboard/transactions/dispensing-control?paypad=<id>`, que **preselecciona** la máquina con
  el período «hoy» y dispara el análisis de atascos automáticamente (C5). Así el aviso del inicio
  se encadena con el diagnóstico por denominación.
- El pie declara la fuente, la hora de la última consulta y la cadencia.

### 9.4 Límites (declarados)

- El estado `Aprobada Error Devuelta` **no dice qué denominación falló**: eso lo aporta el motor
  de atascos al abrir la máquina. Aquí se cuenta el error, no se atribuye.
- Es un conteo del registro del backend, no un evento instantáneo del Pay+ (sin B-01 no hay
  pulso): el retraso máximo es la cadencia del sondeo más la caché del BFF (≤ 50 s).
- `errorTotal` es la suma de `incomeAmount` de las transacciones en estado de error: si algún
  importe no se puede interpretar se marca `errorTotalIncomplete` y, si la máquina opera varias
  monedas, no se presenta como importe comparable.
- La alerta no sustituye la notificación por correo (F5), que sigue requiriendo backend.
