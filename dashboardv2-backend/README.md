
<h1 align="center">Proyecto Dashboard</h1>
<h3 align="center">Web api creada para el uso de un dashboard de monitoreo</h3>



Acontinuación se explica el codigo del dashboard.

# Configuración del Servidor Web (web.config)

Este archivo XML configura el servidor web para una aplicación .NET Core utilizando IIS (Internet Information Services). A continuación, se detallan las secciones principales y sus propósitos.

## Configuración General

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
```

### Ubicación (`<location>`)

Define configuraciones específicas para el directorio raíz (`"."`) y establece que estas configuraciones no se hereden por aplicaciones hijas:

```xml
<location path="." inheritInChildApplications="false">
    <system.webServer>
        <handlers>
            <remove name="OPTIONSVerbHandler" />
            <remove name="TRACEVerbHandler" />
            <remove name="WebDAV" />
            <remove name="ExtensionlessUrlHandler-Integrated-4.0" />
            <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
            <add name="ExtensionlessUrlHandler-Integrated-4.0" path="*." verb="GET,HEAD,POST,DEBUG,PUT,DELETE" type="System.Web.Handlers.TransferRequestHandler" resourceType="Unspecified" requireAccess="Script" preCondition="integratedMode,runtimeVersionv4.0" responseBufferLimit="0" />
        </handlers>
        <aspNetCore processPath="dotnet" arguments=".\Api_DashboardV2.dll" stdoutLogEnabled="false" stdoutLogFile=".\logs\stdout" hostingModel="inprocess" />
    </system.webServer>
</location>
```

- **`<handlers>`**: Configura y elimina ciertos manejadores predeterminados para controlar las solicitudes HTTP.
  - Elimina `OPTIONSVerbHandler`, `TRACEVerbHandler`, `WebDAV`, y `ExtensionlessUrlHandler-Integrated-4.0`.
  - Agrega un manejador para aplicaciones .NET Core (`aspNetCore`) y un manejador actualizado para rutas sin extensión (`ExtensionlessUrlHandler-Integrated-4.0`).
- **`<aspNetCore>`**: Configura el módulo de .NET Core para IIS.
  - `processPath`: Ruta del ejecutable `dotnet`.
  - `arguments`: Archivo DLL principal de la aplicación.
  - `stdoutLogEnabled`: Habilita/deshabilita el registro de salida estándar.
  - `stdoutLogFile`: Ruta del archivo de registro.
  - `hostingModel`: Especifica el modelo de alojamiento (`inprocess`).

### Configuración de IIS

Establece configuraciones adicionales para IIS:

```xml
<system.webServer>
    <security>
        <requestFiltering>
            <verbs>
                <add verb="PUT" allowed="true" />
                <add verb="DELETE" allowed="true" />
            </verbs>
        </requestFiltering>
    </security>
    <modules>
        <remove name="WebDAVModule" />
    </modules>
</system.webServer>
```

- **`<requestFiltering>`**:
  - Permite los métodos HTTP `PUT` y `DELETE`.
- **`<modules>`**:
  - Elimina el módulo `WebDAVModule` para evitar conflictos con las configuraciones de la aplicación.

### Configuración General de ASP.NET

Define la configuración de identidad:

```xml
<system.web>
    <identity impersonate="false" />
</system.web>
```

- **`<identity>`**: Desactiva la suplantación de identidad.




# Configuración de la Aplicación (appsettings.json)



Este archivo JSON contiene la configuración principal para una aplicación ASP.NET Core, incluyendo configuraciones para logging, JWT, conexiones a bases de datos, claves de seguridad, y rutas de archivos estáticos.

## Configuración de Logging

Define los niveles de logging para la aplicación:

```json
"Logging": {
  "LogLevel": {
    "Default": "Information",
    "Microsoft.AspNetCore": "Warning"
  }
}
```

- **`Default`**: Registra mensajes a partir del nivel `Information`.
- **`Microsoft.AspNetCore`**: Registra mensajes a partir del nivel `Warning`.

## Configuración de Hosts Permitidos

```json
"AllowedHosts": "*"
```

- Permite todas las solicitudes, independientemente del host.

## Configuración de JWT

```json
"Jwt": {
  "Secret": "82DA790F-9ABF-4C1F-9AB2-B1C13F9536E4"
}
```

- **`Secret`**: Clave secreta utilizada para firmar los tokens JWT.

## Configuración de Claves de Seguridad

```json
"App": {
  "InternalSaltKey": "a2b23955-1f80-4432-a51c-bcaa2396dfae",
  "ExternalSaltKey": "1E4F66B8-8602-4F9F-9AAC-F1D329A4AB1D"
}
```

- **`InternalSaltKey`**: Clave interna para la generación de hashes.
- **`ExternalSaltKey`**: Clave externa para la generación de hashes.

## Configuración de Cadenas de Conexión

```json
"ConnectionStrings": {
  "DbConnectionDev": "server=192.168.20.24;database=DASHBOARD_PRUEBAS;uid=sa;pwd=1C1ty/*2019-;MultipleActiveResultSets=true;",
  "DbConnection": "server=192.168.20.24;database=DASHBOARD_PRODUCCION;uid=sa;pwd=1C1ty/*2019-;MultipleActiveResultSets=true;",
  "MongoDb": "mongodb://localhost:27017"
}
```

- **`DbConnectionDev`**: Conexión a la base de datos de desarrollo.
- **`DbConnection`**: Conexión a la base de datos de producción.
- **`MongoDb`**: URI de conexión para la base de datos MongoDB.

## Configuración de Entorno

```json
"Environment": "DEVELOPMENT"
```

- **`Environment`**: Determina el entorno actual. Opciones disponibles:
  - `"DEVELOPMENT"`
  - `"PRODUCTION"`

## Configuración de Archivos Estáticos

```json
"StaticRes": {
  "StaticFiles": "C:\\dashboardv2_staticfiles",
  "VideoFiles": "C:\\dashboardv2_videos"
}
```

- **`StaticFiles`**: Ruta local para almacenar archivos estáticos.
- **`VideoFiles`**: Ruta local para almacenar archivos de video.



```markdown
# `ExceptionMiddleware` - Middleware de Excepciones (ExceptionMiddleware.cs)

El `ExceptionMiddleware` es un middleware personalizado para gestionar excepciones globales y validar la clave secreta en las solicitudes entrantes en un servicio de API Dashboard.

## Propiedades

- **`_next`**: Delegado para la solicitud HTTP siguiente en la canalización.
- **`_logger`**: Logger para registrar eventos y errores.
- **`_configuration`**: Interfaz para acceder a la configuración de la aplicación.

## Constructor

```csharp
public ExceptionMiddleware(RequestDelegate next, IConfiguration configuration)
```

- **`next`**: Delegado al siguiente middleware.
- **`configuration`**: Configuración de la aplicación para obtener valores como claves secretas.

## Métodos Públicos

### `InvokeAsync(HttpContext httpContext)`

Intercepta y maneja las solicitudes HTTP:

- Valida la clave secreta mediante `ValidateHandleSecretKeyAsync`.
- Maneja excepciones no controladas llamando a `HandleGlobalExceptionAsync`.

#### Ejemplo:

```csharp
try
{
    if (httpContext.Response.HasStarted) return;
    if (ValidateHandleSecretKeyAsync(httpContext).Result)
    {
        await _next(httpContext);
    }
}
catch (Exception ex)
{
    _logger.LogError(ex, $"Dashboard Service. Something went wrong: {ex.Message}");
    await HandleGlobalExceptionAsync(httpContext, ex);
}
```

## Métodos Privados

### `ValidateHandleSecretKeyAsync(HttpContext context)`

Valida la clave secreta de la solicitud entrante:

- Verifica si el encabezado contiene la clave (`DASHBOARD_KEY_ID`).
- Compara la clave recibida con la almacenada en la configuración (`SALT_EXTERNAL`).
- Devuelve una respuesta con código HTTP 403 (Forbidden) si la validación falla.

#### Ejemplo:

```csharp
if (!context.Request.Headers.ContainsKey(AppSettings.DASHBOARD_KEY_ID))
{
    await EventLogger.Save(ETypeLog.Warning, $"Headers no contienen la KeyId");
    result = false;
}
else if (!secretKeyAPI.Trim().ToUpper().Equals(context.Request.Headers[AppSettings.DASHBOARD_KEY_ID].ToString().Trim().ToUpper()))
{
    await EventLogger.Save(ETypeLog.Warning, $"KeyId no es valida");
    result = false;
}
```

### `HandleGlobalExceptionAsync(HttpContext context, Exception ex)`

Maneja excepciones no controladas:

- Devuelve una respuesta con código HTTP 500 (Internal Server Error).
- Incluye información detallada del error como descripción, mensaje y traza de la pila.

#### Ejemplo:

```csharp
context.Response.ContentType = "application/json";
context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
await context.Response.WriteAsync(new HttpErrorResponse()
{
    statusCode = context.Response.StatusCode,
    description = ServiceMessages.ERROR,
    message = ex.Message,
    stackTrace = ex.StackTrace
}.ToString());
await EventLogger.Save(ETypeLog.Error, $"ExceptionMiddleware: Error no controlado: {ex.Message}");
```

## Dependencias

- **`HttpErrorResponse`**: Clase utilizada para generar respuestas JSON con información de errores.
- **`AppSettings`**: Contiene constantes como `SALT_EXTERNAL` y `DASHBOARD_KEY_ID`.
- **`ServiceMessages`**: Proporciona mensajes estándar para respuestas HTTP.
- **`EventLogger`**: Registra eventos en la base de datos o logs.

## Ejemplo de Uso

Agregar el middleware en el pipeline de la aplicación:

```csharp
public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    app.UseMiddleware<ExceptionMiddleware>();
    // Otros middlewares...
}
```

## Salidas de Errores

### Error de Validación de Clave

```json
{
  "statusCode": 403,
  "description": "Access forbidden",
  "message": "Invalid secret key"
}
```

### Error Interno

```json
{
  "statusCode": 500,
  "description": "An error occurred",
  "message": "Exception message here",
  "stackTrace": "Stack trace details"
}
```

## Registro de Errores

Los errores son registrados utilizando:

- **`ILogger`** para logs en el sistema.
- **`EventLogger.Save`** para persistir eventos específicos.

---
```
Explicación clase IgnoreAuthorizationMiddleware:

`IgnoreAuthorizationMiddleware`:

```markdown
# `IgnoreAuthorizationMiddleware` - Middleware para Ignorar Autorización

El `IgnoreAuthorizationMiddleware` es un middleware diseñado para permitir el paso de las solicitudes sin realizar validaciones de autorización. 

## Propiedades

- **`_next`**: Delegado que representa el siguiente middleware en la canalización de procesamiento de solicitudes.

## Constructor

```csharp
public IgnoreAuthorizationMiddleware(RequestDelegate next)
```

- **`next`**: Delegado al siguiente middleware en la canalización.

## Métodos Públicos

### `InvokeAsync(HttpContext httpContext)`

Método principal que permite que la solicitud pase al siguiente middleware sin realizar ninguna operación adicional.

- Verifica si la respuesta ya se ha iniciado (`httpContext.Response.HasStarted`) antes de continuar.
- Llama al siguiente middleware de la cadena utilizando `_next`.

#### Ejemplo:

```csharp
if (httpContext.Response.HasStarted) return;
await _next(httpContext);
```

## Ejemplo de Uso

Para integrar el middleware en la canalización de la aplicación, se agrega en el método `Configure` del archivo `Startup.cs` o en `Program.cs`:

```csharp
public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
{
    app.UseMiddleware<IgnoreAuthorizationMiddleware>();
    // Otros middlewares...
}
```

## Características

1. **Funcionalidad básica**: Este middleware no realiza ninguna operación específica más allá de delegar el control a la siguiente etapa.
2. **Útil para pruebas o excepciones**: Puede ser útil en rutas o entornos donde la autorización no es necesaria.

