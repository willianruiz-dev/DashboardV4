# AGENT TASK BACKLOG

> **Actualizado:** 2026-09-16
> **Criterio de estado:** `PASA` requiere TypeScript, ESLint, build y la prueba funcional correspondiente. Una ruta o un componente aislado no cierran una fase.

| Fase | Entrega | Estado | Evidencia / pendiente |
| --- | --- | --- | --- |
| 0 | Sistema de diseño | **PASA (código)** | Tailwind v4 CSS-first, tokens del manual, tema claro/oscuro y primitives. Falta inspección visual autenticada de todos los flujos. |
| 1 | Tipos e infraestructura | **PASA (código)** | Zod, Query, BFF relativo, sesión HttpOnly y cifrado server-side. La nueva ruta protegida `/staticfiles/...` compila y rechaza acceso anónimo. |
| 2 | Usuarios y administración habilitadora | **PENDIENTE E2E** | CRUD de Usuarios, Clientes, Sucursales, Roles, Rutas y Maestros implementado; imágenes y mutaciones deben verificarse con una sesión real. |
| 3 | Cargues | **CORRECCIÓN APLICADA; PENDIENTE E2E** | `LoadDto.details` ahora acepta sólo `null`/ausencia documentadas y normaliza a `[]`; la tabla de cargue muestra el billete desde la ruta estática protegida. Falta probar con un Pay+ productivo. |
| 4 | Arqueos | **CORRECCIÓN APLICADA; PENDIENTE E2E** | `TonnageDto.details` recibe la misma normalización; arqueo e historial muestran previews de denominación cuando el API los provee. Falta prueba con un Pay+ productivo. |
| 5 | Monitoreo y reportes | **PENDIENTE E2E** | Transacciones, detalle, vídeo, Excel, filtros/orden/paginación BFF y filtros de Pay+ están implementados. Falta validar descargas y datos productivos reales. |

## Trabajo implementado

- Autenticación, sesión, logout y navegación basada en rutas/permisos del rol.
- Gestión de Usuarios, Clientes, Sucursales, Roles, Rutas, Monedas, Regiones, Tipos de documento y Denominaciones.
- Gestión de Pay+: crear, editar, eliminar, cambiar contraseña, configurar puertos, configurar denominaciones, cargues, arqueos e historial.
- Alertas: crear y eliminar suscripciones por Pay+.
- Transacciones y Reportes: consulta por fechas/Pay+, resumen, detalle por denominación, descarga de vídeo y exportación Excel.
- Modo oscuro seleccionable y filtro por texto/estado para encontrar Pay+.
- Restauración de archivos estáticos del contrato legado: los campos `img`, `imgDenom`, `logoImg` e imagen de perfil se solicitan mediante `/staticfiles/...`; el navegador no conoce el upstream ni el token.

## Validación actual

| Criterio | Resultado |
| --- | --- |
| Tipado estricto / sin `any` | **PASA** — `npm run typecheck` (2026-09-16) |
| ESLint sin warnings | **PASA** — `npm run lint` (2026-09-16) |
| Build de producción | **PASA** — `npm run build` (2026-09-16) |
| Rutas relativas desde navegador | **PASA (código)** — BFF y `/staticfiles/...` same-origin |
| Protección de estáticos sin sesión | **PASA** — `GET /staticfiles/...` local anónimo devuelve 401 |
| Secretos sólo server-side | **PASA (código)** |
| Cargues y arqueos con `details: null` de un Pay+ real | **PENDIENTE E2E** |
| Imágenes reales de denominaciones/billetes | **PENDIENTE E2E** |
| Descarga Excel y vídeo reales | **PENDIENTE E2E** |
| Estados skeleton / vacío / error-reintento / sin permisos | **PENDIENTE E2E** en todas las vistas |
| Confirmaciones destructivas/financieras | **PENDIENTE E2E** |

## SUPUESTOS Y BLOQUEOS

1. **B-01 — Eventos realtime:** no se encontró un contrato WebSocket/SignalR ni una implementación de Hub en el backend legado. No se inventó una conexión ni payload.
2. **B-02 — Idempotencia financiera:** el backend no acepta un idempotency key ni documenta deduplicación. La UI previene doble envío durante la mutación, pero la garantía distribuida exige cambio backend.
3. **B-03 — Parámetros de listas:** el upstream devuelve colecciones completas. El BFF aplica paginación/filtro/orden en servidor para transacciones; otros recursos conservan el contrato de lista legado.
4. **B-04 — Red de este agente:** la conexión TLS directa del sandbox al API productivo falla (`SSL_ERROR_SYSCALL`). No se concluye que el API esté caído; la prueba debe hacerse en una sesión local que alcance el upstream.
5. **B-05 — Sesión de prueba:** no hay una credencial ni cookie de sesión autorizada disponible para este agente. No se intentaron credenciales ni se realizaron mutaciones financieras de prueba.

## ESTADO DEL BACKLOG

No se declara la migración terminada. Las correcciones de formato de cargues/arqueos y las rutas de imágenes están implementadas y pasan el control estático, pero el cierre exige validar con una sesión real que el historial cargue, que cada URL `img`/`imgDenom` real devuelva su archivo, y que Excel/vídeo/acciones visibles mantengan la paridad funcional del legado.
