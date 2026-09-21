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
virtual_inicio + recibido  =  virtual_hoy + entregado + Δrechazo
```

Despejando lo que se quiere medir:

```
entregado   = virtual_inicio + recibido − virtual_hoy − Δrechazo
virtual_hoy = virtual_inicio + recibido − entregado − Δrechazo
Δrechazo    = virtual_inicio + recibido − virtual_hoy − entregado
```

Todo se mide por **denominación** y se valoriza al final (`unidades × valor`); nunca se suman
monedas distintas.

### El término que causó las tres vueltas: `virtual_inicio`

Es «qué había en el dispensador cuando empezó la ventana». Con el caso real (Inder Uno, 2.000):

| Escenario | virtual_inicio | Cuenta | Entregado |
| --- | --- | --- | --- |
| El baúl se llenó **desde vacío** en el cargue | `0` | 0 + 140 − 11 − 5 | **124** ← tu número |
| El baúl **ya tenía** billetes al cargar (el arqueo dice 84) | `84` | 84 + 140 − 11 − 5 | **208** |
| Sólo se cuenta lo que salió del dispensador (incluye el reject) | `84` | 84 + 140 − 11 | **213** ← lo que el panel mostró primero |

Los tres son «correctos» con una base distinta. **La pregunta no es aritmética, es de negocio: ¿de
dónde sale el saldo de apertura del dispensador?** Sólo hay dos mediciones posibles:

1. **El arqueo** (la máquina reportó 84 el 19-sep 12:56). Sólo sirve si el arqueo se hace en el
   momento correcto (con el baúl como estaba).
2. **El propio cargue**, cuando el baúl se llena desde vacío (llenado total). Ahí `virtual_inicio = 0`
   y la cuenta es la tuya: **recibido − virtual − Δrechazo**.

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

## 4. La tabla que pides (columnas separadas, nada mezclado)

| Billete | **Recibido** (cargue del rango) | **Virtual** (dispensador hoy) | **Rechazo (RJ)** hoy y Δ | **Entregado** = recibido − virtual − Δreject | Entregado según el **sistema** (Σ devuelto) | **Diferencia** | **Arqueado** (último arqueo) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| COP 2.000 | 140 (19-sep 13:20) | 11 · $22.000 | 5 · $10.000 (Δ +5) | **124** | (a calcular) | (a calcular) | 84 · $168.000 (19-sep 12:56) |

- **Total por moneda** al pie (nunca sumando monedas distintas).
- Cada celda declara su origen y su fecha al pasar el cursor (trazabilidad que ya quedó hecha).
- Fila de cierre: `virtual_inicio + recibido − virtual_hoy − Δrechazo − entregado = 0`.

**Nombres que se eliminan para no confundir:** «Inicial (arqueo → cargue)», «Entregada (física)» y el
subtítulo «desde arqueo» desaparecen como columnas; el arqueo queda **sólo** en su columna
(«Arqueado») y en la fila de cierre. Un número, un nombre, una fuente.

## 5. Plan de implementación (5 pasos, cada uno verificable)

| Paso | Qué | Dónde | Verificación |
| --- | --- | --- | --- |
| **P1** | Tabla con las columnas de §4: Recibido / Virtual / Rechazo (hoy + Δ) / Entregado / Arqueado, con la fila de cierre | `denomination-table.tsx` + `dispensing-metrics.ts` | Regresión con 140 / 11 / 5 ⇒ 124 |
| **P2** | `Δrechazo` del rango con su origen declarado: arqueo anterior al rango (si existe) o último arqueo; si no hay ninguno, se muestra el valor de hoy y se declara que no hay Δ | `dispensing-metrics.ts` | Regresión: Δ = 5 con arqueo base; Δ desconocido sin arqueos |
| **P3** | Publicar `Σ returnAmount` y `Σ incomeAmount` por estado en el BFF (`summary` ya se calcula server-side: sumar `returnAmount` es una línea, sin tocar .NET) y traerlo a la columna «según el sistema» + Diferencia | `api/transactions/search/route.ts` + `transactions/schemas.ts` | Regresión del resumen (devuelto ≠ neto) |
| **P4** | Selector explícito del **saldo de apertura**: «Baúl llenado desde vacío (0)» / «Usar el arqueo del …» / «Usar el arqueo anterior al período», por máquina, con el valor aplicado a la vista | `dispensing-filters.tsx` + métricas | En Inder Uno: 124 con la 1.ª opción, 208 con la 2.ª |
| **P5** | Documentar y fijar los números reales de Inder Uno en la regresión (140 / 11 / 5 / 84) y el caso de baúl con inventario previo | `scripts/dispensing-fixtures.mts` | `npm run check` verde |

Nada de esto toca el backend .NET ni las tablas de arqueo (que ya se verificaron correctas contra el
dashboard viejo).

## 6. Las 3 decisiones que necesito (son las que evitan otra vuelta)

- **D1 — «Virtual»:** ¿es el saldo del dispensador que reporta el sistema (`dpStored`, lo que muestra
  Pay+ → Almacenamiento → Dispensadores) o un número distinto que ves en otra pantalla?
- **D2 — Saldo de apertura (§2):** ¿el cargue de 140 fue un **llenado desde vacío** (el baúl quedó
  lleno y `virtual_inicio = 0`) o el baúl **ya tenía** billetes? Si ya tenía, ¿el arqueo es la
  referencia válida para arrancar la cuenta?
- **D3 — Origen del rechazo:** el baúl de rechazo, ¿recibe **sólo** lo que el dispensador intentó
  entregar y no pudo (error devuelta), o **también** billetes que un cliente metió y la máquina
  rechazó? Si es mixto, el Δrechazo que se resta debe ser sólo la parte del dispensador (se puede
  separar con los detalles de transacción, como ya hace el motor de atascos) — si no, restaríamos
  dinero que nunca salió del dispensador.