## Casos de Uso

- Ignorar temporalmente la autorización en ciertas rutas durante el desarrollo.
- Permitir solicitudes específicas que no requieren validación.

---

**Nota:** Este middleware no implementa lógica de autorización ni de manejo de errores. Úsalo con precaución en entornos de producción.
```


 `PermissionMiddleware` y su método `ProcessUserControllerPermission`:

```
# `PermissionMiddleware` - Middleware para Gestión de Permisos (PermissionMiddleware.cs)

El `PermissionMiddleware` es un middleware diseñado para validar permisos de acceso a recursos según el usuario autenticado, sus roles y permisos asignados.

---

## Propiedades

- **`_userBL`**: Interfaz para lógica de negocio relacionada con usuarios.
- **`_paypadBL`**: Interfaz para lógica de negocio relacionada con PayPad.
- **`_roleBL`**: Interfaz para lógica de negocio relacionada con roles.
- **`_permissionData`**: Datos de permisos relacionados con la sesión.
- **`_next`**: Delegado que representa el siguiente middleware en la cadena de procesamiento.

---

## Constructor

```csharp
public PermissionMiddleware(RequestDelegate next)
```

- **`next`**: Delegado para continuar con el siguiente middleware.

### Ejemplo de Configuración

En el método `Configure` o `Program.cs`, registra el middleware:

```csharp
app.UseMiddleware<PermissionMiddleware>();
```

---

## Métodos Públicos

### `InvokeAsync(HttpContext context, IUserBL userBL, IRoleBL roleBL, IPayPadBL paypadBL, PermissionData permissionData)`

Procesa cada solicitud, determina el controlador y la acción, y valida permisos según las políticas definidas.

- **Parámetros**:
  - `context`: Contiene información de la solicitud HTTP.
  - `userBL`: Lógica de negocio para usuarios.
  - `roleBL`: Lógica de negocio para roles.
  - `paypadBL`: Lógica de negocio para PayPad.
  - `permissionData`: Información sobre permisos actuales.
  
- **Flujo**:
  1. Obtiene los datos de la ruta (`controller` y `action`).
  2. Según el controlador, delega la validación a métodos específicos como `ProcessUserControllerPermission`.
  3. Maneja excepciones de permisos mediante `PermitException`.

---

## Métodos Privados

### `ProcessUserControllerPermission(HttpContext context, string actionName)`

Valida permisos específicos para acciones en el controlador `User`.

- **Parámetros**:
  - `context`: Contexto HTTP.
  - `actionName`: Nombre de la acción invocada.

- **Flujo**:
  1. Obtiene el usuario autenticado usando `GetUserLogged`.
  2. Recupera los permisos asociados al rol del usuario.
  3. Valida el permiso requerido según la acción (`ReadUsers`, `WriteUsers`, `DelUsers`).

- **Validación de Acciones**:
  - **Lectura**: `Get`, `GetByStatus`, `GetByRole`, `GetById`, etc.
    - Asegura que el permiso `ReadUsers` esté presente.
    - En algunas acciones, valida el acceso solo al usuario autenticado.
  - **Escritura**: `Post`, `Put`, `ChangePassword`.
    - Asegura que el permiso `WriteUsers` esté presente.
  - **Eliminación**: `Delete`.
    - Asegura que el permiso `DelUsers` esté presente.

- **Errores**:
  - Lanza `PermitException` si falta el permiso requerido.

#### Ejemplo de Acción Específica

```csharp
case "GetById":
{
    var requestPathSplited = context.Request.Path.Value?.Split("/");
    var idRequested = Convert.ToInt32(requestPathSplited?.Last());
    if (!hasReadPermit && userLogged.Id != idRequested) 
        throw new PermitException(NOT_ALLOWED_MSG + "Lectura de usuarios.");
    break;
}
```

---

## Manejo de Errores

### `PermitException`

Excepción personalizada para errores de permisos. Cuando ocurre, la solicitud se detiene, y se devuelve una respuesta con código **403 (Forbidden)**:

```csharp
await HandleUnauthorized(context, ex.Message);
```

---

## Ejemplo de Uso en `UserController`

### Escenario: Validar acceso para la acción `GetById`

- **Usuario root**: Tiene acceso a todas las acciones.
- **Usuario con permisos `ReadUsers`**: Puede acceder a los datos de cualquier usuario.
- **Usuario sin permisos**: Solo puede acceder a su propia información.

---

## Respuesta en Caso de Error

En caso de que el usuario no tenga los permisos adecuados, el middleware devuelve una respuesta JSON con un mensaje de error:

```json
{
  "statusCode": 403,
  "description": "Forbidden",
  "message": "No tiene permisos para acceder a este recurso: Lectura de usuarios."
}
```

---

## Notas

- Este middleware es extensible para otros controladores y acciones mediante métodos similares a `ProcessUserControllerPermission`.
- Útil para implementar un control centralizado de permisos basado en roles.
- Puede personalizarse para diferentes esquemas de autorización según las necesidades del proyecto.
```


/// Para los controladores  de login  (AuthController)

El controlador `AuthController` está implementado para manejar la autenticación y operaciones relacionadas con la sesión en tu API. Aquí hay un desglose de lo que hace cada endpoint:

### 1. **Login**
- Ruta: `POST /Auth/Login`
- Propósito: Inicia sesión validando el nombre de usuario y contraseña.
- Lógica:
  - Verifica si el usuario ha superado el número máximo de intentos fallidos.
  - Desencripta la contraseña usando RSA.
  - Llama al método `Login` de `_authenticationBL` para obtener un token.
  - Si es exitoso, reinicia los intentos fallidos y devuelve el token.
  - Si falla, registra un intento fallido y devuelve un error.

### 2. **LoginPayPad**
- Ruta: `POST /Auth/LoginPayPad`
- Propósito: Variante de inicio de sesión específica para un sistema de "PayPad".
- Lógica:
  - Similar a `Login`, pero usa el método `LoginPP` en lugar de `Login`.

### 3. **Logout**
- Ruta: `GET /Auth/Logout`
- Propósito: Cierra la sesión del usuario.
- Lógica:
  - Requiere un token JWT en el encabezado `Authorization`.
  - Llama al método `Logout` de `_authenticationBL` para invalidar el token.
  - Devuelve el resultado de la operación.

### 4. **VerifyPwd**
- Ruta: `POST /Auth/VerifyPwd`
- Propósito: Verifica si la contraseña proporcionada es correcta para el usuario.
- Lógica:
  - Similar a `Login`, pero en lugar de devolver un token, devuelve un booleano indicando si la contraseña es válida.

---

### Observaciones:
1. **Control de Intentos Fallidos**: 
   - La clase `AuthAttempts` maneja los intentos fallidos y parece funcionar como una protección básica contra fuerza bruta.

2. **Encriptación de Contraseñas**:
   - Utilizas `Encryption.DecryptRSA` para desencriptar contraseñas enviadas en la solicitud. Este enfoque puede ser inseguro si no se usan canales cifrados como HTTPS.

3. **Logging y Manejo de Errores**:
   - El uso de `EventLogger` para registrar eventos y errores es una buena práctica.

4. **Consistencia de Respuestas**:
   - Utilizas `GetResponseAsync` para estandarizar las respuestas, lo cual es positivo para mantener consistencia en la API.

---

### Recomendaciones:
1. **Validación de Entradas**:
   - Asegúrate de validar `LoginDto` para evitar inyecciones SQL o datos no válidos.

2. **Cifrado Seguro**:
   - Considera almacenar contraseñas como hashes en lugar de desencriptarlas.

3. **Manejo de Excepciones**:
   - El bloque de `catch` podría categorizar errores para devolver mensajes más específicos al cliente.

4. **Desglose del Límite de Intentos**:
   - Implementar un mecanismo para resetear el contador de intentos después de un período específico sería útil.

¿Hay algo específico que te gustaría ajustar o mejorar en este código?





```markdown
# BaseController

La clase `BaseController` actúa como una clase base para los controladores en la API. Proporciona un método genérico `GetResponseAsync<T>` para generar respuestas HTTP consistentes. Este método se puede reutilizar en otros controladores para manejar respuestas de manera estándar.

## Métodos

### `GetResponseAsync<T>`

Este método crea y devuelve una respuesta HTTP con un cuerpo consistente, que incluye el código de estado, el mensaje y el contenido de la respuesta.

#### Firma del método:

```csharp
public async Task<ObjectResult> GetResponseAsync<T>(HttpStatusCode statusCode, string message, T response)
```

#### Parámetros:
- **statusCode** (`HttpStatusCode`): El código de estado HTTP que se debe devolver en la respuesta (ejemplo: `HttpStatusCode.OK`, `HttpStatusCode.BadRequest`).
- **message** (`string`): Un mensaje descriptivo que se incluirá en la respuesta, como información adicional o un mensaje de error.
- **response** (`T`): El objeto genérico que se incluirá en el cuerpo de la respuesta. Puede ser cualquier tipo de objeto, dependiendo del tipo de respuesta que se espere.

#### Retorno:
Devuelve un `Task<ObjectResult>` que representa el resultado de la solicitud HTTP con el cuerpo adecuado, el código de estado y el mensaje.

#### Ejemplo de uso:

```csharp
public async Task<IActionResult> ExampleAction()
{
    var response = await _someService.GetData();
    if (response != null)
    {
        return await GetResponseAsync(HttpStatusCode.OK, "Data retrieved successfully", response);
    }
    return await GetResponseAsync(HttpStatusCode.BadRequest, "Failed to retrieve data", null);
}
```

En este ejemplo, el método `GetResponseAsync` es utilizado para devolver una respuesta con un código de estado `OK` si los datos son recuperados correctamente, o `BadRequest` si no se pudieron obtener los datos.

---

## Descripción General

La clase `BaseController` simplifica la generación de respuestas API en tu aplicación, proporcionando un formato común para todas las respuestas. Esto facilita la consistencia y el manejo de errores dentro de la aplicación.

### Ventajas:
- **Consistencia**: Todas las respuestas se devuelven con un formato estándar.
- **Reutilización**: El método `GetResponseAsync<T>` se puede usar en múltiples controladores.
- **Manejo de errores**: Se puede incluir un mensaje y un objeto de respuesta para explicar el estado de la operación.

### Recomendaciones:
- Asegúrate de manejar adecuadamente los posibles errores dentro de tus controladores antes de llamar a este método, para que el `message` y `response` representen claramente el estado de la solicitud.
```

---

Este archivo Markdown proporciona una documentación clara y detallada de la clase `BaseController` y el método `GetResponseAsync<T>`. Puedes utilizarlo para documentar tu API o como referencia para el uso de la clase base en tus controladores.




Aquí tienes la documentación en formato Markdown (.md) para la clase `OfficeController`:

# OfficeController

El controlador `OfficeController` gestiona las operaciones CRUD (Crear, Leer, Actualizar, Eliminar) relacionadas con las oficinas (`Office`). Esta clase hereda de `BaseController` y proporciona una interfaz de API RESTful para interactuar con las oficinas, incluyendo la capacidad de obtener, crear, actualizar y eliminar oficinas.

## Endpoints

### `GET /api/office`
Obtiene todas las oficinas.

#### Respuestas:
- **200 OK**: Si se encuentran oficinas, devuelve una lista de oficinas.
- **404 Not Found**: Si no se encuentran oficinas.
- **500 Internal Server Error**: En caso de un error inesperado en el servidor.

#### Ejemplo de respuesta:
```json
{
  "status": 200,
  "message": "OK",
  "data": [
    {
      "id": 1,
      "name": "Oficina A",
      "address": "Dirección A"
    },
    {
      "id": 2,
      "name": "Oficina B",
      "address": "Dirección B"
    }
  ]
}
```

---

### `GET /api/office/{id}`
Obtiene una oficina por su ID.

#### Parámetros:
- **id** (`int`): El ID de la oficina que se desea obtener.

#### Respuestas:
- **200 OK**: Si se encuentra la oficina con el ID especificado.
- **404 Not Found**: Si no se encuentra una oficina con el ID especificado.
- **500 Internal Server Error**: En caso de un error inesperado en el servidor.

#### Ejemplo de respuesta:
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "id": 1,
    "name": "Oficina A",
    "address": "Dirección A"
  }
}
```

