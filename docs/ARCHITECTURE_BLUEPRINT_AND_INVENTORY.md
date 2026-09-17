# ARCHITECTURE BLUEPRINT & INVENTORY

> **Actualizado:** 2026-09-17
> **Alcance:** sustitución del frontend CRA `dashboardv2-frontend/` por la aplicación Next.js de la raíz. El frontend y backend legados permanecen como fuente de verdad de comportamiento y no se modifican.
> **Estado:** arquitectura y superficie de rutas implementadas; la paridad funcional contra datos productivos reales sigue en validación.

## Arquitectura implementada

| Capa | Implementación |
| --- | --- |
| Aplicación | Next.js 16.3.5 App Router, React 19 y TypeScript 5.9 con `strict` y `noUncheckedIndexedAccess`. |
| Diseño | Tailwind CSS v4 CSS-first y tokens derivados de `ManualDeMarca.md` en `src/app/globals.css`; componentes Radix/Shadcn tematizados en `src/components/ui/`. El banner corporativo existente `public/images/banner_resized.jpg` se usa en login, cabecera y navegación. |
| Sesión | Login RSA-OAEP SHA-1/Base64 server-side, JWT exclusivamente en cookie HttpOnly, `SameSite=Strict`; logout y carga de usuario/rol server-side. |
| API BFF | El navegador consume rutas relativas. `src/app/api/backend/[...path]/route.ts` agrega `DashboardKeyId` y token sólo al API productivo en el servidor; para métodos mutables valida el origen público desde `Host`/headers de proxy además del listener interno. |
| Assets BFF | `src/app/staticfiles/[...path]/route.ts` resuelve los paths DB `/images/...` contra `https://dashboardv2.e-city.co/staticfiles/...`, el origen estático del dashboard legado verificado con archivos reales. Esta ruta no envía API key, Bearer ni cookies al host de archivos y devuelve al navegador únicamente bytes same-origin. |
| Datos | TanStack Query v5, claves jerárquicas por dominio y contratos Zod en cada borde de API. |
| Formularios | React Hook Form + Zod; controles con labels, feedback y estado pendiente. |
| Tablas | TanStack Table v8: tabla en escritorio amplio y cards en formatos menores, sin scroll horizontal de página. |

## Inventario de rutas migradas

| Ruta Next | Equivalente legado | Estado actual |
| --- | --- | --- |
| `/login` | Login | Implementado; prueba de inicio con credencial real pendiente. |
| `/dashboard` | Inicio | Implementado; inspección autenticada pendiente. |
| `/dashboard/users` | `/Admin/Users` | CRUD, contraseña e imagen implementados; E2E pendiente. |
| `/dashboard/clients` | `/Admin/Costumers` | CRUD y logotipo implementados; E2E pendiente. |
| `/dashboard/offices` | `/Admin/Offices` | CRUD implementado; E2E pendiente. |
| `/dashboard/roles` | `/Admin/Roles` | CRUD de roles, rutas y permisos implementado; E2E pendiente. |
| `/dashboard/routes` | `/Admin/Routes` | Administración de rutas implementada; E2E pendiente. |
| `/dashboard/masters/*` | Maestros | Monedas, regiones, tipos de documento y denominaciones implementados; imágenes reales pendientes de inspección dentro de UI. |
| `/dashboard/paypads` | `/Admin/PayPad` | CRUD, contraseña, almacenamiento y flujos de Pay+ implementados. El reader de Cargues/Arqueos ya conserva las cantidades negativas demostradas por Prueba1 y la vista desktop recupera tabla/filtro; falta repetir la prueba autenticada. Configuración propaga un fallo SQL upstream. |
| `/dashboard/alerts` | `/Admin/Alerts` | Suscripciones por Pay+ y eliminación confirmada implementadas; E2E pendiente. |
| `/dashboard/transactions` | `/Transactions` | Consulta, resumen, detalle, vídeo y Excel implementados; descargas reales pendientes. |
| `/dashboard/transactions/dispensing-control` | `/Admin/Transactions/DispensingControl` | Métricas AP/DP/RJ, saldos por denominación y **detección de atascos** (motor puro + BFF acotado `POST /api/dispensing/jams`); E2E pendiente. |
| `/dashboard/reports` | `/Reports` | Consulta por Pay+/todos, intervalo, producto, orden y paginación implementados; E2E pendiente. |

## Contratos y decisiones de seguridad

