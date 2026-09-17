# AGENT TASK BACKLOG

> **Actualizado:** 2026-09-17
> **Criterio de estado:** `PASA` requiere TypeScript, ESLint, build y la prueba funcional indicada. Una ruta o componente aislado no cierra una fase.

| Fase | Entrega | Estado | Evidencia / pendiente |
| --- | --- | --- | --- |
| 0 | Sistema de diseño | **PASA (código + render local)** | Tailwind v4 CSS-first, tokens del manual, tema claro/oscuro y primitives. El banner E-city existente aparece en login, cabecera y navegación; falta inspección visual autenticada de todos los flujos. |
| 1 | Tipos e infraestructura | **PASA (código + integración local)** | Zod, Query, BFF relativo, sesión HttpOnly y cifrado server-side. El BFF de assets usa el origen estático histórico verificado, separado del API; el guard CSRF del relay admite el host público sin aceptar orígenes ajenos. |
| 2 | Usuarios y administración habilitadora | **ORIGEN REAL DE IMÁGENES APLICADO; PENDIENTE E2E** | CRUD de Usuarios, Clientes, Sucursales, Roles, Rutas y Maestros implementado. `img`/`logoImg` se solicitan automáticamente por `/staticfiles/...`; la nueva ruta apunta a `dashboardv2.e-city.co/staticfiles`, que entrega archivos DB reales. Falta comprobarlos dentro de una sesión de la UI. |
| 3 | Cargues | **CORRECCIÓN BASADA EN EVIDENCIA APLICADA; PENDIENTE REPETIR E2E** | El diagnóstico autenticado identificó `response.[].details.[].quantity (too_small)`: existen cantidades negativas que el dashboard viejo muestra. El reader ya conserva el signo sólo para cantidades históricas; falta verificar Prueba1 tras el cambio. |
| 4 | Arqueos | **CORRECCIÓN BASADA EN EVIDENCIA APLICADA; PENDIENTE REPETIR E2E** | El diagnóstico autenticado identificó valores negativos en `quantityDp` y `quantityTotal`. Se aceptan exclusivamente como cantidades de lectura; IDs, denominaciones y mutaciones conservan sus restricciones. La tabla/filtro desktop ya muestra las columnas de historial. |
| 5 | Monitoreo y reportes | **PENDIENTE E2E** | Transacciones, detalle, vídeo, Excel, filtros/orden/paginación BFF y filtros de Pay+ por nombre, sucursal y dirección están implementados. La búsqueda resuelve `idPayPad` contra `PayPad.username`, inicia el día a las 12:00 a. m., permite filtrar Efectivo/Tarjeta y ordena antes de paginar. El relay Excel preserva el POST/binario legado y ya no rechaza el origen público por compararlo con `0.0.0.0`; falta una descarga productiva autenticada. |
| 6 | Control de dispensado | **IMPLEMENTADO (F1–F4 + detección de atascos F1–F3); PENDIENTE E2E** | `src/features/dispensing-control/` + ruta `/dashboard/transactions/dispensing-control`. useDispensingMetrics orquesta storage/arqueos/cargues/búsqueda (summary sobre el conjunto completo vía byState, extensión BFF aplicada). Acceso SuperAdmin resuelto en el frontend por nombre de rol (isSuperAdminRole + inyección del ítem en el sidebar; D1, sin operaciones de datos ni cambios al API); umbral minDpQuantity+10 (D2). **Detección de atascos:** motor puro `dispensing-jams.ts`, BFF acotado `POST /api/dispensing/jams` (prioriza `Aprobada Error Devuelta`, concurrencia 5 y caché de detalles por transacción) y panel con evidencia por denominación y acción sugerida. **Correcciones por caso real (Inder 2, ID 71):** C1 el DTO legacy devuelve `CurrencyDenomination`/`Quantity` como enteros y el schema estricto hacía fallar los 30 detalles → normalizador tolerante (`detail-normalizer.ts`) que nunca rechaza y reporta `detailsMalformed`; C2 `isDispensing` ya no habilita ni bloquea señales (la máquina tenía el monedero de 500 como «No dispensa» y sí debía entregar) → conjunto de dispensado por evidencia + señales `sustitucion_no_configurada` y `config_inconsistente`; C3 el panel ya no declara «sin señales» estando ciego → `blind` + `failureReasons` con titular «Diagnóstico incompleto». C4 **atribución**: una denominación que entrega de más respecto a su parte canónica queda como «Compensando» y se le suprimen las señales de atasco (el 100 compensaba al 500 y se lo culpaba a él); la existencia del monedero se deduce del saldo en el baúl, no de `isDispensing` ni del movimiento (un módulo atascado no se mueve). C5 **disparo automático**: el análisis corre al seleccionar la máquina o cambiar el período, sin pulsar nada; el botón queda como «Re-analizar». C7 **bloqueo sin máquina**: `isLoading` solo es verdadero con máquina seleccionada (TanStack Query v5 marca `pending` en queries deshabilitadas) y el `disabled` de los filtros es explícito, así que consultar un período sin máquina ya no deja la pantalla bloqueada. C6 **temporalidad**: `participacion_perdida` baja a peso 0 (nunca genera incidente sola), exige participación reciente ≈ 0 con previa ≥ 50 % y sin movimiento en el arqueo; `inactiva_con_saldo` exige que la denominación fuera requerida por los pagos. El motor alerta con el estado actual (período consultado o último intervalo de arqueos), no con tendencias. Pendiente: E2E autenticado con Pay+ real. Ver `docs/DISPENSING_CONTROL_FEASIBILITY.md` y `docs/DISPENSING_JAM_DETECTION.md`. |


