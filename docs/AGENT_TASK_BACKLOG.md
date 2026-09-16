# AGENT TASK BACKLOG

> **Regla de ejecución:** cada fase se entrega, se valida y espera confirmación explícita antes de iniciar la siguiente. Los bloqueos de contrato no se resuelven por suposición.
> **Última actualización:** 2026-09-16 UTC.

## Convenciones

- **PASA**: implementado y validado con la evidencia indicada.
- **PENDIENTE DE CONFIRMACIÓN**: técnicamente listo, pero no autoriza la siguiente fase hasta confirmación del usuario.
- **BLOQUEADO**: falta un contrato, decisión o dependencia externa; no se implementa una aproximación inventada.
- **NO INICIADO**: no se ha escrito código de ese alcance.

## Hitos y dependencias

| Fase | Entrega | Estado | Depende de |
| --- | --- | --- | --- |
| 0 | Sistema de Diseño | **PENDIENTE DE CONFIRMACIÓN** | — |
| 1 | Tipos e Infraestructura | **NO INICIADO** — excepción: proxy de transporte solicitado | Confirmación Fase 0; B-01, B-06, B-10 y B-13 para el borde API/auth completo. |
| 2 | Usuarios | **NO INICIADO** | Fase 1; contrato User/Auth y decisión sobre paginación. |
| 3 | Cargues | **NO INICIADO / BLOQUEADO PARCIALMENTE** | Fase 2; B-01, B-03, B-04, B-07 y confirmación del alcance Pay+/storage dependiente. |
| 4 | Arqueos | **NO INICIADO / BLOQUEADO PARCIALMENTE** | Fase 3; B-01, B-04, B-05, B-07. |
| 5 | Monitoreo en Tiempo Real | **NO INICIADO / BLOQUEADO PARCIALMENTE** | Fase 4; B-02, B-03, B-06, B-11. |

Los IDs `B-*` se detallan en `docs/ARCHITECTURE_BLUEPRINT_AND_INVENTORY.md`, sección `SUPUESTOS Y BLOQUEOS`.

---

## Fase 0 — Sistema de Diseño

### F0-01 · Inicializar aplicación independiente en la raíz

**Estado:** PASA
**Resultado:** Next.js App Router independiente, TypeScript estricto, Tailwind v4 CSS-first y configuración de ESLint/Next. `dashboardv2-frontend/` y `dashboardv2-backend/` permanecen sin modificaciones.

**Criterios verificados**

| Criterio | Resultado | Evidencia |
| --- | --- | --- |
| Next.js 15+ App Router | PASA | Next.js `16.3.5`; `src/app/layout.tsx` y `src/app/page.tsx`. |
| TypeScript 5+ strict | PASA | `tsconfig.json`: `strict` y `noUncheckedIndexedAccess`. |
| Tailwind v4 sin `tailwind.config.js` | PASA | `src/app/globals.css`, `postcss.config.mjs`. |
| Dependencias requeridas instaladas | PASA | `package.json`: Query, Table, RHF, Zod, Radix/Vaul y Shadcn utilities. |
| Dependencias de producción auditadas | PASA | `npm audit --omit=dev --json`: 0 vulnerabilidades. |

### F0-02 · Convertir Manual de Marca en sistema de tokens

**Estado:** PASA

**Resultado:** `src/app/globals.css` contiene tokens de marca, tema claro/oscuro, semánticos Shadcn, semánticos financieros, fuentes, radios, `.tabular`, focus visible y protección base de ancho de 320px.

**Criterios verificados**

| Criterio | Resultado | Evidencia |
| --- | --- | --- |
| `@import "tailwindcss"` y `@theme` | PASA | CSS-first en `globals.css`. |
| Variables Shadcn claro/oscuro | PASA | Mapeos `:root` y `.dark`. |
| Tipografía, radios y espacio derivables | PASA | Poppins, Inter, JetBrains Mono; radios semánticos. |
| Colores arbitrarios fuera de CSS global | PASA | Búsqueda focalizada en `src/` sin coincidencias. |
| Contraste de acento como texto normal | BLOQUEADO | B-09: requiere decisión de contraste antes de habilitar superficie accent con texto. |

### F0-03 · Construir primitivas Shadcn/Radix/Vaul tematizadas

**Estado:** PASA

**Resultado:** componentes base, selección, tooltips, formularios RHF y superficies modal/drawer/sheet están disponibles en `src/components/ui/`.