- Contraseñas de login, Usuarios y Pay+ se cifran con la clave RSA en el servidor. La clave no se expone al bundle ni se versiona.
- Los importes monetarios son `string` decimal y los cálculos usan `BigInt` escalado a centavos; no se emplean `number` para importes.
- Las fechas enviadas a `Transaction/GetByDate` se convierten a ISO 8601 UTC explícito (`yyyy-MM-ddTHH:mm:ss.fffZ`), que es el formato comprobado en el controlador legado. El filtro inicia el día actual en 12:00 a. m. y, al mostrar `datetime-local` con precisión de minutos, transforma el límite final de 23:59 en 23:59:59.999 para conservar el rango inclusivo del calendario antiguo.
- Cargues, arqueos y eliminaciones esperan la mutación antes de cerrar; se deshabilitan durante `isPending`, muestran feedback y las operaciones irreversibles requieren confirmar el ID del registro.
- El BFF de búsqueda de transacciones aplica filtro, orden y paginación en servidor porque el API legado devuelve colecciones completas sin protocolo de paginación. El filtro de medio de pago se limita a los valores usados por el legado (`Efectivo`, `Tarjeta`) y el orden se aplica antes de cortar la página.
- El relay BFF no reenvía `Content-Length` desde upstream: `fetch` puede descomprimir el cuerpo y ese tamaño describir bytes distintos. La respuesta se entrega chunked, preservando el cuerpo completo. Un fixture gzip lo verificó localmente; todavía no se usa como evidencia de que el payload autenticado ya pase Zod.
- Excel conserva el flujo legado: `POST /api/Transaction/ExcelDoc`, cuerpo JSON `fileName`/`paypadId`/`transactionIds`, Bearer server-side y bytes XLSX descargados mediante un object URL. Se corrigió el guard de origen del relay genérico: al ejecutar Next con `--hostname 0.0.0.0`, `request.nextUrl.origin` describe el listener y no `localhost` ni el host HTTPS público, por lo que un POST legítimo se rechazaba con 403 antes de llegar al upstream. Ahora compara `Origin` normalizado con el host de la solicitud y, detrás de proxy, `X-Forwarded-Host`/`X-Forwarded-Proto`; no se eliminó la protección CSRF.
- Los paths históricos de imagen (`/images/...`, `/staticfiles/images/...`, barras inversas y URLs absolutas) se normalizan a un path relativo seguro `/staticfiles/...`; cadenas `NULL`/`undefined`, traversal y separadores codificados repetidamente se rechazan. El valor persistido no se altera: el BFF inserta el prefijo `/staticfiles` y lo solicita al **origen del frontend legado**, `dashboardv2.e-city.co`, no a `apidashboardv2.e-city.co`.
- `STATIC_FILES_BASE_ADDRESS` es un override server-side validado como URL HTTPS. Si no se define, usa el host legado anterior sin requerir que la persona usuaria configure ni descubra una URL. El proxy descarta la query de revisión local y restringe cada segmento para evitar traversal; a diferencia del API BFF, no reenvía `DashboardKeyId`, Authorization ni cookies al host de archivos.
- `backendStaticFilePath` vive en un módulo compartido sin directiva cliente para que los layouts server-rendered y las tablas interactivas generen exactamente la misma URL. Su revisión local fuerza un reintento tras la corrección de origen sin cambiar el path remoto. Los assets de interfaz de `dashboardv2-frontend/public/images` se migraron a `public/images`; `profile-default.png` es fallback sólo para perfiles sin imagen o una respuesta de recurso fallido.
- El nombre visible de una máquina procede de `username`, con `userName` como alias histórico. `description` se mantiene como campo editable y no se usa como identidad; `Pay+ <id>` es un fallback sólo de presentación. `/api/transactions/search` resuelve cada `idPayPad` contra esa lista y añade `paypadUsername` al resultado server-side; el detalle de transacción no usa el campo descriptivo `transaction.paypad`. Las tarjetas resuelven sucursal/dirección globales mediante `GET /api/Office`.
- De acuerdo con Swagger, `LoadDto.details`, `TonnageDto.details` y los envelopes de lista nullable se manejan sin tratar la ausencia de movimientos como error. La evidencia autenticada de Pay+ Prueba1 identificó la diferencia concreta: algunos detalles contienen enteros negativos en `quantity`, `quantityDp` y `quantityTotal`, que el dashboard viejo presenta. El adaptador conserva el signo sólo en esas cantidades de lectura; denominaciones, IDs y payloads de escritura mantienen sus límites. La vista desktop usa TanStack Table con responsable, valores, fecha, detalle expandible y filtro; la alternativa móvil mantiene cards. Durante `npm run dev`, el BFF sigue registrando una huella segura del GET exacto —nombres de campo, tipos JSON, tamaños y paths Zod, nunca valores/cookies/tokens— para detectar una posible discrepancia restante.
- El detalle de transacción (`GET Transaction/{id}/Details`) se **normaliza, no se valida de forma estricta**: el DTO legacy expone `CurrencyDenomination`/`Quantity` como enteros y un `z.string()` provocaba que todos los detalles fallaran (30/30) dejando ciego el diagnóstico de atascos. `detail-normalizer.ts` acepta números/strings, `response: null`, arreglos planos y entradas basura, y reporta `detailsMalformed`; ninguna diferencia de forma vuelve a tumbar el análisis.
- La detección de atascos no crea endpoints en el backend legado: reutiliza `Transaction/GetByDate`, `Transaction/{id}/Details`, `PayPad/GetStorage`, `Tonnage/GetByPad` y `Load/GetByPad`. El BFF nuevo (`/api/dispensing/jams`) acota el análisis (prioriza `Aprobada Error Devuelta`, tope de transacciones, concurrencia 5) y cachea en memoria detalles inmutables por `id` de transacción; nunca expone cookies ni el token. Ver `docs/DISPENSING_JAM_DETECTION.md`.
- El arqueo envía de nuevo el snapshot legado completo (`idPayPad`, `total`, `totalAp`, `totalDp`, `totalRj`) y lo convierte a números finitos únicamente en el BFF antes de enviarlo al API histórico.