---

### `GET /api/office/Client/{idClient}`
Obtiene todas las oficinas asociadas a un cliente específico.

#### Parámetros:
- **idClient** (`int`): El ID del cliente cuyas oficinas se desean obtener.

#### Respuestas:
- **200 OK**: Si se encuentran oficinas asociadas al cliente.
- **404 Not Found**: Si no se encuentran oficinas asociadas al cliente.
- **500 Internal Server Error**: En caso de un error inesperado en el servidor.

#### Ejemplo de respuesta:
```json
{
  "status": 200,
  "message": "OK",
  "data": [
    {
      "id": 1,
      "name": "Oficina A",
      "address": "Dirección A"
    }
  ]
}
```

---

### `POST /api/office`
Crea una nueva oficina.

#### Cuerpo de la solicitud:
```json
{
  "name": "Nueva Oficina",
  "address": "Dirección nueva"
}
```

#### Respuestas:
- **200 OK**: Si la oficina es creada exitosamente.
- **404 Not Found**: Si no se puede crear la oficina.
- **500 Internal Server Error**: En caso de un error inesperado en el servidor.

#### Ejemplo de respuesta:
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "id": 3,
    "name": "Nueva Oficina",
    "address": "Dirección nueva"
  }
}
```

---

### `PUT /api/office`
Actualiza una oficina existente.

#### Cuerpo de la solicitud:
```json
{
  "id": 1,
  "name": "Oficina Actualizada",
  "address": "Dirección actualizada"
}
```

#### Respuestas:
- **200 OK**: Si la oficina es actualizada exitosamente.
- **404 Not Found**: Si no se encuentra la oficina para actualizar.
- **500 Internal Server Error**: En caso de un error inesperado en el servidor.

#### Ejemplo de respuesta:
```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "id": 1,
    "name": "Oficina Actualizada",
    "address": "Dirección actualizada"
  }
}
```

---

### `DELETE /api/office/{id}`
Elimina una oficina por su ID.

#### Parámetros:
- **id** (`int`): El ID de la oficina a eliminar.

#### Respuestas:
- **200 OK**: Si la oficina es eliminada exitosamente.
- **404 Not Found**: Si no se encuentra una oficina con el ID especificado.
- **500 Internal Server Error**: En caso de un error inesperado en el servidor.

#### Ejemplo de respuesta:
```json
{
  "status": 200,
  "message": "OK",
  "data": true
}
```

---

## Dependencias
- **IRoleBL**: Interfaz para la lógica de negocio relacionada con los roles de usuario.
- **IUserBL**: Interfaz para la lógica de negocio relacionada con los usuarios.
- **IClientBL**: Interfaz para la lógica de negocio relacionada con los clientes.
- **IOfficeBL**: Interfaz para la lógica de negocio relacionada con las oficinas.
- **PermissionData**: Contiene los datos del usuario loggeado y su autorización.

## Manejo de Errores
El controlador maneja errores mediante bloques `try-catch`, registrando errores en el sistema de logs con `EventLogger.Save`, y devolviendo respuestas con códigos de estado HTTP apropiados.

## Autorización
Todos los endpoints requieren que el usuario esté autenticado mediante el atributo `[Authorize]`. Los usuarios deben estar autenticados para acceder a cualquier funcionalidad del controlador.

---

## Notas:
- Todos los métodos retornan respuestas estandarizadas utilizando el método `GetResponseAsync` heredado de `BaseController`.
- La clase maneja excepciones internas y proporciona respuestas detalladas en caso de errores.
```

---





# AutoMapper Configuración para DashboardV2

Este archivo configura AutoMapper para la aplicación DashboardV2. Utiliza perfiles para mapear entidades de la base de datos a objetos de transferencia de datos (DTOs) en la capa de presentación.

## Configuración de AutoMapper

### Clase `AutoMapperConfig`

La clase `AutoMapperConfig` contiene la configuración básica para agregar AutoMapper a los servicios de la aplicación.

```csharp
namespace DashboardV2.App_Start
{
    internal static class AutoMapperConfig
    {
        /// <summary>
        /// Agrega la configuración de AutoMapper al contenedor de servicios.
        /// </summary>
        /// <param name="services">Colección de servicios donde se registra el mapeo.</param>
        /// <returns>La colección de servicios con AutoMapper registrado.</returns>
        internal static IServiceCollection AddAutoMapperConfig(this IServiceCollection services)
        {
            var mapperConfig = new MapperConfiguration(mc => mc.AddProfile(new MappingProfile()));
            IMapper mapper = mapperConfig.CreateMapper();
            return services.AddSingleton(mapper);
        }
    }
}
```

### Clase `MappingProfile`

La clase `MappingProfile` es donde se define el mapeo entre las entidades del dominio y los DTOs que serán utilizados en la capa de presentación.

```csharp
namespace DashboardV2.App_Start
{
    /// <summary>
    /// Configuración del perfil de mapeo para AutoMapper.
    /// </summary>
    internal class MappingProfile : Profile
    {
        public MappingProfile()
        {
            #region Seguridad
            CreateMap<User, UserDto>()
                .ForMember(dest => dest.Pwd, opt => opt.MapFrom(src => (string)null)) // No mapeo del campo 'Pwd'
                .ForMember(dest => dest.IdTypeDocument, opt => opt.MapFrom(src => src.ID_TYPE_DOCUMENT)) // Mapeo de ID de tipo de documento
                .ForMember(dest => dest.IdRole, opt => opt.MapFrom(src => src.ID_ROLE)) // Mapeo de ID de rol
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED)) // Mapeo de ID de usuario creado
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED)) // Mapeo de ID de usuario actualizado
                .ForMember(dest => dest.Img, opt => opt.MapFrom(src => src.IMG)) // Mapeo de imagen
                .ForMember(dest => dest.IdClient, opt => opt.MapFrom(src => src.ID_CLIENT)) // Mapeo de ID de cliente
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED)) // Mapeo de fecha de creación
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED)) // Mapeo de fecha de actualización
                .ForMember(dest => dest.TypeDocument, opt => opt.MapFrom(src => src.TYPE_DOCUMENT)) // Mapeo de tipo de documento
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME)) // Mapeo de usuario creador
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME)); // Mapeo de usuario actualizado

            // Otros mapeos para las clases Role, Route, Session, Permission
            #endregion

            #region Negocios
            CreateMap<PayPad, PayPadDto>()
                .ForMember(dest => dest.IdCurrency, opt => opt.MapFrom(src => src.ID_CURRENCY)) // Mapeo de ID de moneda
                .ForMember(dest => dest.IdOffice, opt => opt.MapFrom(src => src.ID_OFFICE)) // Mapeo de ID de oficina
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED)) // Mapeo de ID de usuario creador
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED)) // Mapeo de ID de usuario actualizado
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED)) // Mapeo de fecha de creación
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED)) // Mapeo de fecha de actualización
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME)) // Mapeo de usuario creador
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME)); // Mapeo de usuario actualizado

            // Otros mapeos para PayPadConfiguration, ExtraData y más
            #endregion
        }
    }
}
```

## Explicación del Código

### Método `AddAutoMapperConfig`

Este método agrega la configuración de AutoMapper al contenedor de servicios de la aplicación, creando una instancia de `MapperConfiguration` con un perfil llamado `MappingProfile` que contiene las definiciones de mapeo. Luego, crea un objeto `IMapper` y lo registra como un servicio singleton.

### Clase `MappingProfile`

Dentro de la clase `MappingProfile`, se configuran los mapeos entre las entidades del dominio y los DTOs. Cada entidad del dominio (como `User`, `Role`, `PayPad`, etc.) se mapea a un DTO correspondiente (como `UserDto`, `RoleDto`, `PayPadDto`, etc.). El mapeo se realiza utilizando el método `CreateMap`, y algunos campos pueden ser personalizados utilizando `ForMember` para especificar cómo deben mapearse ciertos valores.

#### Ejemplos de Mapeos:
- El campo `Pwd` del `User` se mapea a `null` porque no se desea transmitir la contraseña.
- Se mapean los campos de fecha (`DateCreated` y `DateUpdated`) entre las entidades y los DTOs.
- Para ciertos objetos complejos, como `ExtraDataJson`, se utiliza `JsonConvert.DeserializeObject` para convertir un campo JSON a un objeto de tipo `List<ExtraData>`.

## Conclusión

Este archivo proporciona una configuración centralizada para AutoMapper en la aplicación, facilitando la conversión entre las entidades del dominio y los DTOs utilizados en la capa de presentación. Esto ayuda a mantener el código limpio, desacoplado y fácilmente escalable al agregar nuevos mapeos en el futuro.
```

Este formato proporciona una descripción clara del código, explicando las funciones y mapeos realizados, y está organizado de forma que sea fácil de leer y entender.





# Configuración de CORS para DashboardV2 CorsConfig.cs


Este archivo contiene la configuración de CORS (Cross-Origin Resource Sharing) para la aplicación DashboardV2. Se configuran las políticas necesarias para permitir el acceso de aplicaciones externas a los recursos del servidor.

## Clase `CorsConfig`

La clase `CorsConfig` contiene dos métodos esenciales para la configuración de CORS en la aplicación: uno para agregar la política de CORS a los servicios y otro para usar la política en la aplicación.

### Método `AddCorsDocumentation`

Este método agrega la configuración de CORS al contenedor de servicios de la aplicación. En este caso, se permite el acceso de cualquier origen, cualquier encabezado y cualquier método HTTP.

```csharp
namespace DashboardV2.App_Start
{
    internal static class CorsConfig
    {
        /// <summary>
        /// Configura la política CORS para permitir acceso desde cualquier origen, encabezado y método.
        /// </summary>
        /// <param name="services">Colección de servicios donde se registra la política de CORS.</param>
        /// <returns>La colección de servicios con la política de CORS registrada.</returns>
        internal static IServiceCollection AddCorsDocumentation(this IServiceCollection services)
        {
            services.AddCors(options =>
            {
                options.AddPolicy(AppSettings.CORS_NAME, builder => 
                {
                    builder.AllowAnyOrigin() // Permite cualquier origen
                           .AllowAnyHeader() // Permite cualquier encabezado
                           .AllowAnyMethod(); // Permite cualquier método HTTP
                });
            });
            return services;
        }
    }
}
```

- `AddCorsDocumentation` registra una política de CORS utilizando el nombre configurado en `AppSettings.CORS_NAME`.
- La política configurada permite:
  - Cualquier origen (`AllowAnyOrigin`).
  - Cualquier encabezado (`AllowAnyHeader`).
  - Cualquier método HTTP (`AllowAnyMethod`).

### Método `UseCorsDocumentation`

Este método aplica la política de CORS definida previamente en el pipeline de la aplicación.

```csharp
namespace DashboardV2.App_Start
{
    internal static class CorsConfig
    {
        /// <summary>
        /// Aplica la política de CORS a la aplicación.
        /// </summary>
        /// <param name="app">La aplicación a la que se le agrega la política de CORS.</param>
        /// <returns>La aplicación con la política de CORS aplicada.</returns>
        internal static IApplicationBuilder UseCorsDocumentation(this IApplicationBuilder app)
        {
            app.UseCors(AppSettings.CORS_NAME); // Aplica la política CORS configurada previamente
            return app;
        }
    }
}
```

- `UseCorsDocumentation` se utiliza para aplicar la política de CORS a la aplicación. Se pasa el nombre de la política configurada en `AppSettings.CORS_NAME` al método `UseCors`.

## Explicación del Código

### Método `AddCorsDocumentation`

Este método registra la política de CORS que se utilizará para manejar las solicitudes desde diferentes orígenes. Al permitir cualquier origen, encabezado y método, la configuración es bastante permisiva, lo que es útil para aplicaciones que necesitan acceso abierto desde diversas fuentes. Sin embargo, en producción, es recomendable restringir los orígenes, encabezados y métodos para mejorar la seguridad.

### Método `UseCorsDocumentation`

Este método se asegura de que la política de CORS definida se aplique al pipeline de la aplicación, permitiendo las solicitudes desde los orígenes configurados y conforme a las reglas de la política.

## Conclusión

La configuración de CORS en este archivo permite manejar las solicitudes provenientes de diferentes orígenes, lo que es necesario para aplicaciones que interactúan con múltiples clientes o servicios externos. La flexibilidad de la política permite personalizar el comportamiento del CORS según las necesidades de la aplicación.
```






