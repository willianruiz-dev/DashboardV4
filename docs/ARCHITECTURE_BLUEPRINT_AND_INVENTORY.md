# ARCHITECTURE BLUEPRINT & INVENTORY

> **Actualizado:** 2026-09-16
> **Alcance:** sustitución del frontend CRA `dashboardv2-frontend/` por la aplicación Next.js de la raíz. El frontend y backend legados permanecen como fuente de verdad de comportamiento y no se modifican.
> **Estado:** arquitectura y superficie de rutas implementadas; la paridad funcional contra datos productivos reales sigue en validación.

## Arquitectura implementada

| Capa | Implementación |
| --- | --- |
| Aplicación | Next.js 16.3.5 App Router, React 19 y TypeScript 5.9 con `strict` y `noUncheckedIndexedAccess`. |
| Diseño | Tailwind CSS v4 CSS-first y tokens derivados de `ManualDeMarca.md` en `src/app/globals.css`; componentes Radix/Shadcn tematizados en `src/components/ui/`. |
| Sesión | Login RSA-OAEP SHA-1/Base64 server-side, JWT exclusivamente en cookie HttpOnly, `SameSite=Strict`; logout y carga de usuario/rol server-side. |
| BFF | El navegador consume rutas relativas. `src/app/api/backend/[...path]/route.ts` agrega `DashboardKeyId` y token sólo en el servidor; `/staticfiles/[...path]` hace lo mismo para imágenes DB porque el upstream protege los assets con `DashboardKeyId`, sin exponer esos valores al navegador. |
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
| `/dashboard/masters/*` | Maestros | Monedas, regiones, tipos de documento y denominaciones implementados; imágenes reales pendientes de comprobación. |
| `/dashboard/paypads` | `/Admin/PayPad` | CRUD Pay+, contraseña, configuración técnica, almacenamiento, cargues, arqueos e historial implementados; prueba contra Pay+ real pendiente. |
| `/dashboard/alerts` | `/Admin/Alerts` | Suscripciones por Pay+ y eliminación confirmada implementadas; E2E pendiente. |
| `/dashboard/transactions` | `/Transactions` | Consulta, resumen, detalle, vídeo y Excel implementados; descargas reales pendientes. |
| `/dashboard/reports` | `/Reports` | Consulta por Pay+/todos, intervalo, producto, orden y paginación implementados; E2E pendiente. |

## Contratos y decisiones de seguridad

- Contraseñas de login, Usuarios y Pay+ se cifran con la clave RSA en el servidor. La clave no se expone al bundle ni se versiona.
- Los importes monetarios son `string` decimal y los cálculos usan `BigInt` escalado a centavos; no se emplean `number` para importes.
- Las fechas enviadas a `Transaction/GetByDate` se convierten a ISO 8601 UTC explícito (`yyyy-MM-ddTHH:mm:ss.fffZ`), que es el formato comprobado en el controlador legado.
- Cargues, arqueos y eliminaciones esperan la mutación antes de cerrar; se deshabilitan durante `isPending`, muestran feedback y las operaciones irreversibles requieren confirmar el ID del registro.
- El BFF de búsqueda de transacciones aplica filtro, orden y paginación en servidor porque el API legado devuelve colecciones completas sin protocolo de paginación.
- Los paths históricos de imagen (`/images/...`, `/staticfiles/images/...`, barras inversas y URLs absolutas) se normalizan a un path relativo seguro `/staticfiles/...`; cadenas `NULL`/`undefined`, traversal y separadores codificados repetidamente se rechazan. El BFF adjunta `DashboardKeyId` y, cuando existe, el Bearer de la sesión HttpOnly sólo server-side, ya que el upstream responde 403 sin la key; los redirects de archivos se siguen server-side para que el navegador nunca reciba una URL upstream.
- `backendStaticFilePath` vive en un módulo compartido sin directiva cliente para que los layouts server-rendered y las tablas interactivas generen exactamente la misma URL. Los assets de interfaz de `dashboardv2-frontend/public/images` se migraron a `public/images`; `profile-default.png` es fallback automático de perfiles sin imagen o con recurso fallido.
- El nombre visible de una máquina procede de `username`, con `userName` como alias histórico. `description` se mantiene como campo editable y no se usa como identidad; `Pay+ <id>` es un fallback sólo de presentación. Las tarjetas resuelven sucursal/dirección globales mediante `GET /api/Office`.
- De acuerdo con el Swagger productivo, sólo `LoadDto.details` y `TonnageDto.details` se normalizan de `null` o ausencia a `[]`. Las demás desviaciones de formato continúan fallando en Zod, salvo los arreglos de bytes de imagen documentados como anulables.
- El arqueo envía de nuevo el snapshot legado completo (`idPayPad`, `total`, `totalAp`, `totalDp`, `totalRj`) y lo convierte a números finitos únicamente en el BFF antes de enviarlo al API histórico.

