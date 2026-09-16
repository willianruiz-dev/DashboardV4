using Dashboard.Domain;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Enumerables;
using Dashboard.Domain.Interfaces.Application;
using Newtonsoft.Json;
using System.Net;
using System.Security.Claims;

namespace Api_DashboardV2.Middleware
{
    public class PermissionMiddleware
    {
        const string NOT_ALLOWED_MSG = "No tiene permisos para acceder a este recurso: ";

        #region Properties
        private IUserBL _userBL;
        private IPayPadBL _paypadBL;
        private IRoleBL _roleBL;
        private PermissionData _permissionData;
        private readonly RequestDelegate _next;
        #endregion Properties

        #region Constructor
        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="next"></param>
        public PermissionMiddleware(RequestDelegate next)
        {
            _next = next;
        }
        #endregion Constructor

        #region Public

        /// <summary>
        /// Invoke Async
        /// </summary>
        /// <param name="httpContext"></param>
        /// <returns></returns>
        public async Task InvokeAsync(HttpContext context, IUserBL userBL, IRoleBL roleBL, IPayPadBL paypadBL, PermissionData permissionData)
        {

            if (context.Response.HasStarted) return;


            _userBL = userBL;
            _roleBL = roleBL;
            _paypadBL = paypadBL;
            _permissionData = permissionData;

            var routeData = context.GetRouteData();

            if (routeData == null || !routeData.Values.ContainsKey("controller") || !routeData.Values.ContainsKey("action"))
            {
                await _next(context);
                return;
            }

            try
            {
                var controllerName = routeData.Values["controller"] as string;
                var actionName = routeData.Values["action"] as string;

                switch (controllerName)
                {
                    case "Auth":
                        break;
                    case "User":
                        await ProcessUserControllerPermission(context, actionName);
                        break;
                    case "Role":
                        await ProcessRoleControllerPermission(context, actionName);
                        break;
                    case "Route":
                        await ProcessRouteControllerPermission(context, actionName);
                        break;
                    case "Client":
                        await ProcessClientControllerPermission(context, actionName);
                        break;
                    case "Masters":
                        await ProcessMastersControllerPermission(context, actionName);
                        break;
                    case "PayPad":
                        await ProcessPayPadControllerPermission(context, actionName);
                        break;
                    case "Tonnage":
                        await ProcessTonnageLoadControllerPermission(context, actionName);
                        break;
                    case "Load":
                        await ProcessTonnageLoadControllerPermission(context, actionName);
                        break;
                    case "Office":
                        await ProcessOfficeControllerPermission(context, actionName);
                        break;
                    case "Transaction":
                        await ProcessTransactionControllerPermission(context, actionName);
                        break;
                    case "Alerts":
                        await ProcessAlertsControllerPermission(context, actionName);
                        break;
                    default:
                        break;
                }

                await _next(context);

            }catch (PermitException ex)
            {
                await HandleUnauthorized(context, ex.Message);
                return;
            }
        }
        #endregion Public

