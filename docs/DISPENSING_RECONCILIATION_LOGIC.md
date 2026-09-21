# Lógica del cuadre — Control de dispensado (Pay+ / Inder Uno)

> **Regla única (decisión del operador, 2026-09-21):**
>
> ```
> CARGADO = DISPENSADO + RECHAZADO + EN DISPENSADORES
> 140      = 124        + 5         + 11
> ```
>
> El período consultado manda el «Cargado». El inventario previo de los arqueos **no** entra a esta
> cuenta: se muestra aparte como auditoría, y el sistema (Σ devuelto de las transacciones) decide si
> hubo algo más. Todo se mide por denominación y se valoriza al final; las monedas nunca se suman
> entre sí.

## 1. Los conceptos, separados (nada se suma entre sí)

| # | Concepto | Qué es físicamente | De dónde sale (fuente real del API) | ¿Hay historial por fecha? |
| --- | --- | --- | --- | --- |
| 1 | **Recibido (cargue)** | Billetes que entran al **dispensador** en un cargue | `api/Load/GetByPaypad/{id}` → `details[].quantity`, `totalLoaded`, `dateCreated` | **Sí**, completo, con fecha |
| 2 | **Virtual (dispensador)** | Lo que la máquina **dice tener** hoy en el dispensador (no es un conteo a mano) | `api/PayPad/GetStorage/{id}` → `dpStored` (unidades) y `dpTotal` (valor) | Sólo **hoy**; por fecha: los **arqueos** (`quantityDp` de cada detalle) |
| 3 | **Rechazo (RJ)** | Billetes que quedaron en el **baúl de rechazo** (salieron del dispensador y no llegaron al cliente) | `api/PayPad/GetStorage/{id}` → `rjStored` / `rjTotal` | Sólo **hoy**; por fecha: los arqueos (`quantityRj`) → **Δ del rango** = arqueo final − arqueo inicial |
| 4 | **Entregado (dispensado)** | Billetes que salieron del dispensador **hacia el cliente** | **Derivado** (fórmula en §2). No existe como campo | Sí, con 1–3 |
| 5 | **Aceptado** | Billetes que entraron al **aceptador** (dinero de clientes) | `apStored`/`apTotal` + transacciones (`incomeAmount`) | Sí, por transacciones |
| 6 | **Arqueado** | La **foto** que congela el botón «Arquear»: virtual, rechazo, aceptador y su valor, en ese instante | `api/Tonnage/GetByPaypad/{id}` → `totalAp/totalDp/totalRj/total` + detalles | **Sí**, historial con fecha |

**Aviso importante sobre «virtual»:** en el API **no existe ningún campo llamado `virtual`**. El
almacenamiento (`PayPadStorage`, es una *vista* de base de datos, no una tabla) sólo expone
`AP_STORED`, `DP_STORED`, `RJ_STORED`, `QUANTITY_STORED` y sus valores. «Virtual» es el nombre con
el que la operación llama al saldo que reporta la máquina; el candidato es `dpStored`. Si en Pay+ ves
un número llamado «virtual» en otro lugar, hay que decir dónde para mapearlo (§6, D1).

## 2. La identidad del cuadre (la del operador)

```
CARGADO = DISPENSADO + RECHAZADO + EN DISPENSADORES

DISPENSADO = cargado(del período) − en dispensadores(hoy) − rechazado(del período)
```

Caso real (Inder Uno id 70, 2.000): **140 = 124 + 5 + 11**.

- **Cargado**: los cargues dentro del período consultado (`api/Load/GetByPaypad`).
- **En dispensadores**: el saldo que la máquina reporta hoy (`dpStored`).
- **Rechazado**: el baúl de rechazo hoy menos lo que había al inicio del período (arqueo anterior al rango; sin él se asume 0 y se declara).
- **Dispensado**: lo que se despeja — y **nunca puede superar lo cargado**, que es la comprobación que el operador exige.

La misma identidad por denominación, con los números que hoy muestra el panel:

| Billete | Cargado | Dispensado | Rechazado | En dispensadores |
| --- | --- | --- | --- | --- |
| COP 10.000 | 20 | 20 − 11 = **9** | 0 | 11 |
| COP 2.000 | 140 | 140 − 11 − 5 = **124** | 5 | 11 |
| COP 500 | 100 | 100 − 46 = **54** | 0 | 46 |
| COP 100 (sin cargue) | 0 | **negativo** → «inventario previo» | 0 | 100 |
| **Total (valorizado)** | $380.000 | **$365.000** | $10.000 | $155.000 |