## Calidad verificada

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | **PASA** — 2026-09-16 |
| `npm run lint` | **PASA** — cero warnings, 2026-09-16 |
| `npm run build` | **PASA** — rutas App Router y handlers compilados, 2026-09-16 |
| `git diff --check` | **PASA** — 2026-09-16 |
| Contrato Zod de cargues/arqueos | **PASA** — `details: null`/ausente se vuelve `[]`; un objeto inválido sigue rechazado. |
| Payload de cargue y almacenamiento | **PASA (integración local)** — mock HTTPS recibió detalles/totales del cargue y `minDpQuantity` como números, preservando IDs y nombres de campo históricos. |
| Payload de arqueo | **PASA (integración local)** — mock HTTPS recibió `idPayPad`, `total`, `totalAp`, `totalDp` y `totalRj` como números finitos, tras la validación de strings decimales del BFF. |
| Payload de configuración Pay+ | **PASA (integración local)** — create omitió `id`/`paypad`; update transportó `id` e `idUserCreated`, como hacía el formulario legado. |
| Normalización de paths de imágenes | **PASA** — pruebas locales cubrieron ruta legado, prefijo `staticfiles`, URL absoluta, barras inversas, espacios codificados, `NULL`, traversal y separadores doblemente codificados. |
| Contrato de estáticos | **PASA (integración local)** — mock HTTPS verificó `DashboardKeyId` para una ruta `/staticfiles/images/users/root.png`, Bearer sólo con sesión y un redirect de asset seguido dentro del BFF; el navegador recibe sólo el binario same-origin. |
| Assets locales y fallback de perfil | **PASA (local)** — assets históricos están en `public/images`; `/images/profile-default.png` devuelve 200 y se usa cuando no hay `IMG` válido o el recurso falla. |
| Login/página sin sesión | **PASA parcial** — `/login` devuelve 200 y las áreas privadas redirigen a `/login`. |
| Imágenes, cargues, arqueos, Excel y vídeo con sesión real | **PENDIENTE E2E** |

## SUPUESTOS Y BLOQUEOS

| ID | Hecho comprobado | Impacto | Tratamiento aplicado |
| --- | --- | --- | --- |
| B-01 | No hay endpoint, Hub SignalR, WebSocket, eventos ni contrato de autenticación realtime en frontend/backend legado. | La parte de eventos de “Monitoreo en Tiempo Real” no se puede implementar sin inventar una URL o payload. | No se agregó un websocket simulado. Transacciones y reportes usan TanStack Query como fuente de verdad. |
| B-02 | El API legado no expone `Idempotency-Key` ni mecanismo de deduplicación para cargues/arqueos. | No es posible garantizar idempotencia distribuida desde el cliente. | Botones se bloquean en `isPending`, la confirmación es explícita y Query invalida/refresca al terminar. Debe añadirse soporte backend para garantía transaccional completa. |
| B-03 | Las operaciones retornan listas completas sin paginación/filtro/orden upstream. | Las tablas no pueden delegar esos parámetros al API legado. | El BFF `/api/transactions/search` procesa filtro/orden/paginación server-side sin exponer credenciales. |
| B-04 | La conexión TLS directa desde este sandbox a `https://apidashboardv2.e-city.co` falla con `SSL_ERROR_SYSCALL`. | Este agente no puede completar una prueba autenticada directa contra el upstream. | No se interpreta como caída del API; el código queda listo para que una sesión local con alcance al upstream haga la comprobación. |
| B-05 | No hay una credencial ni cookie de sesión autorizada disponible para este agente. | No se pueden ejecutar operaciones reales ni comprobar una URL de imagen real sin arriesgar datos. | No se adivinaron credenciales ni se enviaron mutaciones financieras de prueba. |

## ESTADO DEL BACKLOG

La arquitectura no se presenta como cierre de producción. La corrección de `details` nullable, el payload completo de arqueo, el nombre/sucursal del Pay+ y la restauración automática de rutas de imagen con `DashboardKeyId` server-side están implementados y validados estática/localmente; falta la comprobación autenticada con un Pay+ real y rutas de archivo productivas antes de declarar paridad funcional completa.