**Criterios verificados**

| Criterio | Resultado | Evidencia |
| --- | --- | --- |
| Botones, campos, tablas, cards, skeletons y alertas | PASA | Primitivos UI de base creados. |
| Select, checkbox, switch y tooltip accesibles | PASA | Wrappers Radix tipados. |
| Dialog, AlertDialog, Drawer y Sheet | PASA | Responsive bajo `sm`; Radix/Vaul. |
| Form RHF + Label accesible | PASA | `src/components/ui/form.tsx`. |
| Toast global | PASA | `TooltipProvider` y `Toaster` en `src/app/layout.tsx`. |

### F0-04 · Formalizar seguridad de confirmaciones

**Estado:** PASA

**Resultado:** `DestructiveConfirmationDialog` requiere respuesta explícita, expresa registro e irreversibilidad, tiene cancelar por defecto, admite verificación textual y bloquea acciones durante mutación pendiente.

**Criterios verificados**

| Criterio | Resultado | Evidencia |
| --- | --- | --- |
| Escape/backdrop no descartan eliminación | PASA | Semántica Radix AlertDialog y `onEscapeKeyDown.preventDefault()`. |
| Foco inicial en Cancelar | PASA | `autoFocus` en botón Cancelar. |
| Confirmación de alto impacto | PASA | Prop `verificationText`. |
| Espera de mutación sin autocerrar | PASA | `isPending` y cierre controlado por feature propietaria. |

### F0-05 · QA técnico de la base

**Estado:** PASA

| Criterio | Resultado | Evidencia |
| --- | --- | --- |
| Tipos estrictos | PASA | `npm run typecheck`. |
| ESLint limpio | PASA | `npm run lint`. |
| Build de producción | PASA | `npm run build`, rutas `/` y `/_not-found`. |
| Whitespace de diff | PASA | `git diff --check`. |
| Prueba visual manual 320–2560 y lector de pantalla | PENDIENTE DE CONFIRMACIÓN | La implementación tiene las garantías estáticas; requiere validación en navegador y/o aprobación del usuario. |

### Puerta de salida de Fase 0

**Resultado actual:** la Fase 0 está técnicamente completa. No se iniciará Fase 1 hasta confirmación explícita del usuario y, cuando aplique, hasta recibir los contratos B-01/B-06/B-10.

---

## Fase 1 — Tipos e Infraestructura

### F1-01 · Establecer contrato de transporte comprobable

**Estado:** BLOQUEADO por B-01, B-06 y B-11.

**Acción concreta al desbloquear**

1. Registrar fixtures de éxito, vacío, 4xx, 5xx y archivo/binario para cada endpoint que se use en la siguiente fase.
2. Definir Zod para envelope `HttpResponse<T>`, error y DTOs de Auth/User/Role/Permission/Route necesarios.
3. Confirmar casing JSON, nullabilidad, ISO/offset, segmentos ambiguos de Transaction y respuestas no JSON.
4. Añadir pruebas de parser/adaptador que fallen si el backend cambia el contrato.

**Aceptación:** no hay `any`; cada respuesta cruza un schema antes de Query/UI; errores conservan `statusCode`, código y mensaje del backend.

### F1-02 · Implementar BFF de autenticación y sesión segura

**Estado:** transporte base **PASA** por solicitud de apuntar al API productivo; autenticación/sesión sigue **BLOQUEADA** por B-10 y B-13.

**Resultado ya incorporado:** `/api/backend/[...path]` reenvía rutas relativas al API configurado, añade `DashboardKeyId` exclusivamente desde `DASHBOARD_API_KEY_ID` del entorno servidor, y preserva JSON/multipart/binario sin filtrar secretos al navegador. `.env.example` usa `https://apidashboardv2.e-city.co/` como base pública no secreta y deja el API key vacío.

**Acción concreta al desbloquear**

1. Crear Route Handlers específicos para login, sesión y logout sobre el proxy ya existente.
2. Reproducir RSA-OAEP/Base64 de credenciales únicamente si el contrato backend lo exige y es interoperable en servidor.
3. Transferir JWT backend a cookie HttpOnly/Secure/SameSite apropiada, nunca `localStorage`.
4. Mantener `DashboardKeyId` y material de clave sólo en configuración de servidor; configurar el valor real mediante secret manager, sin versionarlo.
5. Propagar 401/códigos de expiración a una sesión cerrada controlada.
6. Probar el proxy desde la red del servidor de despliegue, porque Arena no completó TLS contra el upstream.