## Trabajo implementado

- Autenticación, sesión, logout y navegación basada en rutas/permisos del rol.
- Gestión de Usuarios, Clientes, Sucursales, Roles, Rutas, Monedas, Regiones, Tipos de documento y Denominaciones.
- Gestión de Pay+: crear, editar, eliminar, cambiar contraseña, configurar puertos, configurar denominaciones, cargues, arqueos e historial.
- Alertas: crear y eliminar suscripciones por Pay+ (el catálogo de tipos de alerta es frontend + BD; hoy solo existe la alerta 1 de escasez en baúles).
- Transacciones y Reportes: consulta por fechas/Pay+, resumen, detalle por denominación, descarga de vídeo y exportación Excel.
- Modo oscuro seleccionable y filtro por texto/estado para encontrar Pay+, incluida sucursal y dirección resueltas desde `GET /api/Office`.
- El nombre de Pay+ se resuelve con `username`, luego el alias histórico `userName`; `description` no sustituye la identidad de máquina. El fallback `Pay+ <id>` se usa sólo al presentar un valor ausente, nunca al persistirlo. La búsqueda de transacciones añade server-side `paypadUsername` desde esa lista y el diálogo de detalle usa ese valor, no `transaction.paypad`.
- El historial de cargues y arqueos conserva las rutas legacy `Load/GetByPaypad` y `Tonnage/GetByPaypad`. La evidencia autenticada de Prueba1 identificó exactamente cantidades negativas en detalles (`quantity`, `quantityDp`, `quantityTotal`), que el dashboard viejo presenta sin coerción. El reader conserva ahora esos enteros con signo sólo en lectura; valores de denominación, IDs, inventario y mutaciones continúan restringidos. La vista desktop vuelve a presentar tablas con ID, responsable, valores, fecha, detalle expandible y filtros por texto; la lista de tarjetas se conserva para pantallas estrechas.
- La instrumentación BFF temporal sigue registrando sólo nombres de campos, tipos JSON, tamaños de colección y paths Zod sanitizados —nunca valores financieros, cuerpos de solicitud, cookies, tokens ni encabezados de autorización— para detectar cualquier discrepancia restante. Se habilita por defecto sólo con `npm run dev`; producción requiere activación expresa en servidor.
- Los filtros de Transacciones y Reportes inician "Desde" a las 12:00 a. m. y cierran "Hasta" de forma inclusiva a las 23:59:59.999. Permiten limitar por `Efectivo` o `Tarjeta`; el BFF filtra, ordena de forma determinista y después pagina, sin cambiar el payload legado enviado a `Transaction/GetByDate`.
- La exportación conserva `POST /api/Transaction/ExcelDoc` y el DTO legado `fileName`/`paypadId`/`transactionIds`. Se corrigió el guard del relay que comparaba `Origin` sólo contra el listener interno `0.0.0.0`: ahora normaliza el host de la solicitud y, cuando hay reverse proxy, `X-Forwarded-Host`/`X-Forwarded-Proto`, por lo que una descarga same-origin no recibe un 403 espurio. Un origin ajeno continúa bloqueado.
- El asset local existente `public/images/banner_resized.jpg` se renderiza con `next/image` en login, cabecera y navegación, también sobre el tema oscuro; no se generó ni sustituyó por un logo inventado.
- Restauración de archivos estáticos: los campos `img`, `imgDenom`, `logoImg` e imagen de perfil se solicitan automáticamente mediante la ruta same-origin `/staticfiles/...`. El BFF resuelve el path DB `/images/...` como `https://dashboardv2.e-city.co/staticfiles/images/...`, exactamente como lo hacía el frontend legado al anteponer `/staticfiles` desde su propio origen. No intenta servir esos archivos desde `apidashboardv2.e-city.co` ni inventa un fallback `/images/...` de API.
- `STATIC_FILES_BASE_ADDRESS` es un override exclusivamente server-side; sin configuración adicional usa el origen histórico verificado. El proxy no reenvía `DashboardKeyId`, Bearer, cookies ni otros secretos al host público de archivos. El navegador sólo recibe bytes same-origin.
- El helper de imágenes incorpora una revisión local que fuerza un reintento de recursos que hayan quedado marcados como fallidos por el proxy anterior; el BFF descarta esa query antes de pedir el archivo remoto.
- Se migraron los assets locales históricos de `dashboardv2-frontend/public/images` a `public/images`, incluido `profile-default.png`; perfiles sin ruta, vacíos, `NULL` o recursos que fallen conservan el fallback visual local.
- **Ningún agregado de dinero compara monedas distintas:** además del desglose, una máquina
  multimoneda (`multiCurrency` + `currencyLabels`) muestra un aviso arriba de las tarjetas y la
  nota «suma monedas distintas (no comparable)» en AP/RJ y en el total del arqueo; la alerta del
  inicio sustituye el importe por «Importe en varias monedas (COP, USD)» cuando el baúl de esa
  máquina trabaja más de una moneda (resuelto con `summarizeMachineCurrencies`, sólo para las
  máquinas con errores, caché 60 s y tope de 10 consultas de baúl por vuelta).
