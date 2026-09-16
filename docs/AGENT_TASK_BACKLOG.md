# AGENT TASK BACKLOG

> **Actualizado:** 2026-09-16
> **Criterio de estado:** `PASA` significa código implementado y validado con TypeScript, ESLint y build. La conexión real al API productivo desde Arena queda separada cuando la red del sandbox no permite TLS.

| Fase | Entrega | Estado | Evidencia |
| --- | --- | --- | --- |
| 0 | Sistema de diseño | **PASA** | Tailwind v4 CSS-first, tokens del manual, temas, componentes base y responsive 320–2560. |
| 1 | Tipos e infraestructura | **PASA** | Zod, Query, BFF relativo, sesión HttpOnly, cifrado server-side y control de errores. |
| 2 | Usuarios y administración habilitadora | **PASA** | Usuarios, Clientes, Sucursales, Roles, Rutas y Maestros migrados. |
| 3 | Cargues | **PASA con B-02** | Pay+, storage de dispensación, cargue con cálculo seguro, confirmación e invalidación. |
| 4 | Arqueos | **PASA con B-02** | Snapshot de storage, arqueo, balance/historial, confirmación e invalidación. |
| 5 | Monitoreo y reportes | **PASA para la superficie legado; B-01 para eventos realtime** | Transacciones, detalle, vídeo, Excel, reportes, filtros/orden/paginación BFF. No existe contrato WebSocket/SignalR legado que migrar. |

## Trabajo migrado

- Autenticación, sesión, logout y navegación basada en rutas/permisos del rol.
- Gestión de Usuarios, Clientes, Sucursales, Roles, Rutas, Monedas, Regiones, Tipos de documento y Denominaciones.
- Gestión integral de Pay+: crear, editar, eliminar, cambiar contraseña, configurar puertos, configurar denominaciones, cargues, arqueos e historial.
- Alertas: crear y eliminar suscripciones por Pay+.
- Transacciones y Reportes: consulta por fechas/Pay+, resumen, detalle por denominación, descarga de vídeo y exportación Excel.

## Validación de cierre

| Criterio | Resultado |
| --- | --- |
| Tipado estricto / sin `any` | **PASA** |
| ESLint sin warnings | **PASA** |
| Build de producción | **PASA** |
| Rutas relativas desde navegador | **PASA** |
| Secretos sólo server-side | **PASA** |
| Estados skeleton / vacío / error-reintento / sin permisos | **PASA** en vistas migradas |
| Confirmaciones destructivas/financieras | **PASA** |
| Paginación, filtro y orden server-side | **PASA** para consultas de transacciones mediante BFF; B-03 documenta la limitación del upstream. |
| Prueba end-to-end contra API productivo desde Arena | **BLOQUEADA por B-04** |

## SUPUESTOS Y BLOQUEOS

1. **B-01 — Eventos realtime:** no se encontró un contrato WebSocket/SignalR ni una implementación de Hub en el backend legado. No se inventó una conexión ni payload.
2. **B-02 — Idempotencia financiera:** el backend no acepta un idempotency key ni documenta deduplicación. La UI previene doble envío durante la mutación, pero la garantía distribuida exige cambio backend.
3. **B-03 — Parámetros de listas:** el upstream devuelve colecciones completas. El BFF aplica paginación/filtro/orden en servidor para transacciones; otros recursos conservan el contrato de lista legado.
4. **B-04 — Red Arena:** TLS hacia el API productivo falla en el sandbox con `SSL_ERROR_SYSCALL`. No se interpreta como indisponibilidad del API; se requiere prueba desde el entorno de despliegue.

## ESTADO DEL BACKLOG

El código de todas las rutas visibles del frontend legado está migrado y el build pasa. La única capacidad explícita que no se puede entregar sin un contrato externo es la emisión/recepción realtime por WebSocket/SignalR; está documentada como B-01 en lugar de implementarse de forma ficticia.