**Aceptación:** navegador no llama backend por `localhost`; no expone token/header/clave sensible; logout backend y borrado cookie se verifican; rutas públicas/protegidas responden de forma accesible.

### F1-03 · Crear infraestructura TanStack Query y cliente API

**Estado:** NO INICIADO.

**Acción concreta**

1. Añadir provider cliente aislado, configuración de retry por clase de error y Devtools sólo en desarrollo si corresponde.
2. Crear fábrica de query keys jerárquicas por feature y helper de invalidación exacta.
3. Crear cliente relativo BFF, parser de envelope, `ApiError` tipado y adaptadores de respuesta.
4. Separar loading, empty, error/retry y forbidden como componentes reutilizables.

**Aceptación:** Server Components por defecto; provider sólo donde se necesite; retries no duplican mutaciones financieras; no existe fetch/axios ad hoc por pantalla.

### F1-04 · Añadir tipos de dominio para dinero y fecha

**Estado:** BLOQUEADO parcialmente por B-06 y B-07.

**Acción concreta al desbloquear**

1. Definir `Money`, parseo/serialización decimal y formateo por moneda confirmada.
2. Definir branded IDs y valores ISO con offset explícito.
3. Crear adaptadores de los `double`/`decimal`/fechas backend hacia representaciones seguras.
4. Cubrir precisión, redondeo y zonas horarias con pruebas unitarias.

**Aceptación:** ningún importe de UI o mutación financiera usa `number`; fechas de negocio no se procesan con `Date` implícito sin zona.

### F1-05 · Construir shell de dashboard y control de permisos

**Estado:** NO INICIADO.

**Acción concreta**

1. Reconstruir navegación jerárquica desde `RouteDto` autorizado.
2. Crear sidebar desktop + Sheet/Drawer móvil, top bar, logout, breadcrumbs y foco accesible.
3. Implementar boundary de permiso que enseñe estado “sin permisos”, no una página rota.
4. Aplicar controles de visibilidad por permiso sin sustituir la autorización backend.

**Aceptación:** 320–2560 sin scroll horizontal; navegación de teclado/foco atrapado en drawer; SSR/Server Component por defecto; control backend permanece autoritativo.

### F1-06 · Preparar patrón de tabla y formulario compartido

**Estado:** NO INICIADO.

**Acción concreta**

1. Crear renderer TanStack Table desktop + lista de cards móvil con una fuente de columnas/datos.
2. Crear toolbar de filtro, paginación server-side condicionada a contrato y mensajes de estado.
3. Crear patrón RHF/Zod para formularios, field error, async pending y toast tras mutación.
4. Añadir patrón de advertencia para edición financiera/confirmada.

**Aceptación:** controles de 44×44; labels/aria/focus visible; cuatro estados de datos; no tabla horizontal inusable en móvil.

### Puerta de salida de Fase 1

Se entrega cuando auth/BFF, schemas, Query, money/date, shell, permisos y patrones compartidos estén validados. La Fase 2 requerirá confirmación explícita adicional.

---

## Fase 2 — Usuarios

### F2-01 · Migrar lectura de identidad y listado de usuarios

**Estado:** NO INICIADO; depende de F1-01/F1-02/F1-03 y de decisión B-03.

**Acción concreta**

1. Consultar usuario actual y permisos/rol requeridos por el shell.
2. Migrar listado y detalle de usuarios con schema, skeleton, vacío, error/reintento y forbidden.
3. Implementar tabla desktop/card list móvil con los campos demostrados por `UserDto`.
4. Conectar filtros/paginación/orden server-side solamente si backend expone contrato; no inventar query parameters.

**Aceptación:** `ReadUsers`, excepción de lectura propia y root se comportan como middleware; datos sensibles no se renderizan; responsive y AA pasan QA.

### F2-02 · Migrar alta y edición de usuarios

**Estado:** NO INICIADO.

**Acción concreta**

1. Crear schema RHF/Zod para documento, tipo, username, datos personales, rol, estado, cliente e imagen cuando corresponda.
2. Reproducir validación de password de alta, coincidencia de confirmación y cifrado de transporte confirmado.
3. Enviar create/update mediante mutaciones con pending, toast, invalidación y manejo de error backend.
4. Mostrar advertencia si se altera una cuenta/estado con efecto operativo, sólo si el comportamiento legado/contrato lo demuestra.