# Configuración de Inyección de Dependencias para DashboardV2 DependencyInjectionConfig.cs

Este archivo contiene la configuración de inyección de dependencias para la aplicación DashboardV2. Utiliza el contenedor de dependencias de .NET Core (`IServiceCollection`) para registrar diversos servicios, componentes de negocio (BL), validaciones, repositorios y servicios de la aplicación.

## Clase `DependencyInjectionConfig`

La clase `DependencyInjectionConfig` tiene el propósito de configurar la inyección de dependencias en el contenedor de servicios de la aplicación. A través de esta configuración, se registran las implementaciones de las interfaces para que puedan ser inyectadas en los controladores, servicios u otros componentes de la aplicación.

### Método `AddDependenciesInjectionConfig`

Este método configura la inyección de dependencias registrando varias interfaces y sus implementaciones correspondientes en el contenedor de servicios.

```csharp
namespace DashboardV2.App_Start
{
    internal static class DependencyInjectionConfig
    {
        /// <summary>
        /// Configura la inyección de dependencias para la aplicación.
        /// </summary>
        /// <param name="services">Colección de servicios donde se registran las dependencias.</param>
        internal static void AddDependenciesInjectionConfig(this IServiceCollection services)
        {
            // Registra la clase PermissionData
            services.AddScoped(typeof(PermissionData));

            #region Application BL (Lógica de Negocio)

            // Registra las interfaces de la lógica de negocio (Business Logic)
            services.AddScoped(typeof(IAuthBL), typeof(AuthBL)); 
            services.AddScoped(typeof(ISessionBL), typeof(SessionBL));
            services.AddScoped(typeof(IUserBL), typeof(UserBL));
            services.AddScoped(typeof(ITokenBL), typeof(TokenBL));
            services.AddScoped(typeof(IRoleBL), typeof(RoleBL));
            services.AddScoped(typeof(IRouteBL), typeof(RouteBL));
            services.AddScoped(typeof(IMastersBL<CurrencyDto>), typeof(MastersBL<Currency, CurrencyDto>));
            services.AddScoped(typeof(IMastersBL<TypeDocumentDto>), typeof(MastersBL<TypeDocument, TypeDocumentDto>));
            services.AddScoped(typeof(IMastersBL<ConsecutiveCustomerDto>), typeof(MastersBL<ConsecutiveCustomer, ConsecutiveCustomerDto>));
            services.AddScoped(typeof(IMastersBL<RegionDto>), typeof(MastersBL<Region, RegionDto>));
            services.AddScoped(typeof(IMastersBL<CurrencyDenominationDto>), typeof(MastersBL<CurrencyDenomination, CurrencyDenominationDto>));
            services.AddScoped(typeof(IMastersBL<AlertDto>), typeof(MastersBL<Alert, AlertDto>));
            services.AddScoped(typeof(IPayPadBL), typeof(PayPadBL));
            services.AddScoped(typeof(IClientBL), typeof(ClientBL));
            services.AddScoped(typeof(IOfficeBL), typeof(OfficeBL));
            services.AddScoped(typeof(ITransactionBL), typeof(TransactionBL));
            services.AddScoped(typeof(ILoadBL), typeof(LoadBL));
            services.AddScoped(typeof(ITonnageBL), typeof(TonnageBL));
            services.AddScoped(typeof(ISubscriptionBL), typeof(SubscriptionBL));
            services.AddScoped(typeof(IPermissionBL), typeof(PermissionBL));

            #endregion

            #region Validaciones

            // Registra las interfaces de validación
            services.AddScoped(typeof(IUserValidation), typeof(UserValidation));
            services.AddScoped(typeof(IPayPadValidation), typeof(PayPadValidation));
            services.AddScoped(typeof(IClientValidation), typeof(ClientValidation));

            #endregion

            #region Repositorios

            // Registra los repositorios que interactúan con la base de datos
            services.AddScoped(typeof(IUserRepository), typeof(UserRepository));
            services.AddScoped(typeof(IRoleRepository), typeof(RoleRepository));
            services.AddScoped(typeof(IRouteRepository), typeof(RouteRepository));
            services.AddScoped(typeof(ISessionRepository), typeof(SessionRepository));
            services.AddScoped(typeof(IGenericRepository<Currency, CurrencyDto>), typeof(CurrencyRepository));
            services.AddScoped(typeof(IGenericRepository<TypeDocument, TypeDocumentDto>), typeof(TypeDocumentRepository));
            services.AddScoped(typeof(IGenericRepository<ConsecutiveCustomer, ConsecutiveCustomerDto>), typeof(ConsecutiveCustomerRepository));
            services.AddScoped(typeof(IGenericRepository<Region, RegionDto>), typeof(RegionRepository));
            services.AddScoped(typeof(IGenericRepository<CurrencyDenomination, CurrencyDenominationDto>), typeof(CurrencyDenominationRepository));
            services.AddScoped(typeof(IGenericRepository<Alert, AlertDto>), typeof(AlertsRepository));
            services.AddScoped(typeof(IGenericRepository<Subscription, SubscriptionDto>), typeof(SubscriptionRepository));
            services.AddScoped(typeof(IPayPadRepository), typeof(PayPadRepository));
            services.AddScoped(typeof(IClientRepository), typeof(ClientRepository));
            services.AddScoped(typeof(IOfficeRepository), typeof(OfficeRepository));
            services.AddScoped(typeof(ITransactionRepository), typeof(TransactionRepository));
            services.AddScoped(typeof(ILoadRepository), typeof(LoadRepository));
            services.AddScoped(typeof(ITonnageRepository), typeof(TonnageRepository));
            services.AddScoped(typeof(IPermissionRepository), typeof(PermissionRepository));

            #endregion

            #region Servicios

            // Registra los servicios externos de la aplicación
            services.AddScoped(typeof(EmailService));

            #endregion
        }
    }
}
```

## Secciones del Método `AddDependenciesInjectionConfig`

### 1. **Lógica de Negocio (Business Logic)**
   - Se registran los servicios de la lógica de negocio para las funcionalidades de autenticación, roles, sesiones, rutas, y otras entidades de dominio como monedas, clientes y suscripciones. 
   - Estas interfaces están asociadas con sus implementaciones correspondientes, como `AuthBL`, `RoleBL`, `UserBL`, entre otros.

### 2. **Validaciones**
   - Se registran los servicios de validación que permiten verificar las entradas y garantizar que cumplan con los requisitos antes de ser procesadas, como `UserValidation`, `PayPadValidation`, y `ClientValidation`.

### 3. **Repositorios**
   - Se registran los repositorios que interactúan con la base de datos, usando el patrón `GenericRepository` para entidades específicas como `Currency`, `Region`, y `Subscription`.
   - Los repositorios son responsables de gestionar las operaciones CRUD con la base de datos.

### 4. **Servicios Externos**
   - Se registran los servicios que no están directamente relacionados con la lógica de negocio o la persistencia de datos, pero que son necesarios para la funcionalidad de la aplicación, como el `EmailService` para el envío de correos electrónicos.

## Conclusión

Este archivo configura la inyección de dependencias en la aplicación DashboardV2, permitiendo que los componentes de la aplicación puedan acceder de manera transparente a los servicios de negocio, validación, repositorios y otros servicios necesarios. La correcta configuración de las dependencias garantiza un diseño limpio y modular, promoviendo el mantenimiento y la escalabilidad de la aplicación.
```

Este documento explica la configuración de la inyección de dependencias y cómo se registran los servicios, repositorios y validaciones en el contenedor de dependencias de .NET Core.


# Configuración de Middleware para Manejo de Excepciones ExceptionMiddlewareConfig.cs()

Este archivo contiene la configuración para el middleware que maneja las excepciones en la aplicación DashboardV2. A través de esta configuración, se asegura que cualquier excepción no manejada sea capturada y procesada por un middleware especializado en el manejo de errores.

## Clase `ExceptionMiddlewareConfig`

La clase `ExceptionMiddlewareConfig` está encargada de configurar el middleware que se utiliza para el manejo de excepciones en la aplicación. La clase incluye un método de extensión para el `IApplicationBuilder`, lo que permite agregar este middleware de manera sencilla en el pipeline de procesamiento de solicitudes.

### Método `UseExceptionMiddleware`

Este método de extensión agrega el middleware de excepciones a la cadena de procesamiento de solicitudes. Cuando una excepción no controlada ocurre durante el procesamiento de una solicitud HTTP, el middleware capturará esa excepción y la procesará según lo definido en el `ExceptionMiddleware`.

```csharp
namespace DashboardV2.App_Start
{
    internal static class ExceptionMiddlewareConfig
    {
        /// <summary>
        /// Configura el middleware de manejo de excepciones.
        /// </summary>
        /// <param name="app">La instancia de IApplicationBuilder para agregar el middleware.</param>
        /// <returns>La instancia de IApplicationBuilder para permitir el chaining de métodos.</returns>
        internal static IApplicationBuilder UseExceptionMiddleware(this IApplicationBuilder app)
        {
            // Verifica si la instancia de app es nula
            if (app == null)
                throw new ArgumentNullException(nameof(app));

            // Agrega el middleware de excepciones al pipeline de solicitudes
            return app.UseMiddleware<ExceptionMiddleware>();
        }
    }
}
```

## Descripción del Método `UseExceptionMiddleware`

- **Parámetro de entrada**:
  - `app`: Es la instancia de `IApplicationBuilder`, que representa el pipeline de solicitudes HTTP en la aplicación. Este parámetro es necesario para agregar el middleware a la cadena de procesamiento.

- **Acción**:
  - El método verifica si el parámetro `app` es `null` y lanza una excepción `ArgumentNullException` si es el caso, asegurando que se pase una instancia válida del `IApplicationBuilder`.
  - Luego, utiliza el método `UseMiddleware<ExceptionMiddleware>()` para agregar el middleware de manejo de excepciones al pipeline de la aplicación.

- **Valor de retorno**:
  - El método devuelve la misma instancia de `IApplicationBuilder` para permitir el encadenamiento de otros métodos de configuración del pipeline.

## Propósito

El propósito de este middleware es capturar cualquier excepción no manejada que ocurra en el procesamiento de las solicitudes HTTP y procesarla apropiadamente, evitando que la excepción cause fallos inesperados o respuestas incorrectas al cliente.





# Configuración del Middleware para Ignorar Autorización IgnoreAuthMiddlewareConfig.cs

Este archivo contiene la configuración para el middleware que se utiliza para omitir la autorización en ciertas rutas o solicitudes dentro de la aplicación DashboardV2. Esta configuración permite que ciertas rutas o solicitudes no requieran autenticación o autorización, lo cual puede ser útil en escenarios como endpoints públicos o durante el desarrollo.

## Clase `IgnoreAuthMiddlewareConfig`

La clase `IgnoreAuthMiddlewareConfig` está encargada de configurar el middleware que omite la autorización en el pipeline de solicitudes. La clase incluye un método de extensión para el `IApplicationBuilder`, lo que permite agregar este middleware de manera sencilla en la aplicación.

### Método `UseIgnoreAuthMiddleware`

Este método de extensión agrega el middleware para ignorar la autorización al pipeline de solicitudes. Este middleware puede ser utilizado para permitir el acceso a rutas específicas sin necesidad de autenticarse.

```csharp
namespace DashboardV2.App_Start
{
    internal static class IgnoreAuthMiddlewareConfig
    {
        /// <summary>
        /// Configura el middleware para omitir la autorización.
        /// </summary>
        /// <param name="app">La instancia de IApplicationBuilder para agregar el middleware.</param>
        /// <returns>La instancia de IApplicationBuilder para permitir el chaining de métodos.</returns>
        internal static IApplicationBuilder UseIgnoreAuthMiddleware(this IApplicationBuilder app)
        {
            // Verifica si la instancia de app es nula
            if (app == null)
                throw new ArgumentNullException(nameof(app));

            // Agrega el middleware para omitir la autorización al pipeline de solicitudes
            return app.UseMiddleware<IgnoreAuthorizationMiddleware>();
        }
    }
}
```

## Descripción del Método `UseIgnoreAuthMiddleware`

- **Parámetro de entrada**:
  - `app`: Es la instancia de `IApplicationBuilder`, que representa el pipeline de solicitudes HTTP de la aplicación. Este parámetro es necesario para agregar el middleware al pipeline.

- **Acción**:
  - El método verifica si el parámetro `app` es `null` y lanza una excepción `ArgumentNullException` si es el caso, asegurando que se pase una instancia válida del `IApplicationBuilder`.
  - Luego, utiliza el método `UseMiddleware<IgnoreAuthorizationMiddleware>()` para agregar el middleware que omite la autorización al pipeline de la aplicación.

- **Valor de retorno**:
  - El método devuelve la misma instancia de `IApplicationBuilder` para permitir el encadenamiento de otros métodos de configuración del pipeline.

## Propósito

El middleware `IgnoreAuthorizationMiddleware` tiene como propósito permitir que ciertas rutas o solicitudes se procesen sin requerir autenticación ni autorización. Esto es útil en casos donde ciertas partes de la aplicación necesitan estar abiertas al público o donde se desea omitir la autorización por razones específicas (por ejemplo, en entornos de desarrollo o pruebas).

## Conclusión

El middleware para omitir la autorización proporciona flexibilidad en el manejo de rutas que no requieren protección de acceso, lo que facilita el control sobre qué solicitudes deben ser autorizadas y cuáles pueden ser procesadas sin autenticación previa.
```