- **El desglose solo muestra el inventario en uso (C9):** la regla «¿la máquina trabaja esta
  denominación?» vive en `denomination-usage.ts` y la aplican **el desglose de saldos y el
  motor de atascos**, para que no se contradigan. El «Desglose por denominaciones» ya no
  muestra filas heredadas del `PayPad/GetStorage` sin configuración, sin saldo (DP/RJ/AP), sin
  cargues y sin entregas positivas: el billete de USD 1 de C.C. Centro2 se lista aparte con su
  motivo (`excludedRows`), igual que el motor hace con `ignoredDenominations`. Los valores
  negativos del arqueo se acotan a 0 con la nota «arqueo negativo, se muestra 0», y el
  inventario por moneda deja de mostrar el «USD $0» residual.
- **Agregados sin monedas mezcladas:** AP/RJ y el total del arqueo se rotulan «suma monedas
  distintas (no comparable)» en máquinas de cambio divisa, y la alerta del inicio muestra
  «Importe en varias monedas» en lugar de un número que sumaba pesos y dólares.
- **Suite de regresiones en el repositorio:** `npm run fixtures:dispensing`
  (`scripts/dispensing-fixtures.mts`, tsx, sin red ni sesión) ejecuta siete escenarios con 27
  comprobaciones y sale con código 1 si algo falla. Cubre C2–C9: tendencia que no debe alertar,
  atribución culpable/compensador, monedero «No dispensa» que sí entregaba, dos módulos
  atascados con ráfaga, diagnóstico ciego, fila heredada de USD 1 y máquina de divisa.
