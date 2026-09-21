# Lógica y plan de cuadre — Control de dispensado (Pay+ / Inder Uno)

> **Para qué es este documento:** fijar la lógica ANTES de seguir tocando el panel. El 2026-09-21
> dimos tres vueltas al mismo número (213 / 129 / 124) porque nunca escribimos la identidad
> completa: cada versión usaba una «base» distinta. Aquí queda explícito qué es cada concepto, de
> dónde sale cada número, qué NO podemos saber con los datos disponibles y qué falta decidir.

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

Existe una segunda medición independiente: **lo que el sistema registró que entregó**, o sea
`Σ returnAmount` de las transacciones aprobadas de la misma ventana (es el «Devuelto» de la
transacción; el BFF ya trae las transacciones, sólo hay que publicar esa suma).

```
entregado_físico  (identidad §2)   vs   entregado_sistema (Σ returnAmount aprobadas)
```

| Resultado | Qué significa |
| --- | --- |
| Cuadran | El inventario está explicado: el `virtual_inicio` elegido es el correcto |
| Físico > sistema | Salió dinero sin registro: extracción manual, cargue no registrado o arqueo mal hecho |
| Sistema > físico | Hay billetes atascados o devueltos, o el virtual está inflado |

Esta comparación es la que cierra el caso: con el período del cargue (19-sep → hoy) y `Σ returnAmount`
de 2.000 en ese rango sabemos si lo entregado al cliente fue 124, 208 o 213 — sin discutir fórmulas.

## 4. La tabla (IMPLEMENTADA)

| Billete | Cargado | Dispensado | Rechazado (RJ) | En dispensadores | Estado |
| --- | --- | --- | --- | --- | --- |
| COP 2.000 | 140 · $280.000 | **124** (`140 − 11 − 5`) | 5 · $10.000 (+5) | 11 · $22.000 | OK |

- Arriba de la tabla, el cuadre valorizado completo: **Cargado $380.000 = Dispensado $365.000 +
  Rechazado $10.000 + En dispensadores $155.000** (por moneda cuando la máquina trabaja varias).
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
| **P5** | Regresión con los números reales (140 / 124 / 5 / 11 y el cierre valorizado) | `scripts/dispensing-fixtures.mts` | **HECHO** (84/84) |

Nada de esto toca el backend .NET ni las tablas de arqueo (que ya se verificaron correctas contra el
dashboard viejo).

## 6. Decisiones cerradas y pendientes menores

- **D1 — «Virtual» (= «En dispensadores»):** es `dpStored`, el saldo del dispensador que reporta la
  máquina (Pay+ → Almacenamiento → Dispensadores). No existe ningún campo `virtual` en el API.
- **D2 — Saldo de apertura:** **cerrado: el cargue abre el cuadre del período** (decisión del
  operador, 2026-09-21). El inventario previo del arqueo queda como auditoría, no en la suma.
- **D3 — Origen del rechazo:** se asume que el crecimiento del baúl de rechazo viene del dispensador y
  por eso se resta del dispensado («salió del dispensador pero no llegó al cliente»). Pendiente
  menor: si algún día se comprueba que también recibe billetes rechazados de clientes, separar con los
  detalles de transacción (el motor de atascos ya clasifica `acept`/`dispense`/`failed`).