Este documento describe el funcionamiento y la finalidad del middleware que omite la autorización en la aplicación DashboardV2.


# Configuración de JWT (JSON Web Token) en DashboardV2 JWTConfig.cs

Este archivo configura la autenticación basada en JWT (JSON Web Token) para la aplicación **DashboardV2**. El objetivo es validar las solicitudes entrantes a través de un token JWT y proteger los recursos de la aplicación mediante autenticación y autorización.

## Clase `JWTConfig`

La clase `JWTConfig` define la configuración y los métodos necesarios para integrar la autenticación mediante JWT en la aplicación. Incluye la configuración de los parámetros de validación de tokens y la gestión de eventos relacionados con la autenticación.

### Métodos Principales

#### `AddJwtConfig`

Este método configura la autenticación mediante JWT en la colección de servicios de la aplicación. Establece los parámetros de validación del token y define los eventos que se manejarán durante el proceso de autenticación.

##### Parámetros:
- **`services`**: `IServiceCollection` - Colección de servicios donde se agrega la configuración de JWT.
- **`configuration`**: `IConfiguration` - Objeto que contiene la configuración de la aplicación, como la clave secreta para la validación del token JWT.

##### Código:

```csharp
internal static IServiceCollection AddJwtConfig(this IServiceCollection services, IConfiguration configuration)
{
    services.AddAuthentication(x =>
    {
        x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        x.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(x =>
    {
        x.SaveToken = true;
        x.RequireHttpsMetadata = false;
        x.TokenValidationParameters = GetTokenValidationParameters(configuration);
        x.Events = GetJWTBearerEvents();
    });
    return services;
}
```

#### `GetTokenValidationParameters`

Este método devuelve los parámetros necesarios para validar el token JWT recibido. Establece las reglas de validación como la firma del token, la validez de su vida útil, y las configuraciones relacionadas con el emisor y la audiencia.

##### Parámetros:
- **`configuration`**: `IConfiguration` - Contiene las configuraciones, como la clave secreta para la validación del token.

##### Código:

```csharp
internal static TokenValidationParameters GetTokenValidationParameters(IConfiguration configuration)
{
    return new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration[AppSettings.JWT_SECRET])),
        ValidateLifetime = true,
    };
}
```

#### `GetJWTBearerEvents`

Este método define los eventos que se ejecutan durante la autenticación JWT, como la gestión de errores si el token ha expirado. Si el token es inválido o ha expirado, la respuesta será un error `401 Unauthorized`.

##### Código:

```csharp
internal static JwtBearerEvents GetJWTBearerEvents()
{
    return new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            var endpoint = context.HttpContext.GetEndpoint();
            if (endpoint?.Metadata?.GetMetadata<IAllowAnonymous>() != null)
            {
                // Si el endpoint permite acceso anónimo, no valida la expiración del token
                return Task.CompletedTask;
            }

            if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
            {
                context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                context.Response.ContentType = "application/json";
                var message = $"{(int)ErrorCodes.TokenExpired}:El token JWT ha expirado.";
                var result = new HttpResponse<bool>(
                    statusCode: (int)HttpStatusCode.Unauthorized,
                    message: message,
                    response: false
                );
                context.Response.WriteAsync(result.ToString());
                EventLogger.Save(ETypeLog.Info, $"Token expirado.").GetAwaiter().GetResult();
            }
            return Task.CompletedTask;
        },
    };
}
```

#### `UseJWTConfig`

Este método agrega el middleware de autenticación JWT al pipeline de la aplicación, permitiendo que las solicitudes sean autenticadas utilizando JWT.

##### Parámetros:
- **`app`**: `IApplicationBuilder` - Objeto que configura el pipeline de solicitudes HTTP de la aplicación.

##### Código:

```csharp
internal static IApplicationBuilder UseJWTConfig(this IApplicationBuilder app)
{
    return app.UseAuthentication();
}
```

## Descripción General

La configuración de JWT en la aplicación **DashboardV2** proporciona los siguientes aspectos:

1. **Autenticación con JWT**: 
   - Cuando un usuario se autentica, se le asigna un token JWT que debe ser enviado con las siguientes solicitudes para acceder a los recursos protegidos de la aplicación.

2. **Validación del Token**: 
   - El token JWT se valida mediante la clave secreta configurada en el archivo de configuración de la aplicación (`AppSettings.JWT_SECRET`).
   - Se validan parámetros como la firma, la audiencia y la expiración del token.

3. **Manejo de Errores**:
   - Si el token ha expirado o es inválido, la aplicación responderá con un código de estado HTTP `401 Unauthorized` junto con un mensaje de error detallado.
   - Si el endpoint permite acceso anónimo (decorado con `AllowAnonymous`), el token no será validado.

4. **Eventos de JWT**:
   - Se gestionan eventos como el fallo en la autenticación debido a la expiración del token. En este caso, el sistema devuelve una respuesta con código `401` y un mensaje indicando que el token ha expirado.




El proyecto tiene varias clases de librerias como Dashboard.Application, explicare 3 de las principales clases ya que las demas se parecen mucho:






```markdown
# Documentación de `SubscriptionBL` (SubscriptionBL.cs)

La clase `SubscriptionBL` es parte de la capa de lógica de negocio (Business Logic) en la aplicación DashboardV2. Su función principal es gestionar las operaciones relacionadas con las suscripciones, interactuando con el repositorio correspondiente y transformando los datos entre las entidades de dominio (`Subscription`) y los objetos de transferencia de datos (DTOs) (`SubscriptionDto`). Además, esta clase implementa la interfaz `ISubscriptionBL`, que define los métodos de negocio para manejar las suscripciones.

## Clase `SubscriptionBL`

La clase `SubscriptionBL` proporciona operaciones CRUD (Crear, Leer, Actualizar, Eliminar) para las suscripciones, mapeando las entidades de dominio (`Subscription`) a DTOs (`SubscriptionDto`) utilizando la biblioteca **AutoMapper**.

### Dependencias

- **`IMapper`**: AutoMapper se utiliza para mapear entre las entidades de dominio y los DTOs.
- **`IConfiguration`**: Se utiliza para acceder a la configuración de la aplicación, aunque en este código no se usa explícitamente.
- **`IGenericRepository<Subscription, SubscriptionDto>`**: Repositorio genérico que maneja las operaciones de base de datos para las suscripciones.

### Constructor

```csharp
public SubscriptionBL(IMapper mapper, IConfiguration configuration, IGenericRepository<Subscription, SubscriptionDto> subsRepository)
```

Este constructor inicializa los servicios necesarios para la clase:
- **`mapper`**: Instancia de AutoMapper para realizar el mapeo entre entidades y DTOs.
- **`configuration`**: Accede a la configuración de la aplicación (actualmente no usado).
- **`subsRepository`**: Repositorio genérico para realizar operaciones CRUD con las suscripciones.

### Métodos

#### `GetByIdAsync`

Este método obtiene una suscripción por su identificador único (`id`). Devuelve un objeto `SubscriptionDto` correspondiente.

##### Parámetros:
- **`id`**: `int` - Identificador de la suscripción a obtener.

##### Retorna:
- **`Task<SubscriptionDto?>`**: Suscripción mapeada como `SubscriptionDto` o `null` si no se encuentra.

```csharp
public async Task<SubscriptionDto?> GetByIdAsync(int id)
{
    var subscription = _mapper.Map<SubscriptionDto>(await _susbscriptionRepository.GetByIdAsync(id));
    return subscription;
}
```

#### `GetByIdPaypadAsync`

Este método obtiene todas las suscripciones asociadas a un identificador de PayPad específico. Filtra las suscripciones por el campo `IdPayPad` y las devuelve como una lista de `SubscriptionDto`.

##### Parámetros:
- **`idPayPad`**: `int` - Identificador de PayPad.

##### Retorna:
- **`Task<List<SubscriptionDto>?>`**: Lista de suscripciones mapeadas como `SubscriptionDto` que corresponden al `idPayPad` proporcionado.

```csharp
public async Task<List<SubscriptionDto>?> GetByIdPaypadAsync(int idPayPad)
{
    var subscriptions = (await GetAllAsync())?.Where(sub => sub.IdPayPad == idPayPad).ToList();
    return subscriptions;
}
```

#### `GetAllAsync`

Este método obtiene todas las suscripciones disponibles en el sistema, las mapea a `SubscriptionDto` y las devuelve como una lista.

##### Retorna:
- **`Task<List<SubscriptionDto>?>`**: Lista de todas las suscripciones mapeadas como `SubscriptionDto`.

```csharp
public async Task<List<SubscriptionDto>?> GetAllAsync()
{
    var subscriptions  = _mapper.Map<List<SubscriptionDto>>(await _susbscriptionRepository.GetAllAsync());
    return subscriptions;
}
```

#### `CreateAsync`

Este método crea una nueva suscripción a partir de un DTO de suscripción. Luego mapea el resultado de la creación a un `SubscriptionDto`.

##### Parámetros:
- **`newEntry`**: `SubscriptionDto` - El DTO que contiene los datos de la nueva suscripción a crear.

##### Retorna:
- **`Task<SubscriptionDto?>`**: DTO de la nueva suscripción creada.

```csharp
public async Task<SubscriptionDto?> CreateAsync(SubscriptionDto newEntry)
{
    return _mapper.Map<SubscriptionDto>(await _susbscriptionRepository.CreateAsync(newEntry));
}
```

#### `UpdateAsync`

Este método actualiza una suscripción existente. Recibe un `SubscriptionDto`, realiza la actualización en la base de datos y devuelve el DTO actualizado.

##### Parámetros:
- **`entry`**: `SubscriptionDto` - DTO con los datos actualizados de la suscripción.

##### Retorna:
- **`Task<SubscriptionDto?>`**: DTO de la suscripción actualizada.

```csharp
public async Task<SubscriptionDto?> UpdateAsync(SubscriptionDto entry)
{
    return _mapper.Map<SubscriptionDto>(await _susbscriptionRepository.UpdateAsync(entry));
}
```

#### `DeleteByIdAsync`

Este método elimina una suscripción por su identificador. Si el ID proporcionado no es válido, lanza una excepción.

##### Parámetros:
- **`id`**: `int` - Identificador de la suscripción a eliminar.

##### Retorna:
- **`Task<bool>`**: `true` si la suscripción fue eliminada correctamente, `false` en caso contrario.

```csharp
public async Task<bool> DeleteByIdAsync(int id)
{
    if (id <= 0) throw new Exception("No se proporcionó un id para eliminar el recurso");
    return await _susbscriptionRepository.DeleteByIdAsync(id);
}
```

## Descripción General

La clase **`SubscriptionBL`** maneja todas las operaciones relacionadas con las suscripciones en el sistema, utilizando un enfoque basado en DTOs para abstraer los detalles de la base de datos y proporcionar una interfaz más limpia y coherente para las capas superiores. Utiliza **AutoMapper** para convertir entre las entidades del dominio y los DTOs, lo que permite mantener el código más limpio y modular. 

Los métodos de la clase cubren las operaciones básicas necesarias para la gestión de suscripciones: 
- Obtener suscripciones por ID o por `PayPad`
- Crear, actualizar y eliminar suscripciones.

## Conclusión

La clase **`SubscriptionBL`** ofrece una implementación estructurada y eficiente para interactuar con el repositorio de suscripciones. Al utilizar DTOs, el código se mantiene limpio y desacoplado de la lógica de acceso a datos, permitiendo una fácil extensión y mantenimiento.
```




