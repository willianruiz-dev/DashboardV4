# ARCHITECTURE BLUEPRINT & INVENTORY

> **Estado del documento:** línea base de descubrimiento y diseño para la migración.
> **Fecha de revisión:** 2026-09-16 UTC.
> **Fuentes revisadas:** `dashboardv2-frontend/`, `dashboardv2-backend/` y `ManualDeMarca.md`.

## 1. Mandato y reglas de decisión

La migración sustituirá el frontend legado de React/CRA por una aplicación independiente en la raíz de este repositorio usando **Next.js 15+ App Router, TypeScript 5+, Tailwind CSS v4, Shadcn UI, TanStack Query v5, TanStack Table v8 y React Hook Form + Zod**.

| Área | Fuente de verdad | Regla aplicada |
| --- | --- | --- |
| Comportamiento, flujos, endpoints, DTO, mensajes y permisos | Código legado frontend y backend | Se conserva 1:1. Un punto no demostrable no se inventa. |
| Diseño visual | `ManualDeMarca.md` | Se reconstruye desde cero; no se replica Bootstrap/PrimeReact ni la composición visual heredada. |
| Seguridad, dinero, fechas y operaciones irreversibles | Restricciones del encargo + backend disponible | Se implementan de forma conservadora; los huecos de contrato se bloquean antes de escribir el módulo afectado. |

El frontend legado y el backend se mantienen intactos. La aplicación Next nueva vive en la raíz (`src/`, `package.json`, configuraciones raíz); no hay una migración funcional realizada todavía.

## 2. Estado de la base nueva — Fase 0, Sistema de Diseño

### 2.1 Stack instalado y verificado