**Aceptación:** `WriteUsers` y edición propia se aplican correctamente; errores de campo están asociados por `aria-describedby`; submit se bloquea en `isPending`.

### F2-03 · Migrar cambio y eliminación de usuario

**Estado:** NO INICIADO.

**Acción concreta**

1. Separar cambio de contraseña con password actual/nueva/confirmación y contrato RSA validado.
2. Implementar eliminación con `DestructiveConfirmationDialog`, registro exacto y permiso `DelUsers`.
3. Esperar respuesta antes de cerrar/invalidar; no borrar optimistamente.
4. Conciliar error de sesión/permiso y mostrar reintento apropiado.

**Aceptación:** cancelar es default; no backdrop/Escape para borrar; mutaciones muestran toast tras éxito y las listas se invalidan sólo después de resolver.

### F2-04 · QA de Usuarios

**Estado:** NO INICIADO.

**Criterios obligatorios:** tipos/lint/build; permisos; cuatro estados; teclado/foco/labels; desktop/card móvil 320–2560; create/edit/password/delete; errores backend; sin `any`; máximo dos ciclos de corrección antes de escalar el tercero.

### Puerta de salida de Fase 2

La entrega incluirá evidencia **PASA/FALLA** por criterio y `## ESTADO DEL BACKLOG`; luego esperará confirmación antes de Fase 3.

---

## Fase 3 — Cargues

### F3-01 · Confirmar dependencias mínimas de Pay+/storage/denominaciones

**Estado:** BLOQUEADO por B-01, B-03, B-07 y por asignación de alcance.

**Acción concreta al desbloquear**

1. Confirmar si la fase incluye la experiencia de selección/lectura de Pay+ y storage necesaria para hacer un cargue, sin migrar todavía todo el CRUD/configuración Pay+.
2. Validar schemas/fixtures de PayPad, storage, CurrencyDenomination y Load.
3. Confirmar la moneda/formato y la semántica de filas storage no seleccionadas.

**Aceptación:** no se habilita carga sobre denominación que el backend no reconoce como dispensable; los datos necesarios llegan desde contrato real.

### F3-02 · Migrar composición de cargue

**Estado:** NO INICIADO; depende de F3-01 y F1-04.

**Acción concreta**

1. Mostrar sólo denominaciones de la moneda del Pay+ configuradas para dispensación.
2. Capturar cantidades enteras con schema que refleje exactamente los límites confirmados; no introducir prohibiciones no demostradas.
3. Derivar total desde denominación × cantidad usando Money seguro.
4. Excluir cantidades cero conforme al legado y bloquear el cargue vacío/total cero.
5. Renderizar tabla desktop y tarjetas móviles, con skeleton/vacío/error/retry/sin permisos.

**Aceptación:** no hay `number` para importes; cantidades y total se revisan antes de confirmar; interfaz tiene labels, focus y 44×44.

### F3-03 · Ejecutar cargue irreversible con conciliación

**Estado:** BLOQUEADO por B-04; no iniciado.

**Acción concreta al desbloquear**

1. Mostrar resumen exacto de Pay+, denominaciones, cantidades y total en confirmación no descartable.
2. Requerir texto/ID de confirmación si la política de impacto lo exige.
3. Añadir idempotency key si el backend lo soporta; si no, implementar únicamente el flujo de conciliación que se apruebe para timeout/doble envío.
4. Deshabilitar submit con `isPending`, esperar POST, mostrar toast e invalidar storage/cargues sólo tras éxito.
5. Transformar el mensaje backend de denominación no registrada para dispensación sin ocultar el detalle útil.

**Aceptación:** ninguna operación financiera es optimista/destructiva sin reversión; doble clic/retry no crea un movimiento silenciosamente duplicado; confirmación, error y reconciliación están comprobados contra backend.

### F3-04 · Migrar historial y detalle de cargues

**Estado:** NO INICIADO.

**Acción concreta:** lista con fecha ISO zonificada, total seguro, detalle por denominación/cantidad, estados de datos y tarjetas móviles; abrir detalle en fullscreen/drawer móvil según contexto.

**Aceptación:** se consulta `GET /api/Load/GetByPaypad/{idPaypad}` y detalle bajo schema confirmado; importe/fecha no se parsean con `number`/`split("T")`.

### F3-05 · QA de Cargues

**Estado:** NO INICIADO.

