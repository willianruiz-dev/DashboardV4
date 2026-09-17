# Detección temprana de atascos (monederos/billeteros) — estudio e implementación

> **Actualizado:** 2026-09-17 — **IMPLEMENTADO (F1–F3) + CORRECCIONES POR CASO REAL (C1–C5)** dentro de *Control de dispensado*.
> **Veredicto:** **VIABLE con la API y el dashboard actuales**, sin cambios en el backend .NET ni en la base de datos.
> **Archivos nuevos:** `src/features/dispensing-control/dispensing-jams.ts` (motor puro), `src/app/api/dispensing/jams/route.ts` (BFF acotado + caché), `src/features/dispensing-control/components/jam-diagnostics.tsx` (panel), `src/features/dispensing-control/api.ts` (cliente) y extensiones en `schemas.ts`, `hooks.ts` y la página.
> **Estado de validación:** TypeScript, ESLint y build **PASA** (2026-09-17) + tres fixtures locales del motor y uno del normalizador (`node --experimental-strip-types`): escenario de sustitución/devolución, **máquina real Pay+ Inder 2 (ID 71)** y caso ciego. La prueba E2E autenticada sigue pendiente (B-04/B-05 del backlog).

---

## 0. Correcciones obligadas por el caso real Pay+ Inder 2 (ID 71)

El operador reportó: **«empezó a dispensar todo en monedas de 100 porque se atascó el monedero de 500»**. La primera respuesta del panel fue *«No se detectaron señales de atasco»* y, tras corregir eso, señalaba al monedero **equivocado**: culpaba al **100** (que era el que estaba entregando todo el cambio) y no al **500**. Cinco defectos concretos, ya corregidos:

| # | Defecto encontrado | Evidencia | Corrección aplicada |
| --- | --- | --- | --- |
| **C1** | **Los 30 detalles fallaron por contrato**: el DTO legacy `TransactionDetailDto` declara `CurrencyDenomination` y `Quantity` como **`int`**, y el schema del BFF exigía `string` para `currencyDenomination`. Zod rechazaba cada respuesta ⇒ `30 consulta(s) de detalle (30 sin respuesta)` ⇒ cero evidencia por denominación. | Captura del módulo + `dashboardv2-backend/Dashboard.Domain/DTOs/Business/TransactionDetailDto.cs` | Nuevo `detail-normalizer.ts`: **nunca rechaza una respuesta**; convierte números/strings, tolera `response: null`, arreglos planos y entradas basura, y reporta `detailsMalformed`. El BFF ya no parsea con Zod estricto. |
| **C2** | **`isDispensing` bloqueaba la evidencia**: el monedero de 500 estaba marcado **«No dispensa»** en Pay+ → Configurar denominaciones, y el motor solo evaluaba esa bandera ⇒ la fila 500 quedaba sin señales… y también fuera de la combinación canónica, así que la sustitución por monedas de 100 no se habría detectado. | Captura: fila «$500 — No dispensa, saldo 34, caída física 97» | La configuración **informa pero no habilita ni bloquea**. El conjunto de denominaciones que pueden entregar cambio se deduce de la **evidencia**: configuración OR caída física positiva OR unidades dispensadas OR sustituciones. Nuevas señales `sustitucion_no_configurada` y `config_inconsistente`. |
| **C3** | **El panel declaraba «limpio» estando ciego**: con 30/30 detalles fallidos el titular seguía siendo *«No se detectaron señales de atasco»*. | Captura | Nuevos campos `blind` y `failureReasons`: el titular pasa a *«Diagnóstico incompleto…»*, se muestra una alerta destructiva con el motivo sanitizado del fallo y el pie indica el método de inferencia usado. |
| **C4** | **Se culpaba al que entrega, no al que no entrega.** El 100 cobraba `devuelto_con_saldo` (sus intentos fallidos aparecían en transacciones con error) y señales físicas porque su arqueo no cuadraba: era el **único** incidente reportado, mientras el 500 atascado quedaba invisible. | Reporte del operador: «me dice atasco en de 100 mientras que es en el de 500» | Nuevo concepto de **compensación**: si una denominación entrega *más* de su parte canónica (≥ 2 unidades y ≥ 2 pagos), se marca `compensando_entrega` (peso 0), **se suprimen todas sus señales de atasco** y el titular nombra al culpable: *«…el cambio se entrega con 100»*. Las filas muestran el rol **Implicada / Compensando / Normal**. |
| **C5** | **El análisis exigía pulsar un botón.** Sin clic, el motor no tenía detalles y no había alerta posible: el operador veía «Sin señales» hasta analizar manualmente. | Reporte: «primero debería lanzar la alerta apenas consulte la máquina» | El análisis se **dispara automáticamente** al seleccionar máquina o cambiar el período (clave de consulta por máquina+rango, `staleTime` 5 min y caché de detalles de 30 min en el BFF). El botón pasa a **«Re-analizar»**. |

### Por qué el 500 quedaba invisible aunque estuviera atascado