## Calidad verificada

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | **PASA** — 2026-09-16 |
| `npm run lint` | **PASA** — cero warnings, 2026-09-16 |
| `npm run build` | **PASA** — rutas App Router y handlers compilados, 2026-09-16 |
| `git diff --check` | **PASA** — 2026-09-16 |
| Reader de historial con cantidades firmadas | **PASA (contrato local basado en evidencia autenticada); PENDIENTE REPETIR E2E** — Prueba1 señaló `too_small` únicamente en cantidades negativas de detalle. Fixtures de cargues/arqueos conservan esas cantidades, el responsable y las rutas originales, sin permitir denominaciones negativas. |
| Tabla y filtros de historial | **PASA (código + TypeScript)** — desktop usa TanStack Table con columnas de ID, responsable, importes, fecha y detalle; el filtro busca por ID/responsable/fecha/valor. Móvil usa cards sin scroll horizontal. Pendiente inspección autenticada. |
| Relay de respuesta comprimida | **PASA (integración local)** — un upstream gzip con `Content-Length` comprimido llegó completo al navegador simulado a través del BFF, que respondió chunked sin un tamaño de bytes obsoleto. |
| Diagnóstico seguro de historial | **PASA (local)** — fixture verificó rutas legacy exclusivas, paths Zod sanitizados y que ni un marcador financiero ni una fecha de payload se imprimen. |
| Filtro, fecha y orden de transacciones | **PASA (integración local)** — mock HTTPS confirmó `Efectivo`/`Tarjeta`, nombre `PayPad.username`, orden de total/fecha antes de paginar y límites diarios `00:00:00.000`/`23:59:59.999`. |
| Relay binario de Excel y origen | **PASA (integración local)** — fixture HTTPS recibió el `POST /api/Transaction/ExcelDoc` con el DTO legado, Bearer y `Content-Type` intactos; el BFF devolvió los bytes con firma XLSX `PK`, MIME y `Content-Disposition`. El mismo POST con `Origin` ajeno siguió en 403, y una simulación de host HTTPS detrás de proxy pasó sin depender del listener `0.0.0.0`. |
| Banner E-city local | **PASA (render local)** — `/login` contiene `banner_resized.jpg` y el optimizador de Next devuelve el JPEG local HTTP 200. |
| Payload de cargue y almacenamiento | **PASA (integración local)** — mock HTTPS recibió detalles/totales del cargue y `minDpQuantity` como números, preservando IDs y nombres de campo históricos. |
| Payload de arqueo | **PASA (integración local)** — mock HTTPS recibió `idPayPad`, `total`, `totalAp`, `totalDp` y `totalRj` como números finitos, tras la validación de strings decimales del BFF. |
| Historial e inventario vacío | **PASA (contrato)** — `response: null` en las listas Swagger de cargues, arqueos y almacenamiento se normaliza a una lista vacía. |
| Payload de configuración Pay+ | **PASA (integración local)** — create omitió `id`/`paypad`; update transportó `id` e `idUserCreated`, como hacía el formulario legado. |
| Normalización de paths de imágenes | **PASA** — pruebas locales cubrieron ruta legado, prefijo `staticfiles`, URL absoluta, barras inversas, espacios codificados, `NULL`, traversal y separadores doblemente codificados. |
| Host real de assets DB | **PASA (endpoint verificado)** — `dashboardv2.e-city.co/staticfiles/images/users/root.png`, `.../clients/Cliente_Pruebas.png` y una imagen de usuario con caracteres acentuados existen y devuelven imágenes reales; confirma el mecanismo de URL del frontend legado. |
| Contrato del proxy de estáticos | **PASA (integración local)** — mock HTTPS confirmó el path remoto `/staticfiles/images/...`, descarta la query local, no recibe `DashboardKeyId` ni Bearer y devuelve un PNG same-origin. |
| Assets locales y fallback de perfil | **PASA (local)** — assets históricos están en `public/images`; `/images/profile-default.png` devuelve 200 y se usa cuando no hay `IMG` válido o el recurso falla. |
| Login/página sin sesión | **PASA parcial** — `/login` devuelve 200 y las áreas privadas redirigen a `/login`. |
| Cargues y arqueos con sesión real (Pay+ Prueba1) | **PENDIENTE REPETIR E2E** — la captura real aisló las cantidades negativas y la corrección está aplicada, pero no hay aún una prueba posterior de los dos listados y sus detalles. |
| Imágenes, Excel y vídeo con sesión real | **PENDIENTE E2E** |