        private async Task ProcessUserControllerPermission(HttpContext context, string actionName)
        {
            var userLogged = await GetUserLogged(context);
            var role = await GetRoleLogged(userLogged.IdRole);
            if (userLogged.UserName == "root") return ;
            
            var permissions = role.Permissions.Where(p => p.Name.Contains("Users")).Select(p => p.Name).ToList();

            var hasReadPermit = permissions.Contains("ReadUsers");
            var hasWritePermit = permissions.Contains("WriteUsers");
            var hasDelPermit = permissions.Contains("DelUsers");

            switch (actionName)
            {
                case "Get":
                case "GetByStatus":
                case "GetByRole":
                    {
                        if (!hasReadPermit) throw new PermitException(NOT_ALLOWED_MSG+"Lectura de usuarios.");
                        break;
                    }
                case "GetById":
                    {
                        var requestPathSplited = context.Request.Path.Value?.Split("/");
                        var idRequested = Convert.ToInt32(requestPathSplited?.AsQueryable().Last());
                        if (!hasReadPermit && userLogged.Id != idRequested) throw new PermitException(NOT_ALLOWED_MSG+"Lectura de usuarios.");
                        break;
                    }
                case "GetByDocument":
                    {
                        var requestPathSplited = context.Request.Path.Value?.Split("/");
                        var documentRequested = requestPathSplited?.AsQueryable().Last();
                        if (!hasReadPermit && !userLogged.Document.Equals(documentRequested)) throw new PermitException(NOT_ALLOWED_MSG + "Lectura de usuarios.");
                        break;
                    }
                case "GetByUserName":
                    {
                        var requestPathSplited = context.Request.Path.Value?.Split("/");
                        var nameRequested = requestPathSplited?.AsQueryable().Last();
                        if (!hasReadPermit && !userLogged.UserName.Equals(nameRequested)) throw new PermitException(NOT_ALLOWED_MSG+"Lectura de usuarios.");
                        break;
                    }
                case "Post":
                    {
                        if (!hasWritePermit) throw new PermitException(NOT_ALLOWED_MSG);
                        break;
                    }
                case "Put":
                    {
                        var userToUpdate = await GetRequestBody<UserDto>(context);
                        if (!hasWritePermit && userLogged.Id != userToUpdate.Id) throw new PermitException(NOT_ALLOWED_MSG+"Escritura de usuarios");
                        break;
                    }
                case "ChangePassword":
                    {
                        var documentRequested = (await GetRequestBody<ChangePwdDto>(context)).Document;
                        if (!hasWritePermit && !userLogged.Document.Equals(documentRequested)) throw new PermitException(NOT_ALLOWED_MSG+"Escritura de usuarios");
                        break;
                    }
                case "Delete":
                    {
                        if (!hasDelPermit) throw new PermitException(NOT_ALLOWED_MSG+"Eliminar usuarios");
                        break;
                    }
                case "GetUserLogged":
                    {
                        break;
                    }
                default:
                    {
                        throw new PermitException($"No existe la acción {actionName} en el controlador");
                    }
            }

        }

        private async Task ProcessRoleControllerPermission(HttpContext context, string actionName)
        {
            var userLogged = await GetUserLogged(context);
            var role = await GetRoleLogged(userLogged.IdRole);
            if (userLogged.UserName == "root") return;
            

            var permissions = role.Permissions.Where(p => p.Name.Contains("Roles")).Select(p => p.Name).ToList();

            var hasReadPermit = permissions.Contains("ReadRoles");
            var hasWritePermit = permissions.Contains("WriteRoles");
            var hasDelPermit = permissions.Contains("DelRoles");

            switch (actionName)
            {
                case "Get":
                    {
                        if(!hasReadPermit) throw new PermitException(NOT_ALLOWED_MSG + "Lectura de roles.");
                        break;
                    }
                case "GetById":
                    {
                        var requestPathSplited = context.Request.Path.Value?.Split("/");
                        var idRequested = Convert.ToInt32(requestPathSplited?.AsQueryable().Last());
                        if (!hasReadPermit && userLogged.IdRole != idRequested) throw new PermitException(NOT_ALLOWED_MSG + "Lectura de roles.");
                        break;
                    }
                case "Post":
                case "Put":
                    {
                        if (!hasWritePermit) throw new PermitException(NOT_ALLOWED_MSG+"Escritura de roles.");
                        break;
                    }
                case "Delete":
                    {
                        if (!hasDelPermit) throw new PermitException(NOT_ALLOWED_MSG+"Eliminar roles.");
                        break;
                    }
                default:
                    {
                        throw new PermitException($"No existe la acción {actionName} en el controlador");
                    }
            }

        }

        private async Task ProcessRouteControllerPermission(HttpContext context, string actionName)
        {
            var userLogged = await GetUserLogged(context);
            var role = await GetRoleLogged(userLogged.IdRole);
            if (userLogged.UserName == "root") return;
            

            var permissions = role.Permissions.Where(p => p.Name.Contains("Routes")).Select(p => p.Name).ToList();

            var hasReadPermit = permissions.Contains("ReadRoutes");
            var hasWritePermit = permissions.Contains("WriteRoutes");

            switch (actionName)
            {
                case "Get":
                case "GetById":
                    {
                        if (!hasReadPermit) throw new PermitException(NOT_ALLOWED_MSG+"Lectura de rutas.");
                        break;
                    }
                case "GetLoggedRoutes":
                    {
                        break;
                    }
                case "Post":
                case "Put":
                    {
                        if (!hasWritePermit) throw new PermitException(NOT_ALLOWED_MSG+"Escritura de rutas");
                        break;
                    }
                default:
                    {
                        throw new PermitException($"No existe la acción {actionName} en el controlador");
                    }
            }

        }