- **Monedas separadas en el control de dispensado (C8):** las máquinas de cambio divisa
  (COP ⇄ USD) se calculan **por moneda**: la combinación canónica, la sustitución, la
  compensación y la participación solo comparan denominaciones de la misma moneda, los pagos
  que mezclan monedas no se combinan (`mixedCurrencyPayouts`) y la conciliación por importes
  se desactiva declarándolo cuando el período usa varias monedas. El valor de cada
  denominación sale del catálogo ∪ storage (`denomination-currency.ts`), los totales de baúl
  se publican por moneda (`storageTotalsByCurrency`, nunca sumados) y cada fila e incidente
  lleva su etiqueta (`COP 100` ≠ `USD 100`). Además, una denominación solo se evalúa si la
  máquina **la usa hoy** (configurada, con saldo, con existencia en el último arqueo o
  entregando en el período): el histórico de arqueos ya no alcanza para alarmar, y lo
  descartado se informa con su motivo (`ignoredDenominations`). Corrige dos casos reales:
  el billete de USD 1 reportado como «Posible atasco» en una máquina de solo pesos y el
  falso «Atasco probable en 100» de una máquina de divisa causado por planear un pago de
  USD 100 con 1 × COP 100.
- **Alerta del inicio (errores de devuelta):** `/dashboard` muestra arriba de todo, por máquina, las
  transacciones `Aprobada Error Devuelta` **del día en curso**, con actualización automática cada 30 s
  (solo con la pestaña visible). El BFF `POST /api/dispensing/return-alerts` resuelve todas las máquinas
  server-side con caché corta (Pay+ 60 s, máquina+rango 20 s) y concurrencia 5; una máquina ilegible no
  oculta a las demás (`partialFailures`). El aviso solo aparece cuando hay errores, emite un aviso
  emergente si el contador sube entre vueltas y enlaza con `?paypad=<id>` al control de dispensado, que
  preselecciona la máquina y dispara el análisis de atascos. Sin contrato realtime en el backend (B-01),
  el sondeo es la única vía; el rango se recalcula al cambiar el día local. Ver §9 de
  `docs/DISPENSING_JAM_DETECTION.md`.
- **Detección temprana de atascos (monederos/billeteros):** el sistema infiere el atasco cruzando saldo del baúl (`dpStored`), operaciones por denominación de `Transaction/{id}/Details`, dos arqueos consecutivos y cargues. Señales con peso explícito (`devuelto_con_saldo`, `sustitucion`, `sin_caida_fisica`, `participacion_perdida`, `caida_corroborada`, `caida_insuficiente`, `caida_sin_registro`, `rafaga_salida`, `descuadre_inventario`), niveles sospecha/probable/confirmado y distinción explícita entre **atasco** (había saldo y no salió) y **agotamiento** (no había saldo). El motor reconcilia los nombres de `typeOperation` con `returnAmount`/`incomeAmount` y, si no puede, lo declara en el panel en lugar de inventar evidencia. El costo de `Transaction/{id}/Details` se acota con análisis manual, tope configurable (30 por defecto), concurrencia 5 y caché en memoria por transacción.

## Validación actual

