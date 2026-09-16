# AGENT TASK BACKLOG

> **Actualizado:** 2026-09-16
> **Criterio de estado:** `PASA` requiere TypeScript, ESLint, build y la prueba funcional indicada. Una ruta o componente aislado no cierra una fase.

| Fase | Entrega | Estado | Evidencia / pendiente |
| --- | --- | --- | --- |
| 0 | Sistema de diseño | **PASA (código + render local)** | Tailwind v4 CSS-first, tokens del manual, tema claro/oscuro y primitives. El banner E-city existente aparece en login, cabecera y navegación; falta inspección visual autenticada de todos los flujos. |
| 1 | Tipos e infraestructura | **PASA (código + integración local)** | Zod, Query, BFF relativo, sesión HttpOnly y cifrado server-side. El BFF de assets usa el origen estático histórico verificado, separado del API. |
| 2 | Usuarios y administración habilitadora | **ORIGEN REAL DE IMÁGENES APLICADO; PENDIENTE E2E** | CRUD de Usuarios, Clientes, Sucursales, Roles, Rutas y Maestros implementado. `img`/`logoImg` se solicitan automáticamente por `/staticfiles/...`; la nueva ruta apunta a `dashboardv2.e-city.co/staticfiles`, que entrega archivos DB reales. Falta comprobarlos dentro de una sesión de la UI. |
| 3 | Cargues | **FALLA EN E2E AUTENTICADO; DIAGNÓSTICO SEGURO LISTO** | La captura real de Pay+ Prueba1 aún muestra “La aplicación recibió una respuesta con formato inesperado”. Se conserva la ruta legacy y se añadió instrumentación estructural sin valores para identificar el contrato exacto; no se relajó otro campo por hipótesis. |
| 4 | Arqueos | **FALLA EN E2E AUTENTICADO; DIAGNÓSTICO SEGURO LISTO** | La misma captura real continúa fallando para arqueos. Los paneles y rutas siguen aislados; falta capturar la estructura autenticada y corregir únicamente la discrepancia demostrada. |
| 5 | Monitoreo y reportes | **PENDIENTE E2E** | Transacciones, detalle, vídeo, Excel, filtros/orden/paginación BFF y filtros de Pay+ por nombre, sucursal y dirección están implementados. La búsqueda resuelve `idPayPad` contra `PayPad.username`, inicia el día a las 12:00 a. m., permite filtrar Efectivo/Tarjeta y ordena antes de paginar. Falta validar descargas y datos productivos reales. |

## Trabajo implementado

- Autenticación, sesión, logout y navegación basada en rutas/permisos del rol.
- Gestión de Usuarios, Clientes, Sucursales, Roles, Rutas, Monedas, Regiones, Tipos de documento y Denominaciones.
- Gestión de Pay+: crear, editar, eliminar, cambiar contraseña, configurar puertos, configurar denominaciones, cargues, arqueos e historial.
- Alertas: crear y eliminar suscripciones por Pay+.
- Transacciones y Reportes: consulta por fechas/Pay+, resumen, detalle por denominación, descarga de vídeo y exportación Excel.
- Modo oscuro seleccionable y filtro por texto/estado para encontrar Pay+, incluida sucursal y dirección resueltas desde `GET /api/Office`.
- El nombre de Pay+ se resuelve con `username`, luego el alias histórico `userName`; `description` no sustituye la identidad de máquina. El fallback `Pay+ <id>` se usa sólo al presentar un valor ausente, nunca al persistirlo. La búsqueda de transacciones añade server-side `paypadUsername` desde esa lista y el diálogo de detalle usa ese valor, no `transaction.paypad`.
- El historial de cargues y arqueos conserva las rutas legacy `Load/GetByPaypad` y `Tonnage/GetByPaypad`, pero la última prueba autenticada de Pay+ Prueba1 demuestra que el adaptador actual todavía rechaza ambos payloads. Se añadió una instrumentación BFF temporal y segura: registra sólo nombres de campos, tipos JSON, tamaños de colección y paths Zod sanitizados —nunca valores financieros, cuerpos de solicitud, cookies, tokens ni encabezados de autorización— para identificar la única discrepancia que debe corregirse. Esta instrumentación se habilita por defecto sólo con `npm run dev`; producción requiere activarla expresamente en servidor.
- Los filtros de Transacciones y Reportes inician "Desde" a las 12:00 a. m. y cierran "Hasta" de forma inclusiva a las 23:59:59.999. Permiten limitar por `Efectivo` o `Tarjeta`; el BFF filtra, ordena de forma determinista y después pagina, sin cambiar el payload legado enviado a `Transaction/GetByDate`.
- El asset local existente `public/images/banner_resized.jpg` se renderiza con `next/image` en login, cabecera y navegación, también sobre el tema oscuro; no se generó ni sustituyó por un logo inventado.
- Restauración de archivos estáticos: los campos `img`, `imgDenom`, `logoImg` e imagen de perfil se solicitan automáticamente mediante la ruta same-origin `/staticfiles/...`. El BFF resuelve el path DB `/images/...` como `https://dashboardv2.e-city.co/staticfiles/images/...`, exactamente como lo hacía el frontend legado al anteponer `/staticfiles` desde su propio origen. No intenta servir esos archivos desde `apidashboardv2.e-city.co` ni inventa un fallback `/images/...` de API.
- `STATIC_FILES_BASE_ADDRESS` es un override exclusivamente server-side; sin configuración adicional usa el origen histórico verificado. El proxy no reenvía `DashboardKeyId`, Bearer, cookies ni otros secretos al host público de archivos. El navegador sólo recibe bytes same-origin.
- El helper de imágenes incorpora una revisión local que fuerza un reintento de recursos que hayan quedado marcados como fallidos por el proxy anterior; el BFF descarta esa query antes de pedir el archivo remoto.
- Se migraron los assets locales históricos de `dashboardv2-frontend/public/images` a `public/images`, incluido `profile-default.png`; perfiles sin ruta, vacíos, `NULL` o recursos que fallen conservan el fallback visual local.

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
| Adaptador de historial legado | **PASA sólo en integración local; FALLA E2E autenticado** — las rutas y los casos mock continúan pasando, pero Pay+ Prueba1 devuelve un 2xx que el parser actual rechaza tanto para cargues como arqueos. No se considera una validación funcional. |
| Proxy de respuestas comprimidas | **PASA (integración local)** — el BFF ya no reenvía `Content-Length` de un upstream comprimido después de que `fetch` decodifica su cuerpo; un mock gzip devolvió los 12 registros completos por el BFF con `Transfer-Encoding: chunked`. La corrección evita truncamiento potencial, pero no sustituye la prueba autenticada. |
| Diagnóstico seguro de historial | **PASA (local)** — el BFF identifica exclusivamente los dos GET legacy, registra estructura/tipos y paths Zod sin valores, y el cliente muestra hasta tres paths sanitizados sólo si el parser falla. Un fixture comprobó que una fecha y un marcador financiero no aparecen en el diagnóstico. |
| Filtro, hora y orden de transacciones | **PASA (integración local)** — mock HTTPS confirmó filtro `Tarjeta`, enriquecimiento `PayPad.username`, orden de importes/fecha antes de paginar y rangos `00:00:00.000` a `23:59:59.999`. |
| Payload de configuración Pay+ | **PASA (integración local)** — create omite `id`/`paypad`; update conserva `id` e `idUserCreated`, igual que el formulario legado |
| Secretos y upstream sólo server-side | **PASA (código)** |
| Imágenes reales de denominaciones/billetes dentro de la UI autenticada | **PENDIENTE E2E** |
| Cargues y arqueos con datos de un Pay+ real | **PENDIENTE E2E** |
| Descarga Excel y vídeo reales | **PENDIENTE E2E** |
| Estados skeleton / vacío / error-reintento / sin permisos | **PENDIENTE E2E** en todas las vistas |
| Confirmaciones destructivas/financieras | **PENDIENTE E2E** |

