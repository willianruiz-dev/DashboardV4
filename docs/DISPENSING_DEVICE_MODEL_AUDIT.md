# Auditoría del modelo funcional de los quioscos contra el código

Fecha: 2026-09-22 · Rama `arena/01a0c5e4-dashboardv4`
Alcance: `src/` (BFF + panel Next.js). El backend .NET (`dashboardv2-backend/`) y el kiosco NO se
modifican: aquí se documenta lo que el panel puede y no puede saber con los contratos que existen
hoy, y lo que haría falta para cerrar la distancia.

> Conclusión corta: el panel **sí** modela dinero de entrada (AP), de salida (DP), rechazo (RJ) e
> inventario — y desde este cambio también **la conciliación por denominación esperado vs. real con
> la causa probable (agotado / con saldo y sin dispensar / correcto)**. Lo que el API actual **no**
> entrega es: (1) si cada denominación es billete o moneda (Arduino), (2) el estado que reporta cada
> dispositivo (vacío, atasco, sin respuesta), (3) el **plan** que el kiosco intentó y (4) la capacidad
> física de cada módulo. Sin esos cuatro datos, la regla de los $1.900 y el «estado del DP» sólo
> pueden inferirse por cruce de evidencia: el panel declara esa limitación en pantalla en vez de
> suponerla.

## 1. Tu modelo → dónde vive hoy en el código

| Concepto del modelo | Dónde está | Estado |
| --- | --- | --- |
| **AP** (aceptador: billetes y monedas) | `PayPad/GetStorage` → `apStored`/`apTotal` por denominación; transacciones con operación de entrada (`classifyJamOperation` → `accept`) | ✅ leído y separado |
| **DP** (dispensador: billetes y monedas) | `dpStored`/`dpTotal` por denominación + operaciones de salida del detalle (`dispense`) | ✅ leído y separado |
| **RJ** (rechazo) | `rjStored`/`rjTotal` (baúl de rechazo) + operaciones `failed` del detalle + estado `Aprobada Error Devuelta` | ✅ |
| **Error / Atasco** | **No existe evento del dispositivo en el API.** Se infiere: motor de atascos (`dispensing-jams.ts`) + semáforo del inicio (`jam-early-warning.ts`) | ⚠️ inferido, nunca «reportado» |
| **Inventario** | `dpStored` por denominación (inventario que el sistema considera disponible para devolver) | ✅ |
| **Monedas por Arduino** | Sólo `PayPadConfiguration.arduinoPort` (puerto serie) y `dispenserDenominations` (texto libre). No hay tipo de dispositivo por denominación | ❌ no modelable hoy |
| **Combinación de devolución** | Se RECONSTRUYE (`canonicalPayoutMix`) desde el valor solicitado y el inventario leído | ⚠️ reconstruida, no leída del kiosco |
| **Esperado vs. real por denominación** | **NUEVO**: `dispensing-payout-reconciliation.ts` + sección «Conciliación por denominación» | ✅ implementado |
| **Regla ≤ $1.900 sólo monedas** | Implementada pero **inactiva** hasta que el catálogo declare qué denominaciones son moneda | ⚠️ bloqueada por datos |

## 2. Las 21 preguntas (§16), respondidas con evidencia