| Criterio | Resultado |
| --- | --- |
| Tipado estricto / sin `any` | **PASA** — `npm run typecheck` (2026-09-16) |
| ESLint sin warnings | **PASA** — `npm run lint` (2026-09-16) |
| Build de producción | **PASA** — `npm run build` (2026-09-16) |
| Rutas relativas desde navegador | **PASA (código)** — API BFF y `/staticfiles/...` son same-origin |
| Origen real de assets DB | **PASA (verificación de endpoint)** — `https://dashboardv2.e-city.co/staticfiles/images/users/root.png`, `.../clients/Cliente_Pruebas.png` y una ruta de usuario con caracteres acentuados entregan imágenes reales. El valor DB permanece `/images/...`; el prefijo `/staticfiles` se agrega en servidor como en el legado. |
| Contrato de estáticos y path seguro | **PASA (integración local)** — mock HTTPS confirmó que `/staticfiles/images/...` se reenvía al host estático con el mismo path, sin query, sin `DashboardKeyId` y sin Bearer; el navegador recibe un PNG same-origin. Traversal y separadores doblemente codificados se rechazan server-side. |
| Banner E-city local | **PASA (render local)** — `/login` renderiza `public/images/banner_resized.jpg` y `/_next/image` devuelve el JPEG optimizado con HTTP 200; el mismo asset está en cabecera y navegación |
| Assets locales históricos | **PASA (local)** — `public/images/profile-default.png`, banners, logos y páginas de error se sirven automáticamente; el avatar no desaparece en la vista móvil |
| Payload de cargue y almacenamiento | **PASA (integración local)** — mock recibe detalles de cargue, totales y `minDpQuantity` como números, con IDs/campos históricos intactos |
| Payload de arqueo | **PASA (integración local)** — mock recibe `idPayPad`, `total`, `totalAp`, `totalDp`, `totalRj` como números finitos después de validar strings decimales |
| Historial e inventario sin datos | **PASA (contrato)** — los envelopes Swagger nullable de cargues, arqueos y almacenamiento (`response: null`) se normalizan a `[]`, como requieren las vistas |
| Adaptador de historial legacy con cantidades firmadas | **PASA (contrato local basado en evidencia autenticada); PENDIENTE REPETIR E2E** — el diagnóstico de Prueba1 demostró `too_small` exclusivamente en cantidades negativas de detalle. Fixtures de los dos readers confirman que preservan `-3`/`-2`, responsable y rutas exactas, sin admitir denominaciones negativas. |
| Proxy de respuestas comprimidas | **PASA (integración local)** — el BFF ya no reenvía `Content-Length` de un upstream comprimido después de que `fetch` decodifica su cuerpo; un mock gzip devolvió los 12 registros completos por el BFF con `Transfer-Encoding: chunked`. La corrección evita truncamiento potencial, pero no sustituye la prueba autenticada. |
| Diagnóstico seguro de historial | **PASA (local)** — el BFF identifica exclusivamente los dos GET legacy, registra estructura/tipos y paths Zod sin valores, y el cliente muestra hasta tres paths sanitizados sólo si el parser falla. Un fixture comprobó que una fecha y un marcador financiero no aparecen en el diagnóstico. |
| Tabla y filtros de historial | **PASA (código + TypeScript)** — escritorio usa TanStack Table con columnas equivalentes al legado, responsable, detalle expandible y filtro funcional por ID/responsable/fecha/valor; móvil conserva cards sin scroll horizontal. Pendiente inspección autenticada. |
| Motor de atascos con fixture local | **PASA (fixture local)** — el escenario del negocio (billetero de 50.000 sustituido por 20.000+10.000 y monedero de 500 con saldo que no entrega) queda en **confirmado** con caída física 0, y un fallo único aislado no genera incidente. Reconciliación del detalle verificada contra `returnAmount`. |
| Caso real Pay+ Inder 2 (ID 71) reproducido | **PASA (fixture local)** — con la configuración de la captura (500 «No dispensa», saldo 34, caída física 97, cero `Aprobada Error Devuelta`) y 12 pagos con cambio de 1.500 entregado en 15×100, el motor emite `sustitucion_no_configurada` + `config_inconsistente` ⇒ **incidente probable en el monedero de 500**, exactamente lo reportado por el operador. Antes de C1–C3 el mismo dato daba «sin señales». |
| Consulta sin máquina no bloquea los filtros | **PASA (código + evidencia del runtime)** — `QueryObserver` con `enabled:false` confirma `status:"pending"`, `isPending:true`; la guarda `paypadId !== null` impide que ese estado se traduzca en filtros deshabilitados. Pendiente inspección autenticada. |
| Suite de regresiones del control de dispensado | **PASA (local)** — `npm run fixtures:dispensing` → **37/37** comprobaciones (2026-09-17), sin red ni sesión. La suite corre **dentro de `npm run check`**, así que el comando estándar ya no valida sólo tipos y estilo. |
| Desglose sin filas heredadas | **PASA (fixture local)** — con el storage de C.C. Centro2 (500, 1000 y un USD 1 sin configuración, sin saldo, con arqueo −6): el desglose muestra solo `COP 1000` y `COP 500`, el USD 1 queda en excluidas con el motivo completo, los totales por moneda se quedan en COP y la entrega negativa se muestra como 0 declarando el −6. Sin incidentes en el motor. |
| Monedas separadas (máquina de cambio divisa) | **PASA (fixture local)** — con catálogo COP/USD: dos pagos de **USD 100** entregados con un billete de USD 100 y un monedero de COP 100 con saldo ya **no** producen ninguna señal sobre el 100 (antes: `sustitucion` × 2 ⇒ «Atasco probable en la denominación 100»); la sustitución **real** dentro de USD (pagos de USD 10 entregados como 2 × USD 5) sigue detectándose con el titular «Posible atasco en la denominación **USD 10** — el cambio se entrega con USD 5», y las filas `COP 100` y `USD 100` quedan distinguibles. |
| Denominación que la máquina no usa hoy (billete de USD 1 en máquina de pesos) | **PASA (fixture local)** — réplica de la captura reportada: la fila USD 1 (sin configuración, sin saldo, arqueo antiguo con caída de 6) generaba `config_inconsistente` ⇒ «Posible atasco» / «Implicada»; ahora queda fuera del diagnóstico y se explica en la lista de no evaluadas con el motivo («el histórico de arqueos sí la movió: módulo retirado, reconfigurado o unidades extraídas»). El titular pasa a «No se detectaron señales de atasco». |
| Totales por moneda | **PASA (fixture local)** — `storageTotalsByCurrency` devuelve `COP 40000` y `USD 200` por separado; la suma plana (40.200) ya no se muestra en la UI. |
| Alerta del inicio: errores de devuelta del día | **PASA (código + contrato local)** — `npm run check` y `npm run build` limpios (2026-09-17). `POST /api/dispensing/return-alerts` sin sesión responde **401** (no 500) y el rango construido en zona Bogotá es `00:00 → 23:59:59.999` locales. La respuesta se valida con `returnAlertsResponseSchema` (fixture: 2 máquinas, 1 con error) y una respuesta mal formada se rechaza. `Date.now()` durante el render y el `setState` en efecto se eliminaron (reglas `react-hooks/purity` y `set-state-in-effect`), por lo que la preselección por `?paypad=` sale del estado inicial. Pendiente: verlo con datos reales y sesión (B-04/B-05). |
| Falso positivo por tendencia de uso | **PASA (fixture local)** — con el 2.000 entregando 18 unidades en el período, 255 en el arqueo y una caída de participación del 100 % al 40 %, el motor no emite incidentes (`0`); antes reportaba «Posible atasco en 2000». |
| Atribución culpable vs compensador | **PASA (fixture local)** — con el 500 atascado (34 unidades, «No dispensa»), 10 pagos de cambio 1.000 entregados como 10×100, dos errores devuelta en monedas de 100 (24 unidades) y un arqueo del 100 que baja menos de lo dispensado, el titular es **«Posible atasco en la denominación 500 — el cambio se entrega con 100»** y el 100 queda como **Compensando** (sin señales de atasco). Antes de C4 el único incidente era «atasco en 100». |
| Normalizador de detalles legacy | **PASA (fixture local)** — formas probadas: enteros del DTO real, strings, `typeOperation` nulo, `response: null`, arreglo plano y entradas basura; ninguna lanza y las inválidas se cuentan como `detailsMalformed`. |
| Caso ciego (30/30 detalles sin respuesta) | **PASA (fixture local)** — el titular pasa a «Diagnóstico incompleto» con el motivo sanitizado, en lugar de afirmar que no hay señales. |
| Filtro, hora y orden de transacciones | **PASA (integración local)** — mock HTTPS confirmó filtro `Tarjeta`, enriquecimiento `PayPad.username`, orden de importes/fecha antes de paginar y rangos `00:00:00.000` a `23:59:59.999`. |
| Relay de Excel, DTO y origen | **PASA (integración local)** — fixture HTTPS verificó `POST /api/Transaction/ExcelDoc`, body legacy, Bearer server-side, MIME, `Content-Disposition` y firma binaria `PK` a través del BFF. `Origin` ajeno devuelve 403 sin llamar al upstream; la simulación de host público detrás de proxy devuelve el XLSX. |
| Payload de configuración Pay+ | **PASA (integración local)** — create omite `id`/`paypad`; update conserva `id` e `idUserCreated`, igual que el formulario legado |
| Secretos y upstream sólo server-side | **PASA (código)** |
| Imágenes reales de denominaciones/billetes dentro de la UI autenticada | **PENDIENTE E2E** |
| Cargues y arqueos con datos reales de Prueba1 después de admitir cantidades negativas | **PENDIENTE REPETIR E2E** — la evidencia que causó el cambio es auténtica, pero aún no existe captura posterior que confirme ambos listados y sus detalles. |
| Descarga Excel y vídeo reales | **PENDIENTE E2E** |
| Estados skeleton / vacío / error-reintento / sin permisos | **PENDIENTE E2E** en todas las vistas |
| Confirmaciones destructivas/financieras | **PENDIENTE E2E** |

