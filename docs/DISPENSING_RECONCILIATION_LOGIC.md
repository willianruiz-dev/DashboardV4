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

## 2. La identidad del cuadre (las 6 formas de escribir lo mismo)

Para una denominación, en una ventana de tiempo:

```
virtual_inicio + recibido  =  virtual_hoy + entregado_al_cliente + Δrechazo
```

Despejando lo que se quiere medir:

```
entregado_al_cliente = virtual_inicio + recibido − virtual_hoy − Δrechazo
virtual_hoy          = virtual_inicio + recibido − entregado_al_cliente − Δrechazo
Δrechazo             = virtual_inicio + recibido − virtual_hoy − entregado_al_cliente
```

Todo se mide por **denominación** y se valoriza al final (`unidades × valor`); nunca se suman
monedas distintas. «Salieron del dispensador» = `entregado_al_cliente + Δrechazo` (incluye lo que
falló y cayó al baúl de rechazo).

### Flujo confirmado de la máquina real (Inder Uno id 70)

Del panel y del histórico: **el arqueo del 19-sep 12:56:44 es 25 segundos anterior al cargue del
19-sep 12:57:09**. El cargue no genera arqueo (el formulario legado `PayPadLoadForm.js` sólo envía
`POST Load`), así que **la operación arquea a propósito y luego carga**: el arqueo es la **apertura
del cuadre** y el cargue es el **recibido**. Eso es exactamente lo que el operador describe como
«el arqueo es la lógica desde cargue».

Datos reales de esa máquina en el período (panel del 2026-09-21):

| Billete | Arqueado | Recibido | Virtual hoy | Rechazo (Δ) | Entregado al cliente |
| --- | --- | --- | --- | --- | --- |
| COP 50.000 | 0 | 0 | 0 | 0 | 0 |
| COP 20.000 | 0 | 0 | 0 | 0 | 0 |
| COP 10.000 | 8 | 20 | 11 | 0 | 8 + 20 − 11 = **17** |
| COP 5.000 | 0 | 0 | 0 | 0 | 0 |
| COP 2.000 | 84 | 140 | 11 | 5 (+5) | 84 + 140 − 11 − 5 = **208** |
| COP 500 | 60 | 100 | 46 | 0 | 60 + 100 − 46 = **114** |
| **Total** | | 280.000 | 165.000 | 10.000 | **$643.000** |

### Las tres cifras que se confundían

| Cuenta | virtual_inicio | 2.000 | Total valorizado | Qué es |
| --- | --- | --- | --- | --- |
| Modelo A (arqueo) | `84` | 84 + 140 − 11 − 5 = **208** | $643.000 | Arqueado + recibido − virtual − rechazo |
| Modelo B (sólo cargue) | `0` | 140 − 11 − 5 = **124** | $365.000 | Si el baúl se hubiera llenado desde vacío |
| Salieron del dispensador | `84` | 84 + 140 − 11 = **213** | $653.000 | Incluye lo que fue al rechazo |

No es aritmética: es **qué saldo de apertura explica el inventario**. El panel publica las tres y la
verificación de §3 decide cuál es la correcta para esta máquina.

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

## 4. La tabla (IMPLEMENTADA: columnas separadas, nada mezclado)

| Billete | **Arqueado** (apertura) | **Recibido** (cargues desde el arqueo) | **Virtual hoy** | **Rechazo (RJ)** hoy y Δ | **Entregado** = arqueado + recibido − virtual − rechazo |
| --- | --- | --- | --- | --- | --- |
| COP 2.000 | 84 · $168.000 | 140 (19-sep 12:57) | 11 · $22.000 | 5 · $10.000 (Δ +5) | **208** (`84 + 140 − 11 − 5`) |

- Cada celda declara su origen y su fecha en el tooltip; el **Recibido** lleva la traza de cargues.
- El **Entregado** muestra su ecuación debajo del número y, si no hay arqueo, cae al modelo B
  declarándolo («sólo cargue: 124 (140 − 11 − 5)»).
- El rechazo negativo (baúl vaciado) se declara: la separación cliente/rechazo deja de ser exacta.
- La verificación de §3 va arriba, en una tarjeta propia: sistema vs modelo A vs modelo B con sus
  diferencias.

**Decisiones de nombre ya aplicadas:** se eliminaron «Inicial (arqueo → cargue)», «Cargada»,
«Entregada (física)», «Saldo actual» y el subtítulo «desde arqueo». Ahora cada columna se llama
como el concepto (§1): Arqueado, Recibido, Virtual hoy, Rechazo, Entregado.

## 5. Plan de implementación (5 pasos, cada uno verificable)

| Paso | Qué | Dónde | Estado |
| --- | --- | --- | --- |
| **P1** | Tabla con las columnas de §4 (Arqueado / Recibido / Virtual hoy / Rechazo + Δ / Entregado) con la ecuación visible | `denomination-table.tsx` + `dispensing-metrics.ts` | **HECHO** |
| **P2** | `Δrechazo` contra el arqueo base (Δ > 0 se resta del entregado; Δ < 0 se declara «baúl vaciado») | `dispensing-metrics.ts` | **HECHO** |
| **P3** | `Σ returnAmount` de transacciones aprobadas en el BFF (`cashDispensedTotal`) y verificación sistema vs modelo A vs modelo B con diferencias | `api/transactions/search/route.ts` + `dispensing-control-page.tsx` | **HECHO** |
| **P4** | Selector explícito del saldo de apertura por máquina | `dispensing-filters.tsx` | **PENDIENTE** (sólo si la verificación de P3 no basta) |
| **P5** | Números reales de Inder Uno fijados en la regresión (84 / 140 / 11 / 5) + los tres desenlaces de la verificación | `scripts/dispensing-fixtures.mts` | **HECHO** (84/84 comprobaciones) |

Nada de esto toca el backend .NET ni las tablas de arqueo (que ya se verificaron correctas contra el
dashboard viejo).

## 6. Decisiones abiertas (ya no bloquean: el panel las resuelve con datos)

- **D1 — «Virtual»:** mapeado a `dpStored` (Pay+ → Almacenamiento → Dispensadores). No existe ningún
  campo `virtual` en el API (`PayPadStorage` es una vista con `AP/DP/RJ_STORED`). Si aparece otro
  número con ese nombre en otra pantalla, hay que re-mapear.
- **D2 — Saldo de apertura:** resuelto por la verificación de §3. El panel publica el modelo del
  arqueo (A) y el del baúl desde vacío (B) y declara cuál coincide con `Σ returnAmount`. Si no
  coincide ninguno, hay dinero sin registro y lo dice.
- **D3 — Origen del rechazo:** se asume que el crecimiento del baúl de rechazo viene del dispensador
  (por eso se resta del entregado) y el caso «baúl vaciado» se declara. Si algún día se comprueba que
  también recibe billetes rechazados de clientes, habrá que separar con los detalles de transacción
  (el motor de atascos ya clasifica `acept`/`dispense`/`failed` por operación).