```markdown
# Documentación de la Clase `ClientBL` (ClientBL.cs)

La clase `ClientBL` contiene la lógica de negocio para gestionar las operaciones CRUD (Crear, Leer, Actualizar, Eliminar) de los clientes, así como la gestión de las oficinas asociadas a cada cliente. Esta clase utiliza AutoMapper para el mapeo entre las entidades de dominio y los DTOs (Data Transfer Objects), e interactúa con las interfaces `IClientRepository`, `IClientValidation` e `IOfficeBL`.

## Dependencias

La clase depende de los siguientes componentes:

- **`IMapper`**: AutoMapper se usa para mapear entre las entidades de dominio y los DTOs.
- **`IClientRepository`**: Repositorio que maneja las operaciones de base de datos para los clientes.
- **`IClientValidation`**: Interfaz encargada de validar los datos de los clientes antes de realizar operaciones de creación o actualización.
- **`IOfficeBL`**: Lógica de negocio para gestionar las oficinas asociadas a los clientes.

## Constructor

```csharp
public ClientBL(IMapper mapper, IClientRepository clientRepository, IClientValidation clientValidation, IOfficeBL officeBL)
```

Este constructor inicializa las dependencias necesarias para la clase `ClientBL`:
- **`mapper`**: Instancia de AutoMapper para realizar el mapeo entre las entidades del dominio y los DTOs.
- **`clientRepository`**: Repositorio que interactúa con la base de datos para gestionar los clientes.
- **`clientValidation`**: Instancia de la interfaz de validación de clientes.
- **`officeBL`**: Lógica de negocio para gestionar las oficinas asociadas a los clientes.

## Métodos

### `GetByIdAsync`

Este método obtiene un cliente por su identificador (`id`) y carga las oficinas asociadas a ese cliente.

#### Parámetros:
- **`id`**: `int` - El identificador del cliente a obtener.

#### Retorna:
- **`Task<ClientDto?>`**: El DTO del cliente con el listado de oficinas asociadas.

```csharp
public async Task<ClientDto?> GetByIdAsync(int id)
{
    var client = _mapper.Map<ClientDto>(await _clientRepository.GetByIdAsync(id));
    var offices = _mapper.Map<List<OfficeDto>>(await _officeBL.GetByClientAsync(client.Id));
    client.Offices = offices;
    return client;
}
```

### `GetAllAsync`

Este método obtiene todos los clientes y sus oficinas asociadas.

#### Retorna:
- **`Task<List<ClientDto>?>`**: Lista de todos los clientes con sus oficinas asociadas.

```csharp
public async Task<List<ClientDto>?> GetAllAsync()
{
    var clients = _mapper.Map<List<ClientDto>>(await _clientRepository.GetAllAsync());
    foreach (var client in clients)
    {
        var offices = _mapper.Map<List<OfficeDto>>(await _officeBL.GetByClientAsync(client.Id));
        client.Offices = offices;
    }
    return clients;
}
```

### `CreateAsync`

Este método crea un nuevo cliente. También valida los datos del cliente antes de almacenarlo en la base de datos y gestiona el procesamiento de la imagen del logo del cliente.

#### Parámetros:
- **`newClient`**: `ClientDto` - El DTO con los datos del cliente a crear.
- **`idUserCreator`**: `int` - El identificador del usuario que crea el cliente.

#### Retorna:
- **`Task<ClientDto?>`**: El DTO del cliente creado.

```csharp
public async Task<ClientDto?> CreateAsync(ClientDto newClient, int idUserCreator)
{
    var clientToCreate = newClient;
    clientToCreate.IdUserCreated = idUserCreator;
    SaveCurrencyDenominationImg(ref clientToCreate);
    _clientValidation.ValidateClient(ref clientToCreate);
    return _mapper.Map<ClientDto>(await _clientRepository.CreateAsync(clientToCreate));
}
```

### `UpdateAsync`

Este método actualiza los datos de un cliente existente. Si no se encuentra el cliente, lanza una excepción. También gestiona el procesamiento de la imagen del logo y valida los datos del cliente.

#### Parámetros:
- **`client`**: `ClientDto` - El DTO con los datos del cliente a actualizar.

#### Retorna:
- **`Task<ClientDto?>`**: El DTO del cliente actualizado.

```csharp
public async Task<ClientDto?> UpdateAsync(ClientDto client)
{
    ClientDto? currentClientToUpdate = _mapper.Map<ClientDto>(await _clientRepository.GetByIdAsync(client.Id));
    if (currentClientToUpdate == null) throw new Exception("El cliente no existe, no es posible modificarlo, debe crear el cliente");

    var clientToUpdate = client;
    if (clientToUpdate.LogoImgList == null || clientToUpdate.LogoImgList.Count <= 0)
    {
        clientToUpdate.LogoImg = currentClientToUpdate.LogoImg;
        clientToUpdate.ImgExt = currentClientToUpdate.ImgExt;
    }
    else
        SaveCurrencyDenominationImg(ref clientToUpdate);

    _clientValidation.ValidateClient(ref clientToUpdate);
    return _mapper.Map<ClientDto>(await _clientRepository.UpdateAsync(clientToUpdate));
}
```

### `DeleteByIdAsync`

Este método elimina un cliente y las oficinas asociadas a él. Si no se puede eliminar alguna oficina, lanza una excepción.

#### Parámetros:
- **`id`**: `int` - El identificador del cliente a eliminar.

#### Retorna:
- **`Task<bool>`**: `true` si la eliminación fue exitosa, de lo contrario `false`.

```csharp
public async Task<bool> DeleteByIdAsync(int id)
{
    if (id <= 0) throw new Exception("No se proporcionó un id para eliminar el recurso");
    var offices = _mapper.Map<List<OfficeDto>>(await _officeBL.GetByClientAsync(id));
    foreach (var office in offices)
    {
        bool wasDeleted = await _officeBL.DeleteByIdAsync(office.Id);
        if (!wasDeleted) throw new Exception($"La sucursal {office.Name} no se pudo borrar, el cliente no se pudo eliminar");
    }
    return await _clientRepository.DeleteByIdAsync(id);
}
```

### `SaveCurrencyDenominationImg`

Este método guarda la imagen del logo del cliente en un directorio específico y la asocia con el cliente. El nombre de la imagen se genera dinámicamente en función del nombre del cliente y su extensión.

#### Parámetros:
- **`client`**: `ref ClientDto` - El cliente cuyo logo será procesado.

```csharp
private void SaveCurrencyDenominationImg(ref ClientDto client)
{
    string imgPath = @"images\clients";
    imgPath = Path.Combine(imgPath, $"{client.Name.Replace(" ", string.Empty)}.{client.ImgExt}");
    client.LogoImg = "/" + imgPath.Replace('\\', '/');
    ImageAdmin.SaveStaticImage(imgPath, client.LogoImgList.ToArray());
}
```

## Descripción General

La clase `ClientBL` gestiona todas las operaciones de negocio relacionadas con los clientes. Permite realizar las siguientes acciones:
- Obtener clientes por su identificador o una lista de todos los clientes.
- Crear un nuevo cliente y validar sus datos.
- Actualizar un cliente existente, manteniendo los datos anteriores si no se proporcionan nuevos.
- Eliminar un cliente y sus oficinas asociadas.

Además, gestiona el procesamiento de las imágenes del logo del cliente, asegurándose de que se guardan correctamente en el servidor y se actualizan en los registros del cliente.

## Conclusión

La clase `ClientBL` es una pieza central en la aplicación Dashboard para gestionar los clientes y sus datos asociados. Su diseño modular y su integración con AutoMapper y validaciones aseguran que las operaciones se realicen de manera eficiente y robusta.
```