        private async Task ProcessClientControllerPermission(HttpContext context, string actionName)
        {
            var userLogged = await GetUserLogged(context);
            var role = await GetRoleLogged(userLogged.IdRole);
            if (userLogged.UserName == "root") return;

            var permissions = role.Permissions.Where(p => p.Name.Contains("Clients")).Select(p => p.Name).ToList();

            var hasReadPermit = permissions.Contains("ReadClients");
            var hasWritePermit = permissions.Contains("WriteClients");
            var hasDelPermit = permissions.Contains("DelClients");

            switch (actionName)
            {
                case "Get":
                case "GetById":
                    {
                        if (!hasReadPermit) throw new PermitException(NOT_ALLOWED_MSG + "Lectura de clientes.");
                        break;
                    }
                case "Post":
                case "Put":
                    {
                        if (!hasWritePermit) throw new PermitException(NOT_ALLOWED_MSG+"Escritura de clientes.");
                        break;
                    }
                case "Delete":
                    {
                        if (!hasDelPermit) throw new PermitException(NOT_ALLOWED_MSG+"Eliminar clientes");
                        break;
                    }
                default:
                    {
                        throw new PermitException($"No existe la acción {actionName} en el controlador");
                    }
            }

        }

        private async Task ProcessMastersControllerPermission(HttpContext context, string actionName)
        {
            var userLogged = await GetUserLogged(context);
            var role = await GetRoleLogged(userLogged.IdRole);
            if (userLogged.UserName == "root") return;


            var permissions = role.Permissions.Where(p => p.Name.Contains("Masters")).Select(p => p.Name).ToList();

            var hasReadPermit = permissions.Contains("ReadMasters");
            var hasWritePermit = permissions.Contains("WriteMasters");
            var hasDelPermit = permissions.Contains("DelMasters");

            switch (actionName)
            {
                case string s when s.StartsWith("Get"):
                    {
                        if (!hasReadPermit) throw new PermitException(NOT_ALLOWED_MSG+"Lectura de maestros.");
                        break;
                    }
                case string s when (s.StartsWith("Post") || s.StartsWith("Put")):
                    {
                        if (!hasWritePermit) throw new PermitException(NOT_ALLOWED_MSG+"Escritura de maestros");
                        break;
                    }
                case string s when s.StartsWith("Delete"):
                    {
                        if (!hasDelPermit) throw new PermitException(NOT_ALLOWED_MSG+"Eliminar maestros");
                        break;
                    }
                default:
                    {
                        throw new PermitException($"No existe la acción {actionName} en el controlador");
                    }
            }

        }

        private async Task ProcessPayPadControllerPermission(HttpContext context, string actionName)
        {
            //Metodos de paypads
            switch (actionName)
            {
                case "ValidatePayPad":
                    {
                        var paypadLogged = await GetPayPadLogged(context);
                        return;
                    }
                default:
                    break;
            }

            // Metodos de usuarios
            var userLogged = await GetUserLogged(context);
            var role = await GetRoleLogged(userLogged.IdRole);

            var permissions = role.Permissions.Where(p => p.Name.Contains("PayPads") || p.Name.Contains("TonnagesAndLoads") ).Select(p => p.Name).ToList();

            var hasReadPermit = permissions.Contains("ReadPayPads");
            var hasWritePermit = permissions.Contains("WritePayPads");
            var hasDelPermit = permissions.Contains("DelPayPads");

            var hasReadTonAndLoadPermit = permissions.Contains("ReadTonnagesAndLoads");
            var hasWriteTonAndLoadPermit = permissions.Contains("WriteTonnagesAndLoads");

            switch (actionName)
            {
                case "Get":
                    {
                        if (!hasReadPermit) throw new PermitException(NOT_ALLOWED_MSG+"Lectura de Pay+");
                        break;
                    }
                case "GetById":
                case "GetConfiguration":
                case "GetByStatus":
                    {
                        if (!hasReadPermit) throw new PermitException(NOT_ALLOWED_MSG+"Lectura de Pay+");
                        break;
                    }
                case "GetPaypadStorage":
                    {
                        if (!hasReadTonAndLoadPermit) throw new PermitException(NOT_ALLOWED_MSG+"Lectura de arqueos y cargues");
                        break;
                    }
                case "PostStorage":
                    {
                        if (!hasWriteTonAndLoadPermit) throw new PermitException(NOT_ALLOWED_MSG+"Escritura de arqueos y cargues");
                        break;
                    }
                case "Post":
                case "Put":
                case "CreateConfiguration":
                case "UpdateConfiguration":
                case "ChangePassword":
                    {
                        if (!hasWritePermit) throw new PermitException(NOT_ALLOWED_MSG+"Escritura de Pay+");
                        break;
                    }
                case "Delete":
                    {
                        if (!hasDelPermit) throw new PermitException(NOT_ALLOWED_MSG+"Eliminar Pay+");
                        break;
                    } 
                default:
                    {
                        throw new PermitException($"No existe la acción {actionName} en el controlador");
                    }
            }

        }