Además de la compensación, había un problema de circularidad: para saber que el 500 *debía* participar se usaba la configuración (`isDispensing`) o el movimiento en el arqueo… pero un monedero atascado **no se mueve** y en Inder 2 estaba marcado «No dispensa». Era imposible que apareciera. Ahora la existencia del módulo se deduce del **saldo en el baúl dispensador** (actual o histórico en cualquier arqueo): 34 monedas guardadas significan que hay un monedero de 500 que puede entregar, esté bien configurado o no.

Además: el tope de análisis subió de 30 a **60** transacciones (la máquina tenía 33 solo ese día) y `confirmado` ahora exige **evidencia independiente** (física o fallo explícito), no solo composición de pagos.

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
| Motor puro | `src/features/dispensing-control/dispensing-jams.ts` | Sin red ni React: `computeJamDiagnostics`, `classifyJamOperation`, `canonicalPayoutMix`, `reconcileDetailInterpretation`, `JAM_THRESHOLDS`, `jamSignalWeights/Labels`, tipos. Testeable con Node (`--experimental-strip-types`). |
| BFF acotado | `src/app/api/dispensing/jams/route.ts` | `POST { paypadId, from, to, maxTransactions ≤ 60 }` (30 por defecto). Cachea detalles inmutables por `id`; 404 = sin detalles; un detalle ilegible no tumba el diagnóstico (`detailsFailures`). |
| Cliente + caché | `src/features/dispensing-control/api.ts`, `hooks.ts` | `useDispensingJamScan` es manual (`enabled` solo tras pulsar analizar), `staleTime` 5 min, `refetchOnWindowFocus: false`. |
| Panel | `src/features/dispensing-control/components/jam-diagnostics.tsx` | Banner por incidente con evidencia y acción sugerida, tabla/​cards de evidencia por denominación, advertencias y pie con ventana analizada y lectura del detalle. |
| Página | `components/dispensing-control-page.tsx` | Inyecta el panel entre las tarjetas y el desglose de denominaciones; al cambiar filtros se invalida el análisis. |

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
| `participacion_perdida` | 2 | ≤ 1/3 de participación reciente vs ≥ 30 % previa, con saldo (mínimo 3 pagos por segmento) |
| `caida_corroborada` | 2 | `fallidos(d) ≥ 2`, `dispensado(d) > 0` y `caidaFisica(d) == dispensado(d)` |
| `caida_insuficiente` | 1 | `caidaFisica(d) < dispensado(d)` |
| `caida_sin_registro` | 1 | `caidaFisica(d) > sistemaTotal(d)` (extracción/liberación manual) |
| `rafaga_salida` | 2 | ≥ 3 `Aprobada Error Devuelta` en el período (nivel máquina) |
| `sustitucion_no_configurada` | 3 | Igual, pero la denominación está marcada «No dispensa»: posible atasco **o** configuración desactualizada |
| `inactiva_con_saldo` | 2 (1 si el arqueo está fuera del período) | Ninguna otra denominación se movió en el intervalo de arqueo y esta tampoco, conservando saldo |
| `rechazo_con_unidades` | 1 | El baúl de rechazo tiene unidades y hubo rechazos/intentos fallidos |
| `config_inconsistente` | 1 | Marcada «No dispensa», pero el arqueo muestra movimiento real del baúl |
| `compensando_entrega` | 0 | Entregó más que su parte canónica (≥ 2 unidades, ≥ 2 pagos): **suprime el resto de señales de esa denominación** |
| `descuadre_inventario` | 0 | `caidaFisica(d) < 0` (informativo; invalida la caída como evidencia) |

Niveles: `sin_evidencia` → `sospecha` (score ≥ 1) → `probable` (≥ 3) → `confirmado`
(≥ 6 con ≥ 2 señales, una señal núcleo **y una evidencia independiente**: física
—`sin_caida_fisica`, `caida_*`— o fallo explícito de entrega —`devuelto_con_saldo`—).
Una denominación **compensadora nunca recibe nivel de atasco**: está entregando, no fallando.

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

## 5. Validación local (fixture del motor)

Escenario reproducido (sin red): 6 pagos de 50.000; los tres primeros usan el billete de
50.000, los tres siguientes se completan con 2×20.000 + 1×10.000; dos transacciones
`Aprobada Error Devuelta` con fallos en **500** (monedas) y una con fallo en 20.000; dos
arqueos donde los baúles de 50.000 y 500 **no bajan** y los demás sí.

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

---

## 8. Qué falta para cerrar (y qué NO se puede con lo actual)

- **Se puede hoy:** detectar, atribuir por denominación, mostrar evidencia, sugerir acción y
  priorizar la revisión en sitio. Cero cambios de backend.
- **No se puede hoy:** notificar automáticamente por correo ante un atasco (la alerta id 1
  es de "escasez en baúles" y el `AlertsController` solo expone suscripciones) ni recibir
  un pulso instantáneo del Pay+ (no hay WebSocket/SignalR, B-01). Requiere F5.
- **Pendiente de datos reales:** confirmar los nombres de `typeOperation`, la frecuencia con
  que se registran arqueos y calibrar los umbrales (`JAM_THRESHOLDS`) con Prueba1.
