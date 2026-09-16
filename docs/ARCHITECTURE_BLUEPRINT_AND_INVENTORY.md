# ARCHITECTURE BLUEPRINT & INVENTORY

> **Actualizado:** 2026-09-16
> **Alcance:** sustitución del frontend CRA `dashboardv2-frontend/` por la aplicación Next.js de la raíz. El frontend y backend legados permanecen como fuente de verdad de comportamiento y no se modifican.

## Arquitectura entregada

| Capa | Implementación |
| --- | --- |
| Aplicación | Next.js 16.3.5 App Router, React 19 y TypeScript 5.9 con `strict` y `noUncheckedIndexedAccess`. |
| Diseño | Tailwind CSS v4 CSS-first y tokens derivados de `ManualDeMarca.md` en `src/app/globals.css`; componentes Radix/Shadcn tematizados en `src/components/ui/`. |
| Sesión | Login RSA-OAEP SHA-1/Base64 server-side, JWT exclusivamente en cookie HttpOnly, `SameSite=Strict`; logout y carga de usuario/rol server-side. |
| BFF | El navegador consume rutas relativas. `src/app/api/backend/[...path]/route.ts` agrega `DashboardKeyId` y token sólo en el servidor; BFFs específicos manejan contraseñas y mutaciones financieras. |
| Datos | TanStack Query v5, claves jerárquicas por dominio y contratos Zod en cada borde de API. |
| Formularios | React Hook Form + Zod; controles con labels, feedback y estado pendiente. |
| Tablas | TanStack Table v8: tabla en escritorio amplio y cards en formatos menores, sin scroll horizontal de página. |

## Inventario de rutas migradas

| Ruta Next | Equivalente legado | Estado |
| --- | --- | --- |
| `/login` | Login | Implementado con sesión segura server-side. |
| `/dashboard` | Inicio | Implementado. |
| `/dashboard/users` | `/Admin/Users` | CRUD, contraseña y validación. |
| `/dashboard/clients` | `/Admin/Costumers` | CRUD y logotipo. |
| `/dashboard/offices` | `/Admin/Offices` | CRUD de sucursales. |
| `/dashboard/roles` | `/Admin/Roles` | CRUD de roles, rutas y permisos. |
| `/dashboard/routes` | `/Admin/Routes` | Administración de rutas. |
| `/dashboard/masters/*` | Maestros | Monedas, regiones, tipos de documento y denominaciones. |
| `/dashboard/paypads` | `/Admin/PayPad` | CRUD Pay+, contraseña, configuración técnica, almacenamiento, cargues, arqueos e historial. |
| `/dashboard/alerts` | `/Admin/Alerts` | Suscripciones por Pay+ y eliminación confirmada. |
| `/dashboard/transactions` | `/Transactions` | Consulta, resumen, detalle, vídeo y Excel. |
| `/dashboard/reports` | `/Reports` | Consulta por Pay+/todos, intervalo, producto, orden y paginación. |

## Contratos y decisiones de seguridad

- Contraseñas de login, Usuarios y Pay+ se cifran con la clave RSA en el servidor. La clave no se expone al bundle ni se versiona.
- Los importes monetarios son `string` decimal y los cálculos usan `BigInt` escalado a centavos; no se emplean `number` para importes.
- Las fechas enviadas a `Transaction/GetByDate` se convierten a ISO 8601 UTC explícito (`yyyy-MM-ddTHH:mm:ss.fffZ`), que es el formato comprobado en el controlador legado.
- Cargues, arqueos y eliminaciones esperan la mutación antes de cerrar; se deshabilitan durante `isPending`, muestran feedback y las operaciones irreversibles requieren confirmar el ID del registro.
- El BFF de búsqueda de transacciones aplica filtro, orden y paginación en servidor porque el API legado devuelve colecciones completas sin protocolo de paginación.

## Calidad verificada

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | **PASA** |
| `npm run lint` | **PASA** — cero warnings |
| `npm run build` | **PASA** — rutas App Router y handlers compilados |
| `npm audit --omit=dev` | **PASA** — 0 vulnerabilidades de producción |
| `git diff --check` | **PASA** |
| Login/página sin sesión | **PASA** mediante comprobación HTTP local: `/login` responde 200 y áreas privadas redirigen a `/login`. |
| Conectividad al API productivo desde Arena | **NO VERIFICABLE** — el sandbox termina el handshake TLS con `SSL_ERROR_SYSCALL`; no implica una caída del API productivo. |

## SUPUESTOS Y BLOQUEOS

| ID | Hecho comprobado | Impacto | Tratamiento aplicado |
| --- | --- | --- | --- |
| B-01 | No hay endpoint, Hub SignalR, WebSocket, eventos ni contrato de autenticación realtime en frontend/backend legado. | La parte de eventos de “Monitoreo en Tiempo Real” no se puede implementar sin inventar una URL o payload. | No se agregó un websocket simulado. Transacciones y reportes usan TanStack Query como fuente de verdad. |
| B-02 | El API legado no expone `Idempotency-Key` ni mecanismo de deduplicación para cargues/arqueos. | No es posible garantizar idempotencia distribuida desde el cliente. | Botones se bloquean en `isPending`, la confirmación es explícita y Query invalida/refresca al terminar. Debe añadirse soporte backend para garantía transaccional completa. |
| B-03 | Las operaciones retornan listas completas sin paginación/filtro/orden upstream. | Las tablas no pueden delegar esos parámetros al API legado. | El BFF `/api/transactions/search` procesa filtro/orden/paginación server-side sin exponer credenciales. |
| B-04 | Arena no puede completar TLS hacia `https://apidashboardv2.e-city.co`. | No se puede ejecutar una prueba de credenciales o flujo real desde este sandbox. | La aplicación queda configurada para resolver el upstream sólo desde el servidor. La validación funcional final debe hacerse desde la red del despliegue con sus secretos configurados. |

## Prueba local contra el API productivo

Para probar la aplicación migrada desde un PC local sin desplegarla, ejecutar `npm run build` y después `npm run start:local-api`. Ese comando sólo corre Next.js en `localhost`, pero usa el valor productivo de `API_BASE_ADDRESS` y carga en memoria las variables heredadas `REACT_APP_BASEADD`, `REACT_APP_DKEYID` y `REACT_APP_PUBKEY` de `dashboardv2-frontend/.env.production` si no existen equivalentes en `.env.local`. No imprime ni expone esos valores al navegador; el navegador continúa llamando únicamente a rutas relativas `/api/*`.

`start:local-api` establece `SESSION_COOKIE_SECURE=false` sólo para que la cookie HttpOnly funcione en `http://localhost`. Si se necesita usar otro conjunto de credenciales local, `.env.local` tiene prioridad con `API_BASE_ADDRESS`, `DASHBOARD_API_KEY_ID`, `DASHBOARD_RSA_PUBLIC_KEY` y `SESSION_COOKIE_SECURE`.

## Ejecución desplegada

La aplicación no requiere que el navegador conozca el upstream. El proceso de despliegue debe inyectar, mediante su gestor de secretos, `DASHBOARD_API_KEY_ID` y `DASHBOARD_RSA_PUBLIC_KEY`, además de `API_BASE_ADDRESS` si se modifica el valor por defecto. No se deben copiar al repositorio ni a variables `NEXT_PUBLIC_*`; allí `SESSION_COOKIE_SECURE` debe permanecer en `true`.