### Qué pasa con el inventario que ya estaba en el baúl

Si un baúl tenía billetes de antes (sin cargue en el período), el despeje da **negativo** y el panel lo
marca «inventario previo» con la instrucción de registrar un arqueo de apertura. Es exactamente lo
que ocurre con el 2.000: **el arqueo del 19-sep 12:56:44 declaraba 84 unidades antes del cargue de
12:57:09** (25 segundos después). Esas 84 **no entran al dispensado del período**; quedan como
**auditoría** en la tarjeta de verificación (§3), que dice cuánto saldría si se contaran
(`84 + 140 − 11 − 5 = 208`). Si el sistema confirma que lo devuelto a clientes fue ≈124, las 84 se
retiraron en mantenimiento o el arqueo es viejo; si confirma ≈208, esas 84 sí pasaron por el
dispensador y hay que registrar el arqueo en el momento correcto.

## 3. Cómo se verifica (evidencia dura, no interpretación)

Existe una segunda medición independiente: **lo que el sistema registró que entregó**. Tiene DOS
orígenes posibles y no son intercambiables (corrección 2026-09-21, caso Pay+ ODRB Rionegro id 1288):

| Origen | Qué mide | Cuándo es admisible |
| --- | --- | --- |
| **Detalle por transacción** (`Transaction/{id}/Details` → operación + denominación + cantidad) | Cada billete con su **moneda** y su **dirección**: `accept` = entra al aceptador (AP), `dispense` = sale del dispensador (DP), `failed` = intento de salida fallido | Siempre que el barrido cubra el período completo (sin truncar, sin detalles fallidos, lectura no invertida). Es el **lado DP real** |
| **`Σ returnAmount`** de las aprobadas (el «Devuelto» de la transacción) | Un importe por transacción, **sin moneda y sin dirección declarada** | **Sólo con UNA moneda.** En una máquina multimoneda suma pesos y dólares; en una máquina de cambio divisa describe lo que **entró** (AP), no lo que salió (DP) |

```
entregado_físico (identidad §2, POR MONEDA)   vs   entregado_sistema (detalle DP, POR MONEDA)
                                                └─ respaldo: Σ returnAmount (sólo una moneda)
```

> **Caso real que motivó la corrección (Pay+ ODRB Rionegro, ID 1288, multimoneda COP/USD):**
> la tarjeta decía «El dispensado no coincide con lo que el sistema registró · Sistema (Σ devuelto
> de 13 transacción(es) aprobadas): **$1.166.900** · Dispensado del período: **$9.207.900**
> (diferencia $8.041.000) · contando el inventario previo del arqueo: $8.013.400 (diferencia
> $6.846.500) · Hay dinero sin registro…». El operador lo rechazó con razón: *«las operaciones
> aprobadas son AP, no DP»* y *«esta máquina recibe dólares y los cambia por pesos colombianos»*.
> Las dos cifras comparadas medían **cosas distintas**: `Σ returnAmount` seguía al aceptador
> (dólares que entran) y además sumaba monedas; el dispensado físico era la salida de pesos.
> No faltaban $8.041.000: sobraba una comparación inválida.

Reglas que se aplican desde entonces:

1. **La comparación es por moneda.** Cada fila del desglose tiene `idCurrency` (catálogo) y el
   detalle de cada transacción también; nada se compara ni se suma entre monedas. Los escalares
   agregados de la verificación (`systemTotal`, `fromPeriodTotal`, `differences`) sólo se publican
   cuando todas las filas son de la misma moneda; si no, quedan en `null` y la UI muestra el
   desglose por moneda.
2. **El lado del dinero debe coincidir.** AP (aceptado) y DP (dispensado) se miden y se muestran
   por separado (`acceptedTotal` / `systemTotal` de cada moneda). Una moneda que la máquina no
   dispensa (los dólares que sólo entran al aceptador) **no decide el veredicto**: 0 contra 0 no es
   «cuadra», es ausencia de movimiento.
3. **Sólo se compara una moneda con cargue en el período.** Sin cargue de esa moneda no existe
   «cargado − en dispensadores − rechazado» que despejar (antes un baúl de USD sin cargue aportaba
   un negativo a la suma agregada).