**Criterios obligatorios:** permiso `ReadTonnagesAndLoads`/`WriteTonnagesAndLoads`; denominaciones dispensables; vacíos/error/retry; confirmación irreversible; idempotencia/conciliación; mobile; tipo/lint/build; PASS/FAIL por criterio.

### Puerta de salida de Fase 3

No se comenzará Arqueos hasta que Cargues esté validado y el usuario confirme la entrega.

---

## Fase 4 — Arqueos

### F4-01 · Validar snapshot autoritativo de arqueo

**Estado:** BLOQUEADO por B-01, B-04, B-05 y B-07.

**Acción concreta al desbloquear**

1. Capturar request/response de `POST /api/Tonnage` y detalle/historial del arqueo.
2. Confirmar que el procedure calcula snapshot/totales en servidor y cuáles campos del body son efectivos.
3. Establecer idempotency key o conciliación aprobada.
4. Confirmar precisión/moneda de AP, DP, RJ y total.

**Aceptación:** el frontend nunca declara como autoritativo un cálculo que el backend ignora o recalcula; el schema expresa el request real.

### F4-02 · Migrar vista de almacenamiento y composición de arqueo

**Estado:** NO INICIADO.

**Acción concreta**

1. Consultar storage de Pay+ con estado de datos completo.
2. Presentar aceptadores, dispensadores y baúl de rechazo por denominación, cantidades y valores seguros.
3. Derivar un resumen de comunicación para el usuario, distinguido del snapshot autoritativo backend.
4. Usar tabla desktop/card móvil sin scroll horizontal.

**Aceptación:** importes no son `number`, las cantidades se diferencian de importes, y las imágenes de denominación tienen texto alternativo contextual.

### F4-03 · Ejecutar arqueo irreversible

**Estado:** BLOQUEADO por B-04; no iniciado.

**Acción concreta:** confirmación no descartable con Pay+, snapshot/resumen y total; validación textual si aplica; submit único/isPending; espera de respuesta; toast e invalidación/refetch de storage, arqueos y alertas relacionadas.

**Aceptación:** no mutación optimista; comportamiento seguro ante timeout/doble submit conforme a idempotencia o conciliación confirmada; permisos `WriteTonnagesAndLoads`.

### F4-04 · Migrar historial y detalle de arqueos

**Estado:** NO INICIADO.

**Acción concreta:** listar cabecera con AP/DP/RJ/total/fecha y revelar detalle por denominación/cantidades; incluir los cuatro estados de datos y permiso de lectura.

**Aceptación:** fecha ISO con zona, dinero seguro y respuesta validada; experiencia mobile fullscreen/drawer sin overflow horizontal.

### F4-05 · QA de Arqueos

**Estado:** NO INICIADO.

**Criterios obligatorios:** contrato snapshot; precisión monetaria; permisos; confirmación; idempotencia/conciliación; estados de datos; responsive/AA; tipos/lint/build; PASS/FAIL por criterio.

### Puerta de salida de Fase 4

No se comenzará Monitoreo en Tiempo Real hasta confirmación explícita del usuario.

---

## Fase 5 — Monitoreo en Tiempo Real

### F5-01 · Formalizar contrato de eventos

**Estado:** BLOQUEADO por B-02.

**Acción concreta al desbloquear**

1. Tipar URL/protocolo, autenticación, eventos, payloads, versión/secuencia y código de cierre.
2. Definir qué query keys debe invalidar cada evento y qué eventos requieren refetch completo.
3. Definir backoff con límite/jitter, estados visuales online/reconectando/offline y refetch al reconectar.

**Aceptación:** WebSocket/SignalR sólo emite eventos; TanStack Query continúa como fuente de verdad; no existe “realtime” simulado ni reconciliación sin orden.

### F5-02 · Migrar monitor de transacciones

**Estado:** NO INICIADO; depende de F5-01, B-03, B-06 y B-11.

**Acción concreta**

1. Migrar lista/resumen/filtros de transacciones y estado conocido/fallback neutral.
2. Implementar desktop table/card mobile, detalle, agrupación por operación/denominación y datos de importes seguros.
3. Implementar status de conexión accesible y eventos que invalidan/refetchan queries.
4. Añadir skeleton/vacío/error/retry/sin permisos y consulta server-side sólo con contrato disponible.

**Aceptación:** `ReadTransactions`; estados desconocidos no rompen UI; fecha y dinero seguros; UI responde 320–2560.

### F5-03 · Migrar detalle, vídeo, rating, exportación y reportes asignados