| # | Pregunta | Respuesta | Dónde | Qué falta |
| --- | --- | --- | --- | --- |
| 1 | Cómo se detecta un AP de billetes | El `MEI_PORT` de la configuración del Pay+ es el puerto del aceptador de billetes; el panel no lee hardware, lee el **resultado**: `apStored`/`apTotal` y los detalles de operación de entrada | `paypads/schemas.ts` (`paypadConfigurationSchema`), `dispensing-jams.ts` (`classifyJamOperation` → `accept`) | Que la configuración diga QUÉ aceptador está instalado (hoy `meiPort` es un string libre y `GetConfiguration` falla por SQL upstream, B-07) |
| 2 | Cómo se detecta un AP de monedas | **No se detecta**: no hay distinción por tipo. El monedero llega como una denominación más del catálogo con `apStored`/`dpStored` | `denomination-currency.ts`, `denomination-usage.ts` | Campo `tipo` (billete/moneda) en `CurrencyDenomination` o en la configuración |
| 3 | Cómo se identifica la denominación recibida | `TransactionDetail.idCurrencyDenomination` + `currencyDenomination` (valor) del detalle de cada transacción | `detail-normalizer.ts`, `transactions/schemas.ts` | Que el detalle declare **la moneda** de cada importe (hoy se deduce del catálogo por denominación) |
| 4 | Cómo se registra un RJ | Tres lecturas: baúl de rechazo (`rjStored`, `rjTotal`), operaciones clasificadas `failed` en el detalle, y estado `Aprobada Error Devuelta` | `dispensing-jams.ts:389-414`, `dispensing-metrics.ts` (`rejectedInPeriod`) | Semántica exacta de `typeOperation` (B-08) |
| 5 | Cómo se solicita dispensación a un DP de billetes | **El panel no dispensa**: eso lo hace el kiosco. El panel reconstruye el plan y lee el resultado | `dispensing-payout-reconciliation.ts` | El **plan real** que el kiosco intentó (no está en la base) |
| 6 | Cómo se solicita dispensación a un DP de monedas | Igual que el punto 5, sin distinción de tipo | idem | idem + tipo de denominación |
| 7 | Cómo se comunica la app con Arduino | **No se comunica**: el panel es de sólo lectura. `arduinoPort` sólo se muestra/edita en la configuración del Pay+ | `paypad-configuration-dialog.tsx` | Nada: es fuera del alcance del panel (y no se debe inventar) |
| 8 | Cómo informa Arduino el resultado de una dispensación | No hay evento de dispositivo. Se lee el **detalle de la transacción** (`Transaction/{id}/Details`, una fila por operación y denominación) | `src/lib/server/jam-scan.ts:152-210` | Estado del dispositivo por operación (vacío/atasco/error/sin respuesta) |
| 9 | Cómo se registra una dispensación exitosa | Operación de salida (`dispense`) en el detalle + `returnAmount` de la transacción | `dispensing-jams.ts:539-553`, `system-dispensed.ts` | — |
| 10 | Cómo se registra una dispensación fallida | Operación `failed` en transacción de error con devolución; o detalle sin clasificar en estado de error | `dispensing-jams.ts`, `dispensing-payout-reconciliation.ts` (faltantes) | Código de error del dispositivo |
| 11 | Cómo se detecta un atasco | Motor con señales ponderadas (`devuelto_con_saldo`, `sustitucion`, `sin_caida_fisica`, `caida_corroborada`…) y niveles `sospecha → probable → confirmado`; nunca con una sola señal | `dispensing-jams.ts:816+`, UI `jam-diagnostics.tsx` | Estado del dispositivo (lo confirmaría en lugar de inferirlo) |
| 12 | Cómo se detecta un dispensador vacío | Inventario en 0 vs. umbral `minDpQuantity` (badge «Baúl agotándose») y, en la conciliación nueva, estado **«Agotado (sin saldo)»** con texto explícito «es AGOTAMIENTO, no un atasco» | `denomination-table.tsx`, `dispensing-payout-reconciliation.ts` | — |
| 13 | Cómo se mantiene el inventario virtual | Es el `dpStored` que reporta la máquina (`PayPad/GetStorage`); el panel no lo modifica ni lo «ajusta» | `paypads/api.ts` (`getPaypadStorage`) | Nada en el panel; el kiosco es la fuente |
| 14 | Cómo se actualiza tras una dispensación | Se relee del API (refresco cada 60 s + botón «Actualizar lecturas», con frescura visible) | `hooks.ts`, `denomination-table.tsx` | — |
| 15 | Cómo se actualiza cuando entra dinero | Igual: `apStored` del baúl aceptador + cargues (`Load/GetByPaypad`); el cuadre del período usa cargues como origen | `dispensing-metrics.ts` | — |
| 16 | Cómo se determina la combinación de devolución | `canonicalPayoutMix(valueCents, denominaciones)`: voraz de mayor a menor valor, sólo denominaciones **en uso**, de la **misma moneda**, con stock | `dispensing-jams.ts:462-491`, reutilizado por la conciliación | El algoritmo real del kiosco (el panel sólo reconstruye una referencia) |
| 17 | Qué ocurre cuando no existe combinación posible | Se declara: «no había combinación exacta con el inventario leído» + **faltante no atribuible** valorizado (`unattributedMissingValue`), en vez de repartirlo a ciegas | `dispensing-payout-reconciliation.ts` (`decomposeMissingUnits`) | — |
| 18 | Qué ocurre cuando faltan billetes pero hay monedas | Se muestra el plan (que incluía billetes), el real (sólo monedas), el faltante por denominación y el estado: `no_entrego_con_saldo` si el inventario del billete tenía unidades, `sin_saldo` si estaba en 0; la denominación que cubrió el hueco se marca «entregó de más (compensa)» | idem + UI `payout-reconciliation.tsx` | — |
| 19 | Cómo se aplica la regla de $1.900 sólo monedas | **Implementada y no aplicada todavía**: `coinDenominationIds` + `maxCoinOnlyReturnValue` (por defecto 1900). Sin tipos declarados, el panel publica la limitación en vez de aplicar una regla que no puede comprobar | `dispensing-payout-reconciliation.ts` | Campo que declare qué denominaciones son moneda |
| 20 | Cómo se registra una devolución incompleta | Por transacción: `complete=false`, `missingValue`, líneas con `missingUnits`, estado del kiosco y veredicto en una frase; agregado: nº de incompletas y faltante valorizado del período | `payout-reconciliation.tsx` | — |
| 21 | Cómo se determina la diferencia esperado/real | Plan canónico vs. detalle confirmado, **por denominación**; el faltante se reparte por valor (no por diferencia contra el plan), de modo que «faltó 1 × 10.000» es exactamente eso | `dispensing-payout-reconciliation.ts` | — |