## SUPUESTOS Y BLOQUEOS

| ID | Hecho comprobado | Impacto | Tratamiento aplicado |
| --- | --- | --- | --- |
| B-01 | No hay endpoint, Hub SignalR, WebSocket, eventos ni contrato de autenticación realtime en frontend/backend legado. | La parte de eventos de “Monitoreo en Tiempo Real” no se puede implementar sin inventar una URL o payload. | No se agregó un websocket simulado. Transacciones y reportes usan TanStack Query como fuente de verdad. |
| B-02 | El API legado no expone `Idempotency-Key` ni mecanismo de deduplicación para cargues/arqueos. | No es posible garantizar idempotencia distribuida desde el cliente. | Botones se bloquean en `isPending`, la confirmación es explícita y Query invalida/refresca al terminar. Debe añadirse soporte backend para garantía transaccional completa. |
| B-03 | Las operaciones retornan listas completas sin paginación/filtro/orden upstream. | Las tablas no pueden delegar esos parámetros al API legado. | El BFF `/api/transactions/search` procesa filtro/orden/paginación server-side sin exponer credenciales. |
| B-04 | La conexión TLS directa desde este sandbox a `https://apidashboardv2.e-city.co` falla con `SSL_ERROR_SYSCALL`. | Este agente no puede completar una prueba autenticada directa contra el upstream. | No se interpreta como caída del API. El host estático independiente sí se comprobó; la UI/API E2E queda pendiente para una sesión autorizada. |
| B-05 | No hay una credencial ni cookie de sesión autorizada disponible para este agente. | No se pueden ejecutar operaciones reales ni comprobar cada combinación de pantalla, usuario/cliente/denominación y Pay+ sin arriesgar datos. | No se adivinaron credenciales ni se enviaron mutaciones financieras de prueba. |
| B-06 | La captura autenticada de Prueba1 identificó `too_small` en `quantity`, `quantityDp` y `quantityTotal`: hay cantidades negativas de detalle que la tabla antigua muestra. | La validación no puede tratar una cantidad histórica negativa como error ni extender ese permiso a IDs, denominaciones o mutaciones. | El reader acepta enteros con signo exclusivamente en esas propiedades de lectura; la BFF conserva su diagnóstico sin valores por si la repetición E2E revela una diferencia adicional. |
| B-07 | `PayPad/GetConfiguration` devuelve `Invalid column name 'VALIDATE_PERIPHERALS'` y un error de binding de `business.PayPadConfigurationView`. | La configuración del Pay+ no puede completarse mientras el backend/DB estén desalineados. | Se propaga como error backend visible. No se agrega una columna, vista ni fallback desde el cliente, y no se confunde con el parser de historial. |

## ESTADO DEL BACKLOG

La arquitectura no se presenta como cierre de producción. La captura autenticada permitió sustituir una hipótesis por un contrato concreto: los movimientos históricos de Prueba1 pueden tener cantidades negativas, que ahora se preservan sólo al leer. También se recuperó una presentación funcional de tabla, responsable, detalle y filtro para escritorio, con cards para móvil. La revisión de Excel encontró una causa reproducible: el guard CSRF del relay comparaba el `Origin` del navegador con el listener interno `0.0.0.0`, por lo que bloqueaba el POST binario válido antes de llamar al endpoint legado; la comparación ya considera el host público sin abrir el relay a orígenes ajenos. Falta la comprobación autenticada posterior que confirme ambos historiales, detalles y una descarga Excel de Prueba1. El error SQL de `VALIDATE_PERIPHERALS` permanece separado y visible como problema backend. Siguen siendo obligatorias esas pruebas, junto con billetes/denominaciones, vídeo y controles, antes de declarar paridad funcional completa.