        private async Task ProcessTonnageLoadControllerPermission(HttpContext context, string actionName)
        {
            // Metodos de usuarios
            var userLogged = await GetUserLogged(context);
            var role = await GetRoleLogged(userLogged.IdRole);

            var permissions = role.Permissions.Where(p => p.Name.Contains("TonnagesAndLoads")).Select(p => p.Name).ToList();

            var hasReadTonAndLoadPermit = permissions.Contains("ReadTonnagesAndLoads");
            var hasWriteTonAndLoadPermit = permissions.Contains("WriteTonnagesAndLoads");

            switch (actionName)
            {

                case string s when s.StartsWith("GetBy"):
                    {
                        if (!hasReadTonAndLoadPermit) throw new PermitException(NOT_ALLOWED_MSG + "Lectura de arqueos y cargues");
                        break;
                    }
                case "Post":
                    {
                        if (!hasWriteTonAndLoadPermit) throw new PermitException(NOT_ALLOWED_MSG + "Escritura de arqueos y cargues");
                        break;
                    }
                default:
                    {
                        throw new PermitException($"No existe la acción {actionName} en el controlador");
                    }
            }

        }

        private async Task ProcessOfficeControllerPermission(HttpContext context, string actionName)
        {
            // Metodos de usuarios
            var userLogged = await GetUserLogged(context);
            var role = await GetRoleLogged(userLogged.IdRole);

            var permissions = role.Permissions.Where(p => p.Name.Contains("Offices")).Select(p => p.Name).ToList();

            var hasReadOfficesPermit = permissions.Contains("ReadOffices");
            var hasWriteOfficesPermit = permissions.Contains("WriteOffices");
            var hasDelOfficesPermit = permissions.Contains("DelOffices");

            switch (actionName)
            {

                case string s when s.StartsWith("Get"):
                    {
                        if (!hasReadOfficesPermit) throw new PermitException(NOT_ALLOWED_MSG+"Lectura de sucursales");
                        break;
                    }
                case "Post":
                case "Put":
                    {
                        if (!hasWriteOfficesPermit) throw new PermitException(NOT_ALLOWED_MSG+"Escritura de sucursales");
                        break;
                    }
                case "Delete":
                    {
                        if (!hasDelOfficesPermit) throw new PermitException(NOT_ALLOWED_MSG+"Eliminar sucursales");
                        break;
                    }
                default:
                    {
                        throw new PermitException($"No existe la acción {actionName} en el controlador");
                    }
            }

        }

        private async Task ProcessTransactionControllerPermission(HttpContext context, string actionName)
        {
            //Metodos de paypads
            switch (actionName)
            {
                case "GetById":
                case "GetDetailById":
                case "Post":
                case "Put":
                case "PostDetail":
                case "PutDetail":
                case "PostRating":
                case "UploadVideo":
                    {
                        var paypadLogged = await GetPayPadLogged(context);
                        return;
                    }
                default:
                    break;
            }

            // Metodos de usuarios
            var userLogged = await GetUserLogged(context);
            var role = await GetRoleLogged(userLogged.IdRole);

            var permissions = role.Permissions.Where(p => p.Name.Contains("Transactions")).Select(p => p.Name).ToList();

            var hasReadPermit = permissions.Contains("ReadTransactions");

            switch (actionName)
            {
                case "Get":
                case "GetByPaypad":
                case "GetByDate":
                case "GetDetailsByIdTransaction":
                case "PostExcelDoc":
                case "GetRatingByIdTransaction":
                case "VideoDownloadFtp":
                case "VideoDownload":
                    {
                        if (!hasReadPermit) throw new PermitException(NOT_ALLOWED_MSG+"Lectura de transacciones");
                        break;
                    }
                default:
                    {
                        throw new PermitException($"No existe la acción {actionName} en el controlador");
                    }
            }

        }