```markdown
# Documentación de la Clase `AuthBL` AuthBL()

La clase `AuthBL` es responsable de gestionar las operaciones relacionadas con la autenticación de usuarios y dispositivos (PayPads). Proporciona funcionalidades para verificar contraseñas, iniciar y cerrar sesión, y generar tokens de autenticación. Interactúa con los servicios relacionados con usuarios, sesiones y PayPads.

## Dependencias

La clase depende de los siguientes servicios e interfaces:

- **`ITokenBL`**: Genera los tokens de autenticación para los usuarios y dispositivos.
- **`IUserBL`**: Proporciona funcionalidades relacionadas con los usuarios, como obtener información del usuario o la contraseña.
- **`IPayPadBL`**: Proporciona funcionalidades relacionadas con los dispositivos PayPad, como obtener información o la contraseña.
- **`IPayPadValidation`**: Valida la contraseña de los dispositivos PayPad.
- **`IUserValidation`**: Valida la contraseña de los usuarios.
- **`ISessionBL`**: Maneja las sesiones de los usuarios, incluyendo la creación y actualización de sesiones activas.

## Constructor

```csharp
public AuthBL(ITokenBL tokenBL, IUserValidation userValidation, IUserBL userBL, IPayPadBL paypadBL, IPayPadValidation payPadValidation, ISessionBL sessionBL)
```

Este constructor inicializa las dependencias necesarias para la clase `AuthBL`:

- **`tokenBL`**: Instancia de `ITokenBL` que genera tokens de autenticación.
- **`userBL`**: Instancia de `IUserBL` que maneja la información de los usuarios.
- **`userValidation`**: Instancia de `IUserValidation` que valida las contraseñas de los usuarios.
- **`paypadBL`**: Instancia de `IPayPadBL` que maneja la información de los dispositivos PayPad.
- **`paypadValidation`**: Instancia de `IPayPadValidation` que valida las contraseñas de los dispositivos PayPad.
- **`sessionBL`**: Instancia de `ISessionBL` que maneja las sesiones de los usuarios.

## Métodos

### `VerifyPwd`

Verifica la contraseña de un usuario. Si el usuario existe y la contraseña es correcta, retorna `true`, de lo contrario, retorna `false`.

#### Parámetros:
- **`loginData`**: `LoginDto` - El DTO con los datos de inicio de sesión (nombre de usuario y contraseña).

#### Retorna:
- **`Task<bool>`**: `true` si la contraseña es correcta, `false` si no lo es.

```csharp
public async Task<bool> VerifyPwd(LoginDto loginData)
{
    UserDto? user = await _userBL.GetByUserNameAsync(loginData.userName);
    if (user == null || user.Document == null) return false;
    user.Pwd = await _userBL.GetUserPasswordAsync(user.Document);
    var userResult = _userValidation.IsPasswordCorrect(user, loginData.password);
    if (userResult == null) return false;

    return true;
}
```

### `Login`

Realiza el inicio de sesión de un usuario. Si las credenciales son correctas y no hay sesiones activas, se genera un token y se crea una nueva sesión para el usuario.

#### Parámetros:
- **`loginData`**: `LoginDto` - El DTO con los datos de inicio de sesión (nombre de usuario y contraseña).

#### Retorna:
- **`Task<string?>`**: El token de autenticación si el inicio de sesión es exitoso, o `null` si las credenciales son incorrectas o ya existe una sesión activa para el usuario.

```csharp
public async Task<string?> Login(LoginDto loginData)
{
    UserDto? user = await _userBL.GetByUserNameAsync(loginData.userName);
    if (user == null || user.Document == null) return null;
    user.Pwd = await _userBL.GetUserPasswordAsync(user.Document);
    var userResult = _userValidation.IsPasswordCorrect(user, loginData.password);
    if (userResult == null) return null;

    var userActiveSessions = (await _sessionBL.GetByUserAsync(user.Id))?.Where(s => s.Active == true).ToList();
    if ((userActiveSessions == null || userActiveSessions.Count > 0) && user.Id != 1) 
        throw new Exception("El usuario ya tiene una sesión activa, cierre dicha sesión para iniciar una nueva.");

    var token = _tokenBL.GenerateToken(userResult);
    SessionDto newSession = new SessionDto
    {
        IdUser = userResult.Id,
        Token = token,
        Active = true,
    };
    await _sessionBL.CreateAsync(newSession);
    return token;
}
```

### `Logout`

Cierra la sesión de un usuario utilizando el token de autenticación. Si el token es válido, se actualiza la sesión como inactiva.

#### Parámetros:
- **`token`**: `string` - El token de autenticación de la sesión a cerrar.

#### Retorna:
- **`Task<bool>`**: `true` si el cierre de sesión es exitoso, o `false` si no se encontró una sesión activa asociada al token.

```csharp
public async Task<bool> Logout(string token)
{
    var session = await _sessionBL.GetByTokenAsync(token);
    if (session == null) return false;

    session.Active = false; 
    await _sessionBL.UpdateAsync(session);
    return true;
}
```

### `LoginPP`

Realiza el inicio de sesión de un dispositivo PayPad. Si las credenciales son correctas, se genera un token de autenticación.

#### Parámetros:
- **`loginData`**: `LoginDto` - El DTO con los datos de inicio de sesión (nombre de usuario y contraseña).

#### Retorna:
- **`Task<string?>`**: El token de autenticación si las credenciales son correctas, o `null` si no lo son.

```csharp
public async Task<string?> LoginPP(LoginDto loginData)
{
    PayPadDto? paypad = await _paypadBL.GetByUsernameAsync(loginData.userName);
    if (paypad == null || paypad.Username == null) return null;
    paypad.Pwd = await _paypadBL.GetPaypadPasswordAsync(paypad.Username);
    var paypadResult = _paypadValidation.IsPasswordCorrect(paypad, loginData.password);
    if (paypadResult != null)
        return _tokenBL.GenerateToken(paypadResult);

    return null;
}
```

## Descripción General

La clase `AuthBL` maneja la autenticación de usuarios y dispositivos PayPad en el sistema. Los métodos incluyen:

- **Verificación de contraseñas**: `VerifyPwd` valida si la contraseña proporcionada es correcta.
- **Inicio de sesión**: `Login` gestiona el inicio de sesión para los usuarios, incluyendo la validación de sesiones activas.
- **Cierre de sesión**: `Logout` cierra la sesión de un usuario basado en el token.
- **Login para PayPads**: `LoginPP` permite iniciar sesión para dispositivos PayPad y genera un token si las credenciales son correctas.

## Conclusión

La clase `AuthBL` centraliza la lógica de autenticación, validación de contraseñas y gestión de sesiones para usuarios y dispositivos. Utiliza un sistema basado en tokens para asegurar las sesiones y gestionar el acceso de manera segura.
```

Este archivo de documentación (`AuthBL_Documentation.md`) describe el comportamiento y la implementación de la clase `AuthBL`, así como las interacciones con otros servicios y las validaciones que realiza.
```

## libreria de clases Dashboard.Domain 


Esta libreria de clases contiene los modelos, Dtos, respuestas de cosultas errorneas, interfaces, entidades, control de excepciones, enumerables, que se utilizan en la  aplicación 
des esta libreria se explicaran solo dos clases:




---

# Documentación de la Clase `Encryption` Encryption.cs

## Descripción General

La clase `Encryption` contiene métodos estáticos para manejar de forma segura las contraseñas y realizar operaciones de cifrado. Soporta la validación de contraseñas hasheadas, la generación de hashes de contraseñas con una sal, y el cifrado/descifrado de datos usando claves RSA. La clase asegura que los datos sensibles, como las contraseñas, se almacenen y transmitan de forma segura.

### Dependencias
- **AppSettings**: Esta clase contiene las configuraciones para acceder a los valores de la sal utilizados en las operaciones de hashing.
- **IConfiguration**: Proporciona acceso a la configuración de la aplicación, como el valor de la sal utilizado para el hashing de contraseñas.

---

## Métodos

### `ValidateEncodedPassword(this string password, string hashedPwd, IConfiguration configuration)`
Valida una contraseña proporcionada contra una contraseña hasheada almacenada utilizando una sal.

- **Parámetros**:
  - `password` (`string`): La contraseña en texto plano que se desea validar.
  - `hashedPwd` (`string`): La contraseña hasheada previamente almacenada en el sistema.
  - `configuration` (`IConfiguration`): La configuración de la aplicación que contiene el valor de la sal (`AppSettings.SALT_INTERNAL`).

- **Retorna**:
  - `bool`: `true` si la contraseña proporcionada coincide con la contraseña hasheada almacenada, de lo contrario `false`.

- **Descripción**:
  Este método concatena la contraseña con una sal (extraída de la configuración), la hashea utilizando el algoritmo SHA-256, y compara el resultado con la contraseña hasheada almacenada para validar la contraseña.

### `GenerarHash(this string contrasena, IConfiguration configuration)`
Genera un hash para la contraseña proporcionada utilizando una sal extraída de la configuración.

- **Parámetros**:
  - `contrasena` (`string`): La contraseña en texto plano que se desea hashear.
  - `configuration` (`IConfiguration`): La configuración de la aplicación que contiene el valor de la sal (`AppSettings.SALT_INTERNAL`).

- **Retorna**:
  - `string`: La contraseña resultante en formato Base64.

- **Descripción**:
  Este método genera un hash de la contraseña proporcionada concatenándola con una sal y luego utilizando el algoritmo de hashing SHA-256. El resultado se devuelve como una cadena en formato Base64.

### `DecryptRSA(string pwdEncrypted)`
Descifra una contraseña proporcionada utilizando el algoritmo de descifrado RSA.

- **Parámetros**:
  - `pwdEncrypted` (`string`): La contraseña cifrada en formato Base64.

- **Retorna**:
  - `string`: La contraseña descifrada en texto plano.

- **Descripción**:
  Este método lee la clave privada RSA de un archivo (`private.pem`), descifra la contraseña cifrada usando el algoritmo RSA y devuelve la contraseña descifrada como una cadena.

### `EncryptRSA(string pwd)`
Cifra una contraseña proporcionada utilizando el algoritmo de cifrado RSA.

- **Parámetros**:
  - `pwd` (`string`): La contraseña en texto plano que se desea cifrar.

- **Retorna**:
  - `string`: La contraseña cifrada en formato Base64.

- **Descripción**:
  Este método lee la clave pública RSA de un archivo (`public.pem`), cifra la contraseña proporcionada utilizando el algoritmo RSA y devuelve la contraseña cifrada como una cadena en formato Base64.

---

## Ejemplo de Código

```csharp
using System.Security.Cryptography;
using System.Text;

namespace Dashboard.Domain
{
    public static class Encryption
    {
        public static bool ValidateEncodedPassword(this string password, string hashedPwd, IConfiguration configuration)
        {
            byte[] passwordBytes = Encoding.UTF8.GetBytes(password);
            byte[] saltBytes = Encoding.UTF8.GetBytes(configuration[AppSettings.SALT_INTERNAL]);
            byte[] saltedValue = passwordBytes.Concat(saltBytes).ToArray();
            using (SHA256 sha256Hash = SHA256.Create())
            {
                string saltedHash = Convert.ToBase64String(sha256Hash.ComputeHash(saltedValue));
                byte[] hashedPwdBytes = Encoding.UTF8.GetBytes(hashedPwd);
                byte[] saltedHashBytes = Encoding.UTF8.GetBytes(saltedHash);
                return hashedPwdBytes.SequenceEqual(saltedHashBytes);
            }
        }

        public static string GenerarHash(this string contrasena, IConfiguration configuration)
        {
            byte[] contrasenaBytes = Encoding.UTF8.GetBytes(contrasena);
            byte[] saltBytes = Encoding.UTF8.GetBytes(configuration[AppSettings.SALT_INTERNAL]);
            byte[] saltedValue = contrasenaBytes.Concat(saltBytes).ToArray();
            using (SHA256 sha256Hash = SHA256.Create())
                return Convert.ToBase64String(sha256Hash.ComputeHash(saltedValue));
        }

        public static string DecryptRSA(string pwdEncrypted)
        {
            var privateKeyText = File.ReadAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "rsa_keys\\private.pem"));
            var privateKey = new RSACryptoServiceProvider();
            privateKey.ImportFromPem(privateKeyText);

            byte[] pwdEncryptedBytes = Convert.FromBase64String(pwdEncrypted);
            byte[] decryptedData = privateKey.Decrypt(pwdEncryptedBytes, true);

            string result = Encoding.UTF8.GetString(decryptedData);
            return result;   
        }

        public static string EncryptRSA(string pwd)
        {
            byte[] pwdBytes = Encoding.UTF8.GetBytes(pwd);
            var publicKeyText = File.ReadAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "rsa_keys\\public.pem"));
            var publicKey = new RSACryptoServiceProvider();
            publicKey.ImportFromPem(publicKeyText);

            byte[] encryptedData = publicKey.Encrypt(pwdBytes, true);

            string result = Convert.ToBase64String(encryptedData);
            return result;
        }
    }
}
```

---

## Configuración

La clase depende de un valor de sal (`SALT_INTERNAL`) almacenado en la configuración de la aplicación. Asegúrate de que este valor esté almacenado de forma segura y sea consistente en toda la aplicación.

Ejemplo en `appsettings.json`:

```json
{
  "SALT_INTERNAL": "valor_de_salt_aqui"
}
```

Además, las claves RSA pública y privada (`public.pem` y `private.pem`) se almacenan en la carpeta `rsa_keys` dentro del directorio de la aplicación. Asegúrate de manejar y almacenar estas claves de forma segura.

---

Esta documentación proporciona una descripción general de los métodos de cifrado utilizados en la clase `Encryption`, explicando la funcionalidad de cada método, junto con ejemplos de código y detalles de configuración.





---

# Documentación de la Clase `EventLogger` EventLogger.cs

## Descripción General

La clase `EventLogger` permite guardar eventos y logs, tanto en una base de datos MongoDB como en el visor de eventos de Windows (cuando no se usa MongoDB). Los eventos se guardan con detalles como el tipo de log, el mensaje, el objeto asociado, el método y la ruta del archivo que generó el log. La clase ofrece una funcionalidad flexible para registrar eventos y manejar excepciones.

### Dependencias
- **MongoDB.Driver**: Para interactuar con MongoDB y guardar los logs.
- **Newtonsoft.Json**: Para serializar objetos en JSON.
- **System.Diagnostics**: Para interactuar con el Visor de Eventos de Windows (cuando se usa el preprocesador `#if NO_MONGO`).
- **System.Runtime.CompilerServices**: Para obtener el nombre del método y la ruta del archivo donde se llama al log.