**Estado:** BLOQUEADO parcialmente por B-06 y B-11; asignación de alcance pendiente.

**Acción concreta al desbloquear**

1. Validar binario/headers/404 de vídeo, comportamiento de descarga y autorización.
2. Migrar detalle de transacción, rating y exportación que pertenezcan al alcance confirmado.
3. Validar `Bussines/Paypad/.../Transactions` y `DateRangeDto` para reportes.
4. Mantener filtros de producto y “Todos los Pay+” sólo con semántica backend confirmada.

**Aceptación:** 404 de vídeo se muestra como estado recuperable; descarga no se tipa como JSON; exportación/mutaciones tienen feedback accesible.

### F5-04 · QA de Monitoreo

**Estado:** NO INICIADO.

**Criterios obligatorios:** contrato de eventos; backoff/refetch; estado de conexión; permisos; cuatro estados; listas móviles; fecha/dinero; vídeo/archivo; tipos/lint/build; PASS/FAIL por criterio.

### Puerta de salida de Fase 5

Entrega final de los módulos que el usuario haya asignado a las cinco fases, con inventario de cualquier área aún no priorizada.

---

## Áreas legado sin fase explícita asignada

El mandato global dice “migrar el frontend legado”, pero la secuencia de entregas sólo nombra Usuarios, Cargues, Arqueos y Monitoreo. Las siguientes áreas existen y no se incorporarán silenciosamente a una fase sin confirmación de alcance:

| Área | Dependencia funcional | Decisión requerida |
| --- | --- | --- |
| Roles, rutas y permisos administrables | Auth/shell y Users | Confirmar si se incorporan a Fase 2 o se programan como fase adicional. |
| Clientes y oficinas | Pay+ y usuarios asociados a cliente | Confirmar prioridad/fase. |
| Pay+ CRUD, password y configuración | Cargues/arqueos necesitan lectura mínima de Pay+/storage | Confirmar si Fase 3/4 incluye sólo dependencias de lectura o el CRUD/configuración completo. |
| Maestros Currency/TypeDocument/Region/Denomination | Usuarios, Pay+, storage/cargues | Confirmar si se migran como habilitador de cada fase o como alcance adicional. |
| Alertas/suscripciones | Umbral de storage/arqueos | Confirmar fase de migración. |
| Reportes | Transacciones/fecha/Payload `Bussines` | Confirmar si forma parte de Fase 5. |
| Home y errores 401/404 | Shell | Home/error básico puede formar parte de Fase 1; contenido de negocio requiere confirmación. |

## Bloqueos activos que requieren respuesta

1. **B-01:** contrato API formal o fixtures/acceso de prueba controlado.
2. **B-02:** contrato WebSocket/SignalR completo.
3. **B-03:** paginación, filtros y orden server-side o excepción formal temporal.
4. **B-04:** idempotency key/deduplicación o procedimiento de conciliación para cargues y arqueos.
5. **B-05:** semántica request/snapshot de arqueo.
6. **B-06:** formato ISO/offset y límites de fechas de reportes.
7. **B-07:** regla de moneda/formateo multi-moneda.
8. **B-08/B-09:** assets/escala de marca y decisión AA para accent.
9. **B-10:** configuración y compatibilidad BFF/cookies/RSA/header.
10. **B-11:** endpoints Transaction ambiguos y contrato binario de vídeo.
11. **B-12:** asignación de áreas legado no nombradas a fases de entrega.
12. **B-13:** prueba de conectividad API desde la red del servidor de despliegue; Arena no completó TLS contra el upstream.

## ESTADO DEL BACKLOG

- **Fase 0:** técnicamente **PASA**; **PENDIENTE DE CONFIRMACIÓN EXPLÍCITA** para abrir Fase 1.
- **Conexión API solicitada:** proxy server-only hacia `https://apidashboardv2.e-city.co/` incorporado; falta configurar el secret `DASHBOARD_API_KEY_ID` en el entorno servidor y validar conectividad desde esa red.
- **Fase 1:** no se ha iniciado un módulo funcional; varias tareas quedan bloqueadas hasta contratos B-01, B-06, B-10 y B-13.
- **Fases 2–5:** **NO INICIADAS**; no se ha migrado módulo funcional alguno.
- **Acción autorizada ahora:** revisión/confirmación de Fase 0 y prueba del proxy desde el entorno de despliegue. No se iniciará una fase funcional automáticamente.