4. **Sin medición admisible no hay acusación.** Si el período no tiene cargues, si el barrido de
   detalles es parcial (truncado por el tope de 40 transacciones, detalles fallidos o ilegibles) o
   si la máquina es multimoneda sin detalle utilizable, la tarjeta declara **«verificación no
   aplicable»** con el motivo (`blocker`) en lugar de «hay dinero sin registro».
5. **Las dos cifras se publican cuando discrepan.** Con detalle utilizable, `Σ returnAmount` queda
   como *referencia* rotulada con su origen (`systemSourceConflict` + `note`), para que el operador
   vea de dónde salía el número que antes se comparaba mal.

| Resultado | Qué significa |
| --- | --- |
| Cuadran | El inventario está explicado: el `virtual_inicio` elegido es el correcto |
| Físico > sistema | Salió dinero sin registro: extracción manual, cargue no registrado o arqueo mal hecho |
| Sistema > físico | Hay billetes atascados o devueltos, o el virtual está inflado |

Esta comparación es la que cierra el caso: con el período del cargue (19-sep → hoy) y `Σ returnAmount`
de 2.000 en ese rango sabemos si lo entregado al cliente fue 124, 208 o 213 — sin discutir fórmulas.

### Cuándo la comparación NO aplica (el caso «Hoy» sin cargues)

> Caso real reportado por el operador (Pay+ Inder 1, 2026-09-21, preset «Hoy»): arriba salía
> «El último cargue está fuera del período (Hoy)» y abajo, en la misma tarjeta,
> «El dispensado no coincide con lo que el sistema registró · Hay dinero sin registro…»
> con Sistema **$0** (0 aprobadas), dispensado del período «no calculable» y, contando el
> inventario previo del arqueo, **$653.000** de diferencia.

El aviso de descuadre **no puede dispararse cuando el período elegido no tiene cargues.** Sin
cargues no existe «cargado − en dispensadores − rechazado» que calcular (antes se restaba de cero y
daba un negativo absurdo) y las dos cifras comparadas miden ventanas distintas: el sistema
(Σ `returnAmount`) cubre el rango consultado, la auditoría del arqueo arranca días antes, en la
base del arqueo. La diferencia entre ambas **no es dinero perdido, es diferencia de ventanas.**

| Estado | `best` | `blocker` | Qué muestra la tarjeta |
| --- | --- | --- | --- |
| Período con cargues y cuadra con «cargado − en dispensadores − rechazado» | `periodo` | `null` | «El dispensado coincide con lo que el sistema registró» |
| Período con cargues y sólo cuadra contando el inventario previo del arqueo | `arqueo` | `null` | «Sólo cuadra contando el inventario previo del arqueo» |
| Período con cargues y no cuadra con ningún modelo | `ninguno` | `null` | «El dispensado no coincide… Hay dinero sin registro» (**warning**) |
| Período **sin cargues** (o sin ningún modelo calculable) | `null` | `sin-cargues` | «Sin período comparable para verificar»: explica las dos ventanas y sugiere «Desde último cargue» |
| Máquina **multimoneda** sin detalle utilizable (caso ODRB Rionegro) | `null` | `multimoneda` | «Σ devuelto no es comparable en esta máquina»: explica AP vs DP y remite al detalle por denominación |
| Barrido de detalles **parcial** (truncado, fallido o ilegible) en máquina multimoneda | `null` | `cobertura` | «El detalle del período está incompleto: la verificación no concluye» |
| Sin ninguna medición del sistema | `null` | `sin-medicion` | «Sin medición del sistema para verificar» |

Reglas implementadas: `periodComparable = hasLoadInRange`; `best` sólo puede ser `"ninguno"`
cuando el período **sí** tiene cargues **y** existe una medición admisible (`systemSource ≠ null`).
El código distingue «no se puede comparar» (neutro) de «no coincide» (advertencia) y nunca los
mezcla. `systemSource` dice qué cifra se usó (`"detalles"` o `"returnAmount"`), `currencies[]` trae
la comparación por moneda (con lo aceptado aparte) y `note` explica la salvedad del origen.

## 4. La tabla (IMPLEMENTADA)

| Billete | Cargado | Dispensado | Rechazado (RJ) | En dispensadores | Estado |
| --- | --- | --- | --- | --- | --- |
| COP 2.000 | 140 · $280.000 | **124** (`140 − 11 − 5`) | 5 · $10.000 (+5) | 11 · $22.000 | OK |