---

## Métodos

### `Init(string connectionString)`
Inicializa la conexión a la base de datos MongoDB utilizando una cadena de conexión proporcionada.

- **Parámetros**:
  - `connectionString` (`string`): La cadena de conexión de MongoDB.

- **Descripción**:
  Este método configura los parámetros de conexión de MongoDB, como los tiempos de espera de la conexión y del socket. Si se define el preprocesador `#if NO_MONGO`, el método también configura la fuente del Visor de Eventos de Windows.

### `Save(ETypeLog logType, string msg , object? obj = null, [CallerMemberName] string method = "", [CallerFilePath] string callerPath = "")`
Guarda un log en la base de datos MongoDB o, si se usa el preprocesador `#if NO_MONGO`, lo guarda en el Visor de Eventos de Windows.

- **Parámetros**:
  - `logType` (`ETypeLog`): El tipo de log (por ejemplo, "Error", "Información", etc.).
  - `msg` (`string`): El mensaje que describe el evento.
  - `obj` (`object?`): Un objeto adicional relacionado con el log, que será serializado a JSON. (Opcional)
  - `method` (`string`): El nombre del método que llama al log (se obtiene automáticamente si no se pasa como argumento).
  - `callerPath` (`string`): La ruta completa del archivo que llama al log (se obtiene automáticamente si no se pasa como argumento).

- **Descripción**:
  Este método guarda el log en MongoDB si no se define el preprocesador `#if NO_MONGO`. Si no se está utilizando MongoDB, el log se guarda en el Visor de Eventos de Windows. En MongoDB, el log se guarda en la colección "Logs" de la base de datos "dashboard", con información detallada como la fecha, el tipo de log, el nombre del método y el objeto relacionado.

---

## Ejemplo de Uso

```csharp
// Inicializar la conexión a MongoDB
EventLogger.Init("mongodb://localhost:27017");

// Guardar un log de tipo "Error"
await EventLogger.Save(ETypeLog.Error, "Hubo un error en la base de datos.", new { id = 123, name = "Juan" });

// Guardar un log de tipo "Información"
await EventLogger.Save(ETypeLog.Information, "El proceso terminó correctamente.");
```

---

## Consideraciones

- **MongoDB**: Para usar MongoDB como sistema de almacenamiento de logs, se debe proporcionar una cadena de conexión válida mediante el método `Init`.
  
- **Visor de Eventos**: Cuando el preprocesador `#if NO_MONGO` está definido, los logs se guardan en el Visor de Eventos de Windows en lugar de MongoDB. Esta funcionalidad está comentada en el código y puede ser activada o desactivada según sea necesario.

- **Manejo de Errores**: El método `Save` maneja excepciones de forma interna. Si ocurre un error al guardar el log en MongoDB, se maneja la excepción, pero no se detiene la ejecución del programa.

---

## Configuración

### Cadena de Conexión de MongoDB

Es necesario pasar una cadena de conexión válida al método `Init` para que los logs se guarden en MongoDB. La cadena de conexión sigue el formato estándar de MongoDB.

Ejemplo de cadena de conexión:
```csharp
"mongodb://username:password@localhost:27017"
```

---

Esta documentación proporciona una descripción de cómo utilizar la clase `EventLogger` para registrar logs de eventos en una base de datos MongoDB o en el Visor de Eventos de Windows.


### Tercera libreria de clases Dashboard.Persistence.cs

La tercera libreria realiza las consultas a la base de datos, las clases son parecidas por la que solo se documentara una de las clases.

La clase `SubscriptionRepository` es un repositorio que implementa la interfaz `IGenericRepository<Subscription, SubscriptionDto>` para interactuar con la base de datos SQL Server usando Dapper. A continuación, te proporciono un desglose y la documentación detallada de cada parte del código:

---

### **Resumen**

La clase `SubscriptionRepository` permite realizar operaciones CRUD (Crear, Leer, Actualizar y Eliminar) sobre las suscripciones almacenadas en una base de datos SQL Server. Utiliza procedimientos almacenados para interactuar con la base de datos y Dapper para la ejecución eficiente de consultas SQL.

### **Constructor**

```csharp
public SubscriptionRepository(IConfiguration configuration)
{
    _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
}
```

- **Descripción**: Este constructor recibe una instancia de `IConfiguration` para obtener la cadena de conexión de la base de datos a través de la clave definida en la variable `AppSettings.DB_CONNECTION`.

- **Parámetros**:
  - `IConfiguration configuration`: Objeto para leer configuraciones, como la cadena de conexión a la base de datos.

- **Propósito**: Establece la conexión a la base de datos usando la cadena de conexión proporcionada en la configuración de la aplicación.

### **Métodos**

#### 1. `GetAllAsync()`

```csharp
public async Task<IEnumerable<Subscription>> GetAllAsync()
{
    using var conn = new SqlConnection(_dataBase);
    IEnumerable<Subscription> subscription = await conn.QueryAsync<Subscription>(SP.ALERTS_SP_SUBSCRIPTIONS_GETALL, null, commandType: CommandType.StoredProcedure);

    await conn.CloseAsync();
    await conn.DisposeAsync();
    return subscription;
}
```

- **Descripción**: Obtiene todas las suscripciones de la base de datos ejecutando el procedimiento almacenado `ALERTS_SP_SUBSCRIPTIONS_GETALL`.
  
- **Retorno**:
  - `IEnumerable<Subscription>`: Devuelve una lista de objetos `Subscription`.

#### 2. `GetByIdAsync(int id)`

```csharp
public async Task<Subscription?> GetByIdAsync(int id)
{
    return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
}
```

- **Descripción**: Recupera una suscripción por su ID. Este método llama a `GetAllAsync()` para obtener todas las suscripciones y luego filtra la lista buscando el `ID` que coincide con el parámetro `id`.
  
- **Parámetros**:
  - `id`: El identificador de la suscripción a buscar.
  
- **Retorno**:
  - `Subscription?`: Devuelve la suscripción que coincide con el ID proporcionado o `null` si no se encuentra ninguna.

#### 3. `CreateAsync(SubscriptionDto newSubscription)`

```csharp
public async Task<Subscription?> CreateAsync(SubscriptionDto newSubscription)
{
    var args = new
    {
        newSubscription.IdPayPad,
        newSubscription.IdAlert,
        newSubscription.Email,
        newSubscription.IdUserCreated
    };
    using var conn = new SqlConnection(_dataBase);
    Subscription? subscriptionCreated = (await conn.QueryAsync<Subscription>(SP.ALERTS_SP_SUBSCRIPTIONS_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

    await conn.CloseAsync();
    await conn.DisposeAsync();
    return subscriptionCreated;
}
```

- **Descripción**: Crea una nueva suscripción en la base de datos ejecutando el procedimiento almacenado `ALERTS_SP_SUBSCRIPTIONS_CREATE`. Los datos para la creación de la suscripción se pasan a través de un objeto anónimo que se mapea desde el DTO `SubscriptionDto`.
  
- **Parámetros**:
  - `newSubscription`: El DTO con los detalles de la nueva suscripción.
  
- **Retorno**:
  - `Subscription?`: Devuelve la suscripción creada, o `null` si no se pudo crear.

#### 4. `UpdateAsync(SubscriptionDto subscription)`

```csharp
public async Task<Subscription?> UpdateAsync(SubscriptionDto subscription)
{
    var args = new
    {
        subscription.Id,
        subscription.IdPayPad,
        subscription.IdAlert,
        subscription.Email,
        subscription.IdUserUpdated
    };
    using var conn = new SqlConnection(_dataBase);
    Subscription? subscriptionUpdated = (await conn.QueryAsync<Subscription>(SP.ALERTS_SP_SUBSCRIPTIONS_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

    await conn.CloseAsync();
    await conn.DisposeAsync();
    return subscriptionUpdated;
}
```

- **Descripción**: Actualiza una suscripción existente en la base de datos ejecutando el procedimiento almacenado `ALERTS_SP_SUBSCRIPTIONS_UPDATE`. Los detalles de la suscripción a actualizar se pasan desde un objeto DTO `SubscriptionDto`.
  
- **Parámetros**:
  - `subscription`: El DTO con los datos de la suscripción a actualizar.
  
- **Retorno**:
  - `Subscription?`: Devuelve la suscripción actualizada, o `null` si no se pudo actualizar.

#### 5. `DeleteByIdAsync(int id)`

```csharp
public async Task<bool> DeleteByIdAsync(int id)
{
    var args = new
    {
        Id = id
    };
    using var conn = new SqlConnection(_dataBase);
    Subscription? subscription = (await conn.QueryAsync<Subscription>(SP.ALERTS_SP_SUBSCRIPTIONS_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

    await conn.CloseAsync();
    await conn.DisposeAsync();

    if (subscription != null)
    {
        return false;
    }
    return true;
}
```

- **Descripción**: Elimina una suscripción de la base de datos utilizando el procedimiento almacenado `ALERTS_SP_SUBSCRIPTIONS_DELETEBYID`. Si la suscripción se encuentra y se elimina correctamente, devuelve `true`; de lo contrario, devuelve `false`.
  
- **Parámetros**:
  - `id`: El identificador de la suscripción a eliminar.
  
- **Retorno**:
  - `bool`: `true` si la suscripción se eliminó correctamente, `false` si no se encontró o no se pudo eliminar.

### **Consideraciones Importantes**

- **Conexión a la base de datos**: La cadena de conexión se obtiene del archivo de configuración a través de `IConfiguration`. Asegúrate de que esté correctamente configurada en el archivo `appsettings.json` o en el entorno.
  
- **Uso de procedimientos almacenados**: La clase utiliza procedimientos almacenados definidos en la variable `SP` de la aplicación. Estos procedimientos deben existir y ser accesibles en la base de datos.
  
- **Manejo de recursos**: La clase cierra y dispone de las conexiones a la base de datos después de cada operación para liberar recursos correctamente. Esto es importante para evitar posibles fugas de memoria o conexiones abiertas innecesarias.

---

### **Ejemplo de Uso**

```csharp
// Suponiendo que tienes una instancia de IConfiguration configurada

// Inicialización del repositorio
var repository = new SubscriptionRepository(configuration);

// Obtener todas las suscripciones
var subscriptions = await repository.GetAllAsync();

// Crear una nueva suscripción
var newSubscription = new SubscriptionDto
{
    IdPayPad = 1,
    IdAlert = 2,
    Email = "test@example.com",
    IdUserCreated = 123
};
var createdSubscription = await repository.CreateAsync(newSubscription);

// Actualizar una suscripción existente
var subscriptionToUpdate = new SubscriptionDto
{
    Id = 1,
    IdPayPad = 1,
    IdAlert = 3,
    Email = "updated@example.com",
    IdUserUpdated = 124
};
var updatedSubscription = await repository.UpdateAsync(subscriptionToUpdate);

// Eliminar una suscripción por ID
bool isDeleted = await repository.DeleteByIdAsync(1);
```

### **Configuración en `appsettings.json`**

```json
{
  "ConnectionStrings": {
    "DB_CONNECTION": "Server=myServerAddress;Database=myDataBase;User Id=myUsername;Password=myPassword;"
  }
}
```

---

Esta clase proporciona una implementación eficiente y sencilla para gestionar suscripciones en una base de datos SQL Server mediante Dapper, utilizando procedimientos almacenados para las operaciones CRUD.