## SUPUESTOS Y BLOQUEOS

1. **B-01 — Eventos realtime:** no se encontró un contrato WebSocket/SignalR ni una implementación de Hub en el backend legado. No se inventó una conexión ni payload; la alerta de errores de devuelta del inicio usa **sondeo del navegador cada 30 s** con caché corta en el BFF (§9 de `docs/DISPENSING_JAM_DETECTION.md`), no un canal servidor→navegador.
2. **B-02 — Idempotencia financiera:** el backend no acepta un idempotency key ni documenta deduplicación. La UI previene doble envío durante la mutación, pero la garantía distribuida exige cambio backend.
3. **B-03 — Parámetros de listas:** el upstream devuelve colecciones completas. El BFF aplica paginación/filtro/orden en servidor para transacciones; otros recursos conservan el contrato de lista legado.
4. **B-04 — Red de este agente:** la conexión TLS directa del sandbox al API productivo falla (`SSL_ERROR_SYSCALL`). Esto no bloqueó comprobar el host estático público por una ruta independiente, pero sí impide una sesión/API E2E desde este entorno.
5. **B-05 — Sesión de prueba:** no hay una credencial o cookie de sesión autorizada disponible para este agente. No se intentaron credenciales ni se realizaron mutaciones financieras de prueba. La ausencia de sesión sólo deja pendiente validar cada imagen y flujo dentro de las pantallas con datos reales.
6. **B-06 — Forma runtime de historial:** la captura autenticada de Prueba1 aportó la evidencia faltante: `quantity`, `quantityDp` y `quantityTotal` son enteros negativos en algunos detalles, y el dashboard viejo los muestra. El adapter acepta signo sólo en esas cantidades de lectura; IDs, denominaciones y mutaciones no se relajaron. Falta una repetición E2E posterior para descartar otra diferencia no visible.
7. **B-07 — Configuración upstream:** `GET PayPad/GetConfiguration` devuelve desde el backend `Invalid column name 'VALIDATE_PERIPHERALS'. Could not use view or function 'business.PayPadConfigurationView' because of binding errors.` Es un binding error SQL/backend independiente del parser de historial. El frontend lo conserva visible; no inventa columnas, una vista ni un fallback.
8. **B-08 — Catálogo de operaciones del detalle:** `idTypeOperation`/`typeOperation` provienen de la base (`SP_GetTransactionDetailsByTransaction` → `TransactionDetailDto`) y sus valores no están en el repositorio. El motor clasifica por palabras clave y reconcilia contra los importes; confirmar los valores reales con una sesión autorizada para cerrar la calibración.

## ESTADO DEL BACKLOG

No se declara la migración terminada. La evidencia autenticada permitió corregir una diferencia concreta: los detalles históricos de Prueba1 contienen cantidades negativas y el dashboard antiguo las muestra, por lo que el reader de sólo lectura ya conserva su signo. También se restauró el formato de tabla, responsable, detalle expandible y filtros funcionales en desktop, manteniendo cards móviles. La revisión de Excel aisló y corrigió un 403 reproducible antes del upstream: el guard del relay confundía el listener interno `0.0.0.0` con el origen del navegador; ahora conserva la protección CSRF y admite el host público correcto. Sin embargo, todavía faltan una captura E2E posterior de Cargues/Arqueos de Prueba1 y una descarga Excel autenticada contra producción. El error `VALIDATE_PERIPHERALS` de Configuración sigue visible como fallo SQL upstream independiente. Restan esas pruebas, billetes/denominaciones, vídeo y controles visibles antes de declarar paridad funcional completa.