| Capacidad | Decisión actual |
| --- | --- |
| Framework | Next.js `16.3.5` App Router, compatible con el requisito Next.js 15+. Se actualizó desde 15.5.25 para resolver el aviso transitorio de seguridad de Next/PostCSS. |
| Lenguaje | TypeScript `5.9.3`, `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. |
| Estilos | Tailwind CSS `4.3.3`, configuración CSS-first; no existe `tailwind.config.js`. |
| Componentes | Primitivos Shadcn/Radix, CVA, `tailwind-merge`, Lucide y Vaul. |
| Formularios / validación | React Hook Form, `@hookform/resolvers` y Zod 4 instalados. |
| Datos / tablas | TanStack Query 5 y TanStack Table 8 instalados; su infraestructura funcional queda programada para Fase 1. |
| Calidad | ESLint 9 + `eslint-config-next` 16 nativo; TypeScript y build de producción pasan. |
| Seguridad de dependencias | `npm audit --omit=dev` reporta `0 vulnerabilities` después de la actualización. |

La decisión de actualizar a Next 16.3.5 no cambia ningún comportamiento de negocio: aún no hay módulo de negocio en la aplicación nueva. El linter se ajustó al formato flat config nativo de Next 16, en vez de usar el adaptador legacy incompatible.

### 2.2 Archivos construidos

| Ruta | Responsabilidad |
| --- | --- |
| `src/app/layout.tsx` | Server Component raíz; incorpora tipografía/metadata, `TooltipProvider` y `Toaster` sin convertir el layout raíz en Client Component. |
| `src/app/page.tsx` | Página de fundación visual de la Fase 0, no un módulo legado migrado. |
| `src/app/globals.css` | Tokens de marca, tema claro/oscuro, tipografías, focus visible y garantías base de ancho/respuesta. |
| `src/lib/utils.ts` | Utilidad tipada `cn()` para combinar clases semánticas. |
| `src/components/ui/` | Primitivos de interfaz accesibles y tematizados descritos a continuación. |
| `components.json` | Alias/configuración de componentes Shadcn. |
| `next.config.mjs`, `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json` | Configuración de Next, Tailwind v4, lint y compilación estricta. |
| `.gitignore` | Excluye salida de Next, dependencias, entornos y PEM para la nueva aplicación. |

### 2.3 Sistema de tokens y accesibilidad implementado

`src/app/globals.css` usa `@import "tailwindcss"`, `@theme` y `@theme inline`, según el modo CSS-first de Tailwind v4. Contiene:

- Escalas de marca azul, acento cian, neutros azulados y estados del manual.
- Variables semánticas Shadcn para `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring` y radios.
- Tokens financieros/del dominio: importes positivos/negativos, estados pendientes/procesando/confirmados/fallidos y conectividad online/offline/reconectando.
- Temas claro y oscuro, fuentes Poppins (interfaz), Inter (cifras) y JetBrains Mono (técnico), y radios `sm`/`md`/`lg`/`xl` derivados del manual.
- `tabular` para cifras con `tabular-nums`, `:focus-visible` explícito, `touch-action: manipulation`, ancho mínimo de 20rem / 320px y recorte horizontal global.

No se detectaron colores hex/RGB/HSL ni paletas de color Tailwind directas fuera de `globals.css` dentro de `src/`. Los primitivos consumen tokens semánticos.

> **Decisión de contraste:** el cian `accent` del manual tiene foreground blanco en claro, combinación que no se debe usar para texto normal hasta contar con una variante AA validada. Los botones existentes usan `primary` o superficies semánticas, no esa pareja de acento.

### 2.4 Primitivos disponibles

| Categoría | Primitivos |
| --- | --- |
| Base | `Button`, `Input`, `Textarea`, `Label`, `Card`, `Badge`, `Alert`, `Table`, `Skeleton`, `Separator`. |
| Selección | `Checkbox`, `Switch`, `Select`, `Tooltip`. |
| Superficies/modalidad | `Dialog`, `AlertDialog`, `Sheet`, `Drawer`. |
| Formularios / notificaciones | `Form` (RHF tipado), `Toaster`/Sonner. |

Los botones interactivos tienen área mínima de 44×44 px (`min-h-11`/`min-w-11`). `DialogContent` y `AlertDialogContent` son fullscreen por debajo de `sm` y se transforman en diálogo centrado en desktop. `Drawer` proporciona el bottom sheet móvil y `Sheet` se reserva para navegación o contexto secundario.

`DestructiveConfirmationDialog` formaliza eliminaciones de alto riesgo:

- El backdrop y Escape no descartan la operación; AlertDialog exige elección explícita.
- Muestra el registro exacto, la irreversibilidad y deja `Cancelar` como foco inicial.
- Puede exigir la escritura exacta de un identificador/texto clave.
- El contenedor no se autocierra al confirmar: la mutación propietaria debe resolver primero.
- `isPending` deshabilita cancelar/confirmar y muestra progreso.
- La verificación escrita se reinicia con cada ciclo de apertura.

## 3. Inventario del sistema legado

### 3.1 Topología y deuda técnica de partida

| Área | Inventario observado |
| --- | --- |
| `dashboardv2-frontend/` | React CRA, JavaScript, React Router, Redux, Axios, Bootstrap, PrimeReact, SweetAlert2, FontAwesome y `node-forge`. ~9,669 líneas JS/JSX bajo `src/`. |
| `dashboardv2-backend/` | API ASP.NET Core, Dapper/SQL Server, DTO C#, middleware propio de permisos, JWT, cache en memoria y estáticos/vídeos. ~11,298 líneas C#. |
| Contrato formal | No se entregó `=== CONTRATOS_API ===`, OpenAPI exportado ni una especificación versionada consumible. Los controllers, DTO y servicios legado son la evidencia actual, no un sustituto definitivo de un contrato validado. |
| Realtime | No se encontró endpoint WebSocket, SignalR Hub, ni contrato de eventos. Solo existe un `using` de SignalR no utilizado en `TonnageController.cs`. |
| Datos en listas | Las APIs observadas retornan colecciones completas; no exponen paginación, filtros u orden server-side demostrables. |
| Dinero | Muchos DTO/entidades backend serializan dinero como `double`/`int`; la UI nueva usará representación decimal string/centavos internamente y adaptadores explícitos en el borde del contrato. |

### 3.2 Rutas de interfaz existentes

Estas son las rutas SPA visibles y sus permisos/ruta lógica asociados. La URL final App Router se definirá en Fase 1 manteniendo la política y el comportamiento; no se debe presuponer una reescritura de permisos sin validación.

| Ruta legado | Área | Comportamiento conocido |
| --- | --- | --- |
| `/` | Inicio | Home posterior a login. |
| `/Admin/Users` | Usuarios | Lista, crear, editar, eliminar y cambio de contraseña. |
| `/Admin/Roles` | Roles | Lista/crear/editar/eliminar roles, con rutas y permisos asociados. |
| `/Admin/Routes` | Rutas | Administración de rutas. |
| `/Admin/Costumers` | Clientes | CRUD de clientes, región, logo y sucursales vinculadas. La ortografía heredada se conserva como evidencia, no como decisión de nueva URL. |
| `/Admin/Offices` | Oficinas | CRUD de sucursales; espera `idClient` desde estado de navegación. |
| `/Admin/PayPad` | Pay+ | CRUD de corresponsales, contraseña, configuración, almacenamiento, cargues, arqueos e historial. |
| `/Admin/Alerts` | Alertas | Suscripciones de alertas por Pay+. |
| `/Admin/Masters/Currencies` | Maestros | CRUD de monedas. |
| `/Admin/Masters/TypeDoc` | Maestros | CRUD de tipos de documento. |
| `/Admin/Masters/Regions` | Maestros | CRUD de regiones. |
| `/Admin/Masters/Denominations` | Maestros | CRUD de denominaciones monetarias e imagen. |
| `/Transactions` | Transacciones | Lista, resumen, filtros y detalle/transacción-vídeo. |
| `/Reports` | Reportes | Filtro Pay+/rango de fecha/producto y tabla de transacciones. |
| `/Unauthorized` | Autorización | Estado de falta de permisos. |
| `*` | Error | Vista 404. |

### 3.3 Inicio de sesión, sesión y autorización

| Tema | Evidencia de comportamiento legado |
| --- | --- |
| Inicio de sesión humano | `POST /Auth/Login` con `userName` y contraseña RSA-OAEP/Base64. El backend devuelve un JWT de usuario cuando la sesión es válida. |
| Inicio de sesión Pay+ | `POST /Auth/LoginPayPad`; es un flujo de equipo distinto al dashboard humano. |
| Verificación de contraseña | `POST /Auth/VerifyPwd`, también con contraseña RSA-OAEP/Base64. |
| Cierre de sesión | `GET /Auth/Logout`, usando Bearer JWT; invalida una sesión almacenada por backend. |
| Persistencia heredada | El JWT se guarda en `localStorage` bajo `session`; Fase 1 debe reemplazar ese almacenamiento por sesión/cookie HttpOnly mediante BFF tras validar la estrategia contra backend. |
| Cifrado de contraseña | El frontend legado construye una clave pública desde configuración pública y cifra con RSA-OAEP; backend descifra con su clave privada antes de validar. No enviar la contraseña sin confirmar el contrato de transporte. |
| Header adicional | Todos los servicios legado envían `DashboardKeyId`, además de Authorization donde aplica. Debe permanecer configuración solo de servidor en la nueva aplicación. |
| Expiración | JWT de usuario expira a 1 día según backend. El legado interpreta códigos de error `3`/`4` como sesión expirada y realiza logout. No hay refresh token demostrado. |
| Sesiones simultáneas | El backend impide una segunda sesión activa de usuarios no root; root queda exento según `AuthBL`. |
| Carga de identidad | Tras token, frontend obtiene `/api/User/Logged`, luego rol y colecciones de rutas/permisos. |
| Política de UI | La navegación se construye desde `RouteDto` jerárquico y la vista se bloquea si la ruta autorizada falta. El backend sigue siendo el control definitivo. |

### 3.4 Matriz de permisos comprobada

| Dominio | Lectura | Escritura | Eliminación | Matices observados |
| --- | --- | --- | --- | --- |
| Usuarios | `ReadUsers` | `WriteUsers` | `DelUsers` | Sin ReadUsers se permite consultar/editar al propio usuario en rutas específicas. Root omite comprobación. |
| Roles | `ReadRoles` | `WriteRoles` | `DelRoles` | Root omite comprobación. Rol con `id === 1` no se elimina desde la UI legado. |
| Rutas | `ReadRoutes` | `WriteRoutes` | No hay eliminación permitida por middleware observado | `GetLoggedRoutes` está permitido tras identidad. |
| Clientes | `ReadClients` | `WriteClients` | `DelClients` | Root omite comprobación. |
| Oficinas | `ReadOffices` | `WriteOffices` | `DelOffices` | Permiso separado de Clientes. |
| Maestros | `ReadMasters` | `WriteMasters` | `DelMasters` | Abarca Currency, TypeDocument, Region y CurrencyDenomination. |
| Pay+ | `ReadPayPads` | `WritePayPads` | `DelPayPads` | Configuración y cambio de contraseña son WritePayPads. |
| Cargues / arqueos | `ReadTonnagesAndLoads` | `WriteTonnagesAndLoads` | No expuesto | También protege storage de Pay+ y los endpoints Load/Tonnage. |
| Transacciones | `ReadTransactions` | Equipo Pay+ para operaciones de escritura | No expuesto | Usuarios leen; varios POST/PUT están destinados al JWT de Pay+ en middleware. |
| Suscripciones | `ReadSubs` | `WriteSubs` | `DelSubs` | Alertas por Pay+. |

La UI nueva debe diferenciar los cuatro estados de toda vista protegida: **skeleton/cargando, vacío, error con reintento y sin permisos**. Ocultar una acción por permiso mejora la interfaz, pero nunca sustituye el rechazo backend.

### 3.5 Inventario de endpoints observados

Todas las rutas salvo Auth usan la base `api/[Controller]`; Auth se consume en legado como `/Auth/*`. Las respuestas exitosas están envueltas en `HttpResponse<T>` con `statusCode`, `message` y `response`; las rutas de archivo/vídeo deben verificarse individualmente antes de tiparse como JSON.

| Recurso | Endpoints observados | Uso principal |
| --- | --- | --- |
| Auth | `POST /Auth/Login`, `POST /Auth/LoginPayPad`, `POST /Auth/VerifyPwd`, `GET /Auth/Logout` | Sesión de usuario/equipo. |
| User | `GET /api/User`, `GET /api/User/{id}`, `GET /api/User/Document/{document}`, `GET /api/User/Status/{status}`, `GET /api/User/Role/{role}`, `GET /api/User/Name/{name}`, `POST /api/User`, `PUT /api/User`, `PUT /api/User/ChangePwd`, `DELETE /api/User/{id}`, `GET /api/User/Logged` | Usuarios/perfil. |
| Role | `GET /api/Role`, `GET /api/Role/{id}`, `POST /api/Role`, `PUT /api/Role`, `DELETE /api/Role/{id}` | Roles y sus asociaciones. |
| Route | `GET /api/Route`, `GET /api/Route/Logged`, `GET /api/Route/{id}`, `POST /api/Route`, `PUT /api/Route`, `DELETE /api/Route/{id}` | Árbol de navegación. |
| Permission | `GET /api/Permission`, `GET /api/Permission/{id}` | Catálogo de permisos. |
| Client | `GET /api/Client`, `GET /api/Client/{id}`, `POST /api/Client`, `PUT /api/Client`, `DELETE /api/Client/{id}` | Clientes y logo/sucursales. |
| Office | `GET /api/Office`, `GET /api/Office/{id}`, `GET /api/Office/Client/{idClient}`, `POST /api/Office`, `PUT /api/Office`, `DELETE /api/Office/{id}` | Sucursales. |
| Masters | `GET|POST|PUT /api/Masters/{Currency|TypeDocument|Region|CurrencyDenomination}`, `GET|DELETE /api/Masters/{resource}/{id}` | Catálogos y denominaciones. |
| PayPad | `GET /api/PayPad`, `GET /api/PayPad/{id}`, `GET /api/PayPad/Status/{status}`, `GET /api/PayPad/GetStorage/{idPaypad}`, `POST /api/PayPad/CreateStorage`, `POST|PUT /api/PayPad`, `PUT /api/PayPad/ChangePwd`, `DELETE /api/PayPad/{id}`, `GET /api/PayPad/Validate`, `POST /api/PayPad/CreateConfiguration`, `PUT /api/PayPad/UpdateConfiguration`, `GET /api/PayPad/GetConfiguration/{idPaypad}` | Corresponsal, almacenamiento y configuración. |
| Load | `GET /api/Load/GetByPaypad/{idPaypad}`, `GET /api/Load/{idLoad}`, `POST /api/Load` | Cargues e historial/detalle. |
| Tonnage | `GET /api/Tonnage/GetByPaypad/{idPaypad}`, `GET /api/Tonnage/{idTonnage}`, `POST /api/Tonnage` | Arqueos e historial/detalle. |
| Transaction | `GET /api/Transaction`, `GET /api/Transaction/Paypad/{idTransaction}`, `GET /api/Transaction/{idPaypad}`, `POST /api/Transaction/GetByDate`, `POST|PUT /api/Transaction/Paypad`, `GET /api/Transaction/{idTransaction}/Details`, `GET /api/Transaction/Paypad/Details/{idDetail}`, `POST|PUT /api/Transaction/Paypad/Details`, `POST /api/Transaction/Paypad/UploadVideo`, `GET /api/Transaction/{idTransaction}/Rating`, `POST /api/Transaction/Rating`, `POST /api/Transaction/ExcelDoc`, `GET /api/Transaction/VideoFtp`, `GET /api/Transaction/Video` | Monitor, detalles, rating, exportación y vídeo. |
| Bussines (ortografía backend) | `GET /api/Bussines/Paypad/{idPayPad}/Transactions?startDate&endDate` | Reporte agregado por Pay+. |
| Alerts | `GET /api/Alerts/Subscription`, `GET /api/Alerts/Subscription/{id}`, `GET /api/Alerts/Subscription/GetByPayPad/{idPayPad}`, `POST|PUT /api/Alerts/Subscription`, `DELETE /api/Alerts/Subscription/{id}` | Suscripciones. |

> **Endpoint ambiguo que requiere prueba de contrato:** `GET /api/Transaction/Paypad/{idTransaction}` y `GET /api/Transaction/{idPaypad}` usan nombres/segmentos que no expresan inequívocamente su identidad. La interfaz actual llama al segundo para transacciones de Pay+ y al primero para una transacción individual. La Fase 1 registrará ambos en pruebas de contrato antes de generalizar tipos.

### 3.6 Modelos observados y representación requerida

Los nombres de campo son los que serializan los DTO C# bajo configuración JSON por defecto observada en frontend (camelCase). Todos heredan, salvo indicación, metadatos `id`, `idUserCreated`, `userCreated`, `dateCreated`, `idUserUpdated`, `userUpdated`, `dateUpdated`.

| Modelo | Campos de negocio observados | Tratamiento previsto en frontend nuevo |
| --- | --- | --- |
| `UserDto` | documento, tipo de documento, username, nombre, apellido, teléfono, email, rol, status, cliente opcional, imagen/bytes/extensión, pwd | Password separado de la respuesta segura; imagen como payload de archivo/adaptador. |
| `RoleDto` | role, `routes[]`, `permissions[]` | Catálogos de relación y selección accesible. |
| `RouteDto` | idFather opcional, title, route, icon | Construcción de árbol defensiva y validación ante padre inexistente. |
| `PermissionDto` | name, description | Constantes tipadas para permisos conocidos y fallback seguro para valores backend. |
| `ClientDto` | name, nit, email, phone, idRegion/region, logo bytes/ruta/extensión, `offices[]` | Archivo en cliente; bytes solo en el adaptador de request. |
| `OfficeDto` | name, address, idClient | La relación con cliente es obligatoria en negocio. |
| `PayPadDto` | username, pwd, description, longitude, latitude, idCurrency/currency, status, idOffice/office | Coordenadas como texto decimal validado; nunca tratar credenciales como dato de lista. |
| `PayPadStorageDto` | Pay+, denominación, cantidades AP/DP/RJ y totales, `isDispensing`, `minDpQuantity` | Cantidades como enteros, dinero como string decimal/centavos. |
| `PayPadConfigurationDto` | debug, validatePeripherals, puertos scanner/arduino/dispenser/MEI/printer, dispenserDenominations, extraDataJson | Debe conservar strings/colección con validación Zod basada en contrato. |
| `LoadDto` / detalle | idPayPad, totalLoaded, detalles con denominación, valor y cantidad | Operación financiera irreversible; importes sin `number`, detalle solo de denominaciones dispensables configuradas. |
| `TonnageDto` / detalle | idPayPad, totals AP/DP/RJ/total y snapshot de cantidades por denominación | Operación financiera irreversible; fecha ISO con zona explícita y snapshot server-side confirmado. |
| `TransactionDto` / detalle | documento, referencia, producto, total/real/ingresado/devuelto, descripción, estado, tipo, pago, Pay+, detalles | Importes sin `number`; estados tipados de forma tolerante a backend. |
| `TransactionPayPadDto` | id de transacción, fecha pago, valor pagar decimal, medio pago, estado | Reporte por rango; fecha/importe adaptados en borde. |
| `TransactionRatingDto` | idTransaction, rating, dateCreated | Validar rango de rating solo cuando el backend lo confirme. |
| `SubscriptionDto` | idPayPad/paypad, idAlert/alert, email | El legado solo expone el alerta fijo `id: 1`, “Alerta de excases en baúles”. |
| Maestros | Currency.description; TypeDocument.typeDocument; Region.name; CurrencyDenomination.currency/idCurrency/value/image/bytes/extensión | Denominación usa archivo de imagen y moneda relacionada. |
| `DateRangeDto` | `id`, `from`, `to` como string | Convertir únicamente a ISO 8601 con offset/zona explícita tras confirmar formato backend. |

## 4. Flujos de negocio conservados

### 4.1 Usuarios y administración

- Login valida username sin caracteres especiales en el cliente legado; contraseña de inicio se cifra RSA-OAEP antes de enviarse.
- Usuarios permiten crear, editar, eliminar y cambiar contraseña. La validación de contraseña exige 8+ caracteres, mayúscula, minúscula y carácter especial; confirmar contraseña debe coincidir.
- Un usuario con permisos insuficientes puede consultar/editar su propia identidad y cambiar su propia contraseña, conforme al middleware.
- Roles enlazan rutas y permisos. El rol `id === 1` queda protegido contra borrado en la interfaz legado.
- Clientes administran región, logo convertido a arreglo de bytes y oficinas asociadas. Su eliminación tiene impacto sobre sucursales; el detalle de cascada definitivo corresponde a contrato backend/BD y debe probarse.
- Oficinas se crean/gestionan desde el contexto de un cliente; visitar la ruta legado sin `location.state` redirige a no autorizado.
- Currency, TypeDocument, Region y CurrencyDenomination son CRUD maestros. Descripciones de maestros rechazan caracteres especiales en la UI antigua. La denominación requiere moneda, valor e imagen; el archivo debe ser una imagen.

### 4.2 Pay+, almacenamiento y configuración

- Pay+ requiere nombre, descripción, longitud, latitud, moneda, cliente, oficina y, al crear, contraseña/confirmación. La UI de edición no cambia password en el formulario principal: lo hace mediante acción separada.
- La contraseña nueva de Pay+ usa la misma regla de complejidad, confirmación y verificación de contraseña actual en el backend.
- La validación de coordenadas heredada acepta la representación string cuyo `parseFloat(...).toString()` coincide exactamente. El backend también intenta `Convert.ToDouble`; el criterio regional/formato debe probarse antes de mejorar la UX.
- Storage permite configurar por denominación si dispensa y el mínimo operativo. Si el mínimo es distinto de cero, la denominación debe estar marcada para dispensación. Solo se envían filas seleccionadas o previamente dispensables.
- El backend valida Pay+ contra storage: si no hay detalles devuelve código semántico `1`; si una denominación dispensable llega a/bajo el mínimo devuelve código `2` y dispara correos para el umbral mínimo + 10 cuando hay suscripción de alerta 1.
- Configuración de Pay+ crea/actualiza puertos y flags. No se asumirá que los puertos admiten un patrón específico hasta verificar contrato.

### 4.3 Cargues

1. Se leen storage y denominaciones de la moneda del Pay+.
2. Solo se pueden cargar denominaciones configuradas para dispensación.
3. La UI calcula `totalLoaded` como suma de `denominationValue × quantity` y omite detalles de cantidad cero.
4. No se permite enviar un cargue vacío o total cero desde la UI legado.
5. Se muestra confirmación irreversible con el total, espera de red y resultado.
6. Backend crea cabecera y detalles; si falla un detalle, intenta borrar recursivamente el cargue creado y devuelve un mensaje específico si la denominación no está registrada para dispensación.

No hay endpoint público observado para editar/eliminar un cargue ya confirmado.

### 4.4 Arqueos

1. Se consulta storage actual del Pay+.
2. La vista separa aceptadores (AP), dispensadores (DP) y baúl de rechazo (RJ), y calcula sus totales para comunicar el movimiento.
3. Se confirma la operación como irreversible antes del POST.
4. El repositorio backend observado crea la cabecera de arqueo solamente con `idPayPad` e `idUserCreated`; no pasa los totales recibidos al procedimiento. Esto sugiere que el backend/procedimiento calcula un snapshot autoritativo, pero se debe confirmar con una respuesta real antes de modelar el request mínimo.
5. Historial muestra cabecera, fecha y detalles por denominación.

No hay endpoint público observado para editar/eliminar arqueos confirmados.

### 4.5 Transacciones, reportes y vídeo

- La pantalla de transacciones carga todas o por Pay+, permite filtro, resumen y detalle. El detalle presenta Pay+, producto, referencia, estado, descripción, fecha, total, total sin redondear, ingreso y devolución.
- Estados visuales conocidos: `Iniciada`, `Aprobada`, `Cancelada`, `Aprobada Error Devuelta`, `Cancelada Error Devuelta`, `Aprovada Sin Notificar` (ortografía heredada) y `Error Servicio de Tercero`. Valores desconocidos deben mostrarse con fallback neutral, no descartarse.
- El detalle agrupa movimientos por `(idTypeOperation, idCurrencyDenomination)` y cuenta unidades; muestra imagen de denominación cuando existe.
- El usuario puede solicitar descarga de vídeo para transacción/Pay+. Un `404` se traduce en el mensaje heredado “El vídeo no se encontró. Acceda al agilizador en específico para consultarlo.”
- Reportes filtra por Pay+ (incluye “Todos los Pay+”), rango de fecha y producto derivado localmente de transacciones inicialmente descargadas. Antes de reproducir este procesamiento se debe validar el endpoint que soporta “Todos” y el formato de las fechas.
- Hay exportación `ExcelDoc`, rating y upload/download de vídeo en API, aunque no todos aparecen como acción visible en las pantallas inspeccionadas.

## 5. Arquitectura destino propuesta

### 5.1 Estructura de carpetas de la aplicación nueva

La estructura se crea incrementalmente a partir de Fase 1; no se crearán carpetas vacías ni stubs para fingir cobertura.

```text
src/
  app/
    (public)/login/
    (dashboard)/...
    api/                         # Route Handlers BFF, sólo tras contrato confirmado
    layout.tsx
    globals.css
  components/
    ui/                          # Primitivos ya construidos
    layout/                      # Shell, navegación, breadcrumb, estados globales
    shared/                      # Data state, permiso, confirmación, importes, tablas duales
  features/
    auth/
    users/
    loads/
    tonnages/
    monitoring/
  lib/
    api/                         # cliente BFF, adaptadores y envelope/error parsing
    auth/
    money/
    datetime/
    permissions/
    query/
  schemas/                       # Zod request/response compartidos por dominio
  types/                         # tipos de dominio derivados de inferencias Zod
```

**Regla de dependencia:** `app` orquesta rutas; `features` contiene el caso de uso; `schemas` y `lib` no importan desde UI; `components/ui` no conoce negocio. La comunicación con backend se centraliza, no se replica con `fetch`/Axios ad hoc por vista.

### 5.2 BFF y sesión propuesta (pendiente de confirmación)

El navegador debe comunicarse por URLs relativas con los Route Handlers de Next. El BFF:

1. recibe credenciales por HTTPS en login;
2. cifra con RSA-OAEP si el backend continúa exigiéndolo;
3. llama al backend con el header requerido configurado en servidor;
4. guarda el JWT de backend exclusivamente en cookie HttpOnly, Secure y SameSite apropiada;
5. añade Bearer JWT al reenviar llamadas autorizadas;
6. normaliza envelope/error de backend sin esconder `statusCode` ni código semántico;
7. borra cookie y llama logout backend cuando corresponda.

Antes de implementarlo, se debe confirmar que el despliegue BFF puede enviar el `DashboardKeyId`, que el endpoint acepta la representación cifrada que produzca Node/Web Crypto, el dominio/cookies objetivo y la política CORS/backend. Si no se confirma, se detiene la implementación auth y se registra el resultado.

### 5.3 Tipos, validación y borde de API

- Cada request y response tendrá un schema Zod en `src/schemas/`, incluyendo el envelope `HttpResponse<T>` y error estructurado.
- El tipo de pantalla se inferirá de Zod o de una transformación explícita, no de `any` ni de cast amplio.
- Los adaptadores aislarán diferencias de naming, nullabilidad y tipos numéricos del backend. Se validará respuesta antes de entrar al cache/UI.
- Los importes de dominio serán `Money` basado en string decimal canónico o centavos enteros; no `number`. Los `double`/`decimal` provenientes del API se conservarán primero como texto JSON/controlado y se convertirán con una biblioteca/algoritmo decimal explícito.
- Las fechas se representarán como ISO 8601 con offset/zona explícita. Nunca se formateará mediante `split("T")`; se usará un adaptador que detecte/rechace timestamps sin zona cuando afecten negocio.
- Las imágenes y vídeos se manejarán con URL/Blob y error de descarga tipado; no se asumirá JSON para respuestas de archivo.

### 5.4 Datos remotos: TanStack Query v5

Cada feature usará keys jerárquicas, inmutables y tipadas. Forma objetivo:

```ts
const queryKeys = {
  paypads: {
    all: ["paypads"] as const,
    detail: (id: PayPadId) => ["paypads", "detail", id] as const,
    storage: (id: PayPadId) => ["paypads", "detail", id, "storage"] as const,
  },
};
```

- Queries exponen estados cargando, vacío, error/reintento y sin permisos por separado.
- Mutaciones esperan la respuesta, muestran toast y luego invalidan exactamente las keys afectadas.
- No habrá actualización optimista destructiva de cargues, arqueos ni eliminaciones sin una reversión demostrable.
- Cargues/arqueos deben tener botón deshabilitado en `isPending`, confirmación controlada y una estrategia de reconciliación ante timeout. La idempotencia real depende de soporte backend; no se fingirá en cliente.

### 5.5 Tablas y respuesta móvil

- TanStack Table v8 se usará en desktop; la misma colección/column metadata renderizará tarjetas accesibles en móvil.
- No se comprimirá una tabla horizontal en pantalla pequeña ni se habilitará scroll horizontal de página.
- Cuando haya contrato server-side, filtros, orden y paginación se enviarán a backend. El backend actual no los expone: hasta su ampliación no puede afirmarse que se cumple paginación/filter/sort server-side.
- Forms serán una columna en móvil, grids fluidos en desktop, sidebar como `Sheet`/drawer móvil y modal fullscreen móvil.

### 5.6 Tiempo real — diseño bloqueado por contrato ausente

Si se entrega un WebSocket/SignalR contract, su capa sólo emitirá eventos de invalidación/actualización de cache. TanStack Query continuará como fuente de verdad.

La implementación requerirá: contrato de URL/protocolo, autenticación, tipos de eventos, campos de orden/versión, política de reconexión/backoff, indicador de conexión y refetch al reconectar. No se simulará realtime con polling presentado como WebSocket.

## 6. Contratos que necesitan confirmación antes de código de dominio

| ID | Bloqueo / supuesto no resuelto | Impacto | Acción requerida |
| --- | --- | --- | --- |
| B-01 | No existe OpenAPI/contrato API versionado entregado. | Todos los schemas/adaptadores. | Facilitar OpenAPI/Postman/fixtures o autorizar una prueba controlada contra ambiente válido. |
| B-02 | No existe endpoint/contrato WebSocket o SignalR. | Fase 5 completa. | Facilitar URL, auth, eventos, orden/versión y política de reconnect. |
| B-03 | APIs no exponen paginación, filtrado u orden server-side. | Requisito transversal de tablas. | Ampliar contrato backend o aceptar formalmente una excepción temporal; no se inventa query protocol. |
| B-04 | Mutaciones financieras no documentan `Idempotency-Key` ni deduplicación. | Cargues/arqueos seguros. | Añadir soporte backend o definir procedimiento de conciliación/identificador de operación. |
| B-05 | `TonnageRepository.CreateAsync` parece ignorar totals del body y deja cálculo al SP. | Schema request de arqueo e integridad del snapshot. | Confirmar request/response real y semántica del procedimiento. |
| B-06 | Formato aceptado de fechas `DateRangeDto.from/to` y zona horaria no están documentados. | Reportes/transacciones. | Confirmar ISO con offset esperado y límites inclusivos. |
| B-07 | Currency/currency formatting se fija a `USD` en varias vistas, mientras Pay+ tiene moneda. | Mostrar importes y denominaciones correctamente. | Confirmar si el sistema admite múltiples monedas o el USD es regla explícita. |
| B-08 | Manual de marca no define asset/logo reutilizable, escala de spacing ni escala tipográfica. | Terminación de diseño. | Entregar assets y/o aprobar las derivaciones de tokens actuales. |
| B-09 | Contraste claro de `accent` + foreground blanco parece insuficiente para texto AA. | Accesibilidad. | Aprobar foreground/variante alternativa antes de usar el acento como fondo textual. |
| B-10 | BFF/cookies y envío server-side de header/clave pública no están validados contra entorno backend. | Fase 1 auth/infraestructura. | Confirmar host, CORS, cookies, cifrado y configuración de secretos. |
| B-11 | Varios endpoints de Transaction tienen nombres/rutas ambiguas y vídeo puede responder binario. | Schemas de transacción/monitoring. | Capturar fixtures o ejecutar pruebas de contrato. |
| B-12 | La secuencia de fases no asigna Roles, Routes, Clientes, Oficinas, Pay+ CRUD/configuración, Maestros, Alertas ni Reportes, aunque el mandato global pide migrar todo el frontend. | Planificación completa y dependencias de Cargues/Arqueos/Monitoreo. | Confirmar en qué fase entra cada área o autorizar fases adicionales. |

## 7. Validación ejecutada de Fase 0

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | **PASA** — TypeScript estricto sin errores. |
| `npm run lint` | **PASA** — ESLint sin warnings. |
| `npm run build` | **PASA** — Next.js 16.3.5 compiló y generó `/` y `/_not-found`. |
| `npm audit --omit=dev --json` | **PASA** — 0 vulnerabilidades. |
| `git diff --check` | **PASA** — sin errores de whitespace. |
| Colores no semánticos fuera de CSS global | **PASA** — búsqueda focalizada sin hex/RGB/HSL/paletas directas en `src/` fuera de `globals.css`. |
| Mobile dialog/drawer | **PASA por implementación estática** — fullscreen bajo `sm`; prueba manual visual posterior queda incluida por módulo. |
| Funcionalidad de dominio | **NO APLICA aún** — ningún módulo legado ha sido migrado antes de la confirmación de Fase 0. |

## 8. Límites explícitos de esta entrega

Esta fase **no** migra autenticación, TanStack Query provider, BFF, rutas privadas, usuarios, cargues, arqueos, monitoreo, datos reales ni WebSocket. Es una base de diseño y un inventario para permitir que esos módulos se implementen sin reescribir el sistema de interfaz ni adivinar contratos.