- Arriba de la tabla, el cuadre valorizado completo: **Cargado $380.000 = Dispensado $365.000 +
  Rechazado $10.000 + En dispensadores $155.000**. Con varias monedas la identidad se publica **por
  moneda** (`identityByCurrency`): `COP: 9.202.700 dispensados + 2.100 rechazados + 0 en
  dispensadores = 9.204.800 cargados` y `USD: sin cargues de esta moneda en el período, así que no
  hay dispensado que despejar`; el total agregado queda rotulado como referencia (suma monedas
  distintas).
- Cada celda lleva su origen y su fecha en el tooltip; «Cargado» lleva la traza de cargues.
- El dispensado muestra su ecuación debajo del número y su valor en pesos.
- Filas con inventario previo sin cargue → «inventario previo» (no se esconden, se explican).
- La auditoría del arqueo y la verificación contra el sistema viven en las tarjetas de arriba, no en
  la tabla: **un número, un nombre, una fuente**.

## 5. Plan de implementación (5 pasos, cada uno verificable)

| Paso | Qué | Dónde | Estado |
| --- | --- | --- | --- |
| **P1** | Tabla Cargado / Dispensado / Rechazado / En dispensadores + cuadre valorizado que cierra | `denomination-table.tsx` + `dispensing-metrics.ts` | **HECHO** |
| **P2** | Rechazado del período = baúl hoy − rechazo al inicio del período (arqueo anterior al rango) | `dispensing-metrics.ts` | **HECHO** |
| **P3** | Verificación con `Σ returnAmount` del sistema (BFF `cashDispensedTotal`) contra el dispensado del período y contra la auditoría del arqueo | `api/transactions/search/route.ts` + `dispensing-control-page.tsx` | **HECHO** |
| **P4** | Fila «inventario previo» cuando el baúl tiene más unidades que las cargadas en el período | `dispensing-metrics.ts` + tabla | **HECHO** |
| **P5** | Regresión con los números reales (140 / 124 / 5 / 11 y el cierre valorizado) | `scripts/dispensing-fixtures.mts` | **HECHO** |
| **P6** | Verificación POR MONEDA y por lado (AP/DP): el lado del sistema sale del detalle de las transacciones; `Σ returnAmount` sólo con una moneda; sin medición admisible se declara «no aplicable» en vez de acusar | `system-dispensed.ts` + `dispensing-metrics.ts` + `components/reconciliation-check.tsx` | **HECHO** (121/121) |
| **P7** | Agregados AP / RJ / arqueo base por moneda (antes sumaban pesos y dólares en un solo número) | `dispensing-metrics.ts` + tarjetas de la página | **HECHO** |

Nada de esto toca el backend .NET ni las tablas de arqueo (que ya se verificaron correctas contra el
dashboard viejo).

## 6. Decisiones cerradas y pendientes menores

- **D1 — «Virtual» (= «En dispensadores»):** es `dpStored`, el saldo del dispensador que reporta la
  máquina (Pay+ → Almacenamiento → Dispensadores). No existe ningún campo `virtual` en el API.
- **D2 — Saldo de apertura:** **cerrado: el cargue abre el cuadre del período** (decisión del
  operador, 2026-09-21). El inventario previo del arqueo queda como auditoría, no en la suma.
- **D4 — Origen de la cifra del sistema (cerrado 2026-09-21, caso ODRB Rionegro id 1288):** la
  verificación usa el **detalle por denominación** (lado DP, por moneda) cuando el barrido cubre el
  período; `Σ returnAmount` queda sólo para máquinas de **una** moneda y como referencia rotulada.
  Motivo: el DTO de transacción no declara la moneda de cada importe y, en una máquina que recibe
  dólares y entrega pesos, `returnAmount` sigue al aceptador (AP) y no al dispensador (DP). El
  barrido de detalles es el que ya hace la detección de atascos (misma ventana, misma caché, ninguna
  petición extra) y se clasifica con la MISMA regla del motor (`readJamDetail`), para que los dos
  paneles no se contradigan. Límite declarado: el barrido está acotado a 40 transacciones
  (`JAM_SCAN_MAX_TRANSACTIONS`); fuera de esa cobertura la verificación se declara parcial.
- **D3 — Origen del rechazo:** se asume que el crecimiento del baúl de rechazo viene del dispensador y
  por eso se resta del dispensado («salió del dispensador pero no llegó al cliente»). Pendiente
  menor: si algún día se comprueba que también recibe billetes rechazados de clientes, separar con los
  detalles de transacción (el motor de atascos ya clasifica `acept`/`dispense`/`failed`).