## 3. Los casos del §18, tal como los muestra el panel

Se agregaron como regresiones permanentes (`scripts/dispensing-fixtures.mts`, escenario
`esperado-real`):

**Caso correcto** — solicitado $20.500, entregado $10.000 × 1 + $5.000 × 2 + $500 × 1:

```
Transacción: ENTREGADO EXACTO (otra combinación válida; el plan de referencia era 2 × 10.000 + 1 × 500)
Denominación | Esperado | Dispensado | Diferencia | Faltó | Saldo | Diagnóstico
10.000       |    2     |     1      |    +1      |  —    |  10   | Entregado
5.000        |    0     |     2      |    −2      |  —    |  20   | Entregó de más (compensa)
500          |    1     |     1      |     0      |  —    |  30   | Entregado
```

> Nota de diseño: entregar el valor exacto con **otra combinación válida es correcto** y el panel no
> acusa a nadie — sólo deja ver quién compensó.

**Caso de posible problema** — mismo pago, pero sólo salieron $5.000 × 2 + $500 × 1:

```
Faltó $10.000 (COP $10.000 × 1) · entregado $10,500 de $20,500 solicitado · el kiosco registró la devolución con ERROR
10.000 | esperado 2 | dispensado 0 | faltó 1 | saldo 10 → «No entregó teniendo saldo»: revisar el módulo antes de acusar un fallo
```

**Caso de agotamiento** — idéntico pero con el baúl de 10.000 en cero:

```
10.000 | faltó 1 | saldo 0 → «Agotado (sin saldo)»: es AGOTAMIENTO, no un atasco. Cargar y confirmar con arqueo
```

**Caso sin combinación** — solicitado $20.500 con denominaciones que no lo componen: se publica el
resto **no atribuible** ($6.000 en el ejemplo) y la denominación que el plan pedía y no salió queda
como «Faltante no atribuido» (no se culpa a ciegas).

## 4. La regla de los $1.900 (tu §8)

Estado real: **no aplicable hoy**, y el panel lo dice. Para aplicarla hace falta saber qué
denominaciones son moneda, y el catálogo (`Masters/CurrencyDenomination` → `CurrencyDenominationDto`)
sólo expone `idCurrency`, `currency`, `value`, `img`. Opciones (de menos a más ordenadas):

1. **Campo en el catálogo** (`type`/`isCoin`) — lo más limpio: sirve para la regla, para separar
   monederos de billeteros en la UI y para no confundir un billetero con un monedero en los atascos.
2. **Lista en la configuración del Pay+** (`extraDataJson`, key/value, ya existe y no requiere
   migración): p. ej. `coinDenominations = 500,100`, `maxCoinOnlyReturn = 1900`. El motor de atascos
   ya documenta `extraDataJson` como el lugar natural de los umbrales por máquina.
3. Heurística por valor — **descartada**: en COP el 1.000 y el 2.000 circulan como moneda y como
   billete según el momento; suponerlo produciría acusaciones falsas.

El código ya acepta las dos primeras vías (`coinDenominationIds`, `maxCoinOnlyReturnValue`) y publica
la limitación cuando no llegan.

## 5. Distancia con el backend/kiosco (lo que hay que pedir)

| Dato necesario | Por qué | Dónde debería vivir |
| --- | --- | --- |
| Tipo de denominación (billete/moneda) y canal (Arduino/billetero) | Regla de $1.900, separar monederos de billeteros, no confundir módulos | `CurrencyDenomination` (columna) o `extraDataJson` por Pay+ |
| **Plan de devolución** por transacción (qué se pidió a cada dispositivo y cuánto) | Hoy se reconstruye; sin el plan real no se puede distinguir «el kiosco decidió otra combinación» de «el kiosco intentó y falló» | Tabla `TransactionDispensePlan` o detalle con `status` por operación |
| **Estado del dispositivo** por operación (vacío, atasco, sin respuesta, rechazo de operación) | Es la única forma de confirmar un atasco en vez de inferirlo | Columna en el detalle de transacción |
| Capacidad física por módulo y nivel de llenado | Distinguir «lleno», «vacío» y «no configurado» sin depender del umbral | `PayPadStorage` |
| Semántica de `typeOperation`/`idTypeOperation` | El motor clasifica por palabras clave y reconcilia contra importes; con el catálogo real se elimina la heurística (B-08) | Tabla de tipos de operación (`Masters`) |

## 6. Cómo verificarlo

```bash
npm run fixtures:dispensing   # 142/142 · incluye esperado-real, arqueo-historial, arqueo-insumo
npm run check                 # typecheck + eslint --max-warnings=0 + fixtures
npm run build
```

Escenarios nuevos de esta auditoría: `esperado-real` (los cinco casos de las §3/§18 de este
documento). El detalle de cada comprobación se imprime en la salida de la suite.
