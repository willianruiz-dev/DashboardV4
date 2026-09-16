using Dashboard.Domain;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Enumerables;
using Dashboard.Domain.Variables;
using System.Net;

namespace DashboardV2.Middleware
{
    public class ExceptionMiddleware
    {
        #region Properties

        private readonly RequestDelegate _next;
        private readonly ILogger _logger;
        private readonly IConfiguration _configuration;

        #endregion Properties

        #region Constructor
        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="next"></param>
        /// <param name="logger"></param>
        public ExceptionMiddleware(RequestDelegate next, IConfiguration configuration)
        {
            _next = next;
            _configuration = configuration;
            _logger = LoggerFactory.Create(builder => builder.AddEventLog()).CreateLogger("API Dashboard Service");
        }
        #endregion Constructor

        #region Public

        /// <summary>
        /// Invoke Async
        /// </summary>
        /// <param name="httpContext"></param>
        /// <returns></returns>
        public async Task InvokeAsync(HttpContext httpContext)
        {
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
        }
        #endregion Public

        #region Private

        private async Task<bool> ValidateHandleSecretKeyAsync(HttpContext context)
        {
            bool result = true;
            if (context.Request.Path.Value == "/")
            {
                return result;
            }

            string secretKeyAPI = _configuration[AppSettings.SALT_EXTERNAL];

            if (!context.Request.Headers.ContainsKey(AppSettings.DASHBOARD_KEY_ID))
            {
                await EventLogger.Save(ETypeLog.Warning, $"Headers no contienen la KeyId");
                result = false;
            }
            else if (string.IsNullOrEmpty(secretKeyAPI) || string.IsNullOrEmpty(context.Request.Headers[AppSettings.DASHBOARD_KEY_ID].ToString()))
            {
                await EventLogger.Save(ETypeLog.Error, $"KeyId Vacia");
                result = false;

            }
            else if (!secretKeyAPI.Trim().ToUpper().Equals(context.Request.Headers[AppSettings.DASHBOARD_KEY_ID].ToString().Trim().ToUpper()))
            {
                await EventLogger.Save(ETypeLog.Warning, $"KeyId no es valida");
                result = false;
            }

            

            if (!result)
            {
                context.Response.ContentType = "application/json";
                context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
                await context.Response.WriteAsync(new HttpErrorResponse()
                {
                    statusCode = context.Response.StatusCode,
                    description = ServiceMessages.FORBIDDEN,
                    message = ServiceMessages.FORBIDDEN_MESSAGE
                }.ToString());
            }

            return result;

        }

        /// <summary>
        /// Handle Exception Async
        /// </summary>
        /// <param name="context"></param>
        /// <param name="ex"></param>
        /// <returns></returns>
        private async Task HandleGlobalExceptionAsync(HttpContext context, Exception ex)
        {
            
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
        }
        #endregion Private
    }
}