## SUPUESTOS Y BLOQUEOS

1. **B-01 — Eventos realtime:** no se encontró un contrato WebSocket/SignalR ni una implementación de Hub en el backend legado. No se inventó una conexión ni payload.
2. **B-02 — Idempotencia financiera:** el backend no acepta un idempotency key ni documenta deduplicación. La UI previene doble envío durante la mutación, pero la garantía distribuida exige cambio backend.
3. **B-03 — Parámetros de listas:** el upstream devuelve colecciones completas. El BFF aplica paginación/filtro/orden en servidor para transacciones; otros recursos conservan el contrato de lista legado.
4. **B-04 — Red de este agente:** la conexión TLS directa del sandbox al API productivo falla (`SSL_ERROR_SYSCALL`). Esto no bloqueó comprobar el host estático público por una ruta independiente, pero sí impide una sesión/API E2E desde este entorno.
5. **B-05 — Sesión de prueba:** no hay una credencial o cookie de sesión autorizada disponible para este agente. No se intentaron credenciales ni se realizaron mutaciones financieras de prueba. La ausencia de sesión sólo deja pendiente validar cada imagen y flujo dentro de las pantallas con datos reales.
6. **B-06 — Forma runtime de historial:** la captura autenticada posterior de Pay+ Prueba1 demuestra que ambos readers continúan rechazando el 2xx real, incluso después del adaptador inicial. Swagger y el código fuente no incluyen ese cuerpo real. No se convierte el fallo en `[]` ni se relaja otro campo: el BFF ahora puede registrar una huella sin valores (estructura, tipos y paths Zod) durante `npm run dev`, y el estado de error muestra esos mismos paths sanitizados. Se debe usar esa evidencia antes de modificar el schema.
7. **B-07 — Configuración upstream:** `GET PayPad/GetConfiguration` devuelve desde el backend `Invalid column name 'VALIDATE_PERIPHERALS'. Could not use view or function 'business.PayPadConfigurationView' because of binding errors.` Es un binding error SQL/backend independiente del parser de historial. El frontend lo conserva visible; no inventa columnas, una vista ni un fallback.

## ESTADO DEL BACKLOG

No se declara la migración terminada. La última evidencia autenticada invalida la corrección anterior de historial: Cargues y Arqueos de Pay+ Prueba1 todavía muestran el error de formato, por lo que mocks, schemas y builds locales no son sustitutos de esa prueba. Este ciclo corrige además un defecto objetivo de relay de respuestas comprimidas y deja una instrumentación temporal que no registra datos financieros ni credenciales; debe producir la estructura real antes de tocar otra regla Zod. El error `VALIDATE_PERIPHERALS` de Configuración sigue visible como fallo SQL upstream independiente. Restan la corrección basada en evidencia y las pruebas E2E autenticadas de historial, billetes/denominaciones, Excel, vídeo y controles visibles antes de declarar paridad funcional completa.