        private async Task ProcessAlertsControllerPermission(HttpContext context, string actionName)
        {
            // Metodos de usuarios
            var userLogged = await GetUserLogged(context);
            var role = await GetRoleLogged(userLogged.IdRole);

            var permissions = role.Permissions.Where(p => p.Name.Contains("Subs")).Select(p => p.Name).ToList();

            var hasReadPermit = permissions.Contains("ReadSubs");
            var hasWritePermit = permissions.Contains("WriteSubs");
            var hasDelPermit = permissions.Contains("DelSubs");

            switch (actionName)
            {
                case "GetSubs":
                case "GetByIdSubscription":
                case "GetByIdPayPad":
                    {
                        if (!hasReadPermit) throw new PermitException(NOT_ALLOWED_MSG+"Lectura de subscripciones");
                        break;
                    }
                case "Post":
                case "Put":
                    {
                        if (!hasWritePermit) throw new PermitException(NOT_ALLOWED_MSG+"Escritura de subscripciones");
                        break;
                    }
                case "DeleteSubscription":
                    {
                        if (!hasDelPermit) throw new PermitException(NOT_ALLOWED_MSG+"Eliminar subscripciones");
                        break;
                    }
                default:
                    {
                        throw new PermitException($"No existe la acción {actionName} en el controlador");
                    }
            }

        }


        private async Task HandleUnauthorized(HttpContext context, string msg)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
            await context.Response.WriteAsync(new HttpResponse<object?>
            (
                statusCode: context.Response.StatusCode,
                message: $"{(int)ErrorCodes.NotAllowed}:{msg}",
                response: null
            ).ToString()); ;
            await EventLogger.Save(ETypeLog.Warning, $"PermissionMiddleware: {msg}");
        }

        private async Task<UserDto> GetUserLogged(HttpContext context)
        {
            string documentLoged = context.User.FindFirstValue("Document");
            var userLogged = await _userBL.GetByDocumentAsync(documentLoged);
            if (userLogged == null) throw new PermitException("Este recurso solo está permitido para usuarios existentes");
            _permissionData.UserLogged = userLogged;
            _permissionData.UserIsAdmin = (userLogged.IdRole == 1);
            return userLogged;
        }

        private async Task<RoleDto> GetRoleLogged(int idRole)
        {
            var role = await _roleBL.GetByIdAsync(idRole);
            if (role == null) throw new PermitException("No se encuentra rol de usuario, no existe");
            _permissionData.RoleLogged = role;
            return role;
        }

        private async Task<T> GetRequestBody<T>(HttpContext context)
        {
            context.Request.EnableBuffering();
            using (var reader = new StreamReader(context.Request.Body, leaveOpen: true))
            {
                var body = await reader.ReadToEndAsync();

                T? bodyDeserialized = JsonConvert.DeserializeObject<T>(body);

                if (bodyDeserialized == null) throw new PermitException("No se obtuvo cuerpo de la petición");

                context.Request.Body.Position = 0;
                return bodyDeserialized;
            }

        }

        private async Task<PayPadDto?> GetPayPadLogged(HttpContext context)
        {
            int idLogged = Convert.ToInt32(context.User.FindFirstValue("Id"));
            var paypadLogged = await _paypadBL.GetByIdAsync(idLogged);
            if (paypadLogged == null) throw new PermitException("Este recurso solo está permitido para paypad existentes");
            _permissionData.PayPadLogged = paypadLogged;
            return paypadLogged;
        }

    }

    public class PermitException: Exception
    {

        public PermitException()
        {

        }

        public PermitException(string message) : base(message)
        {

        }

        public PermitException(string message, Exception innerException) : base(message, innerException)
        {

        }


    }

    public class PermissionData
    {
        public UserDto UserLogged { get; set; }
        public RoleDto RoleLogged { get; set; }
        public PayPadDto PayPadLogged { get; set; }
        public bool UserIsAdmin { get; set; } = false;
    }
}
