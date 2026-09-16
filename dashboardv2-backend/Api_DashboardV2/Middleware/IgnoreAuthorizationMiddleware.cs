using Dashboard.Domain.DTOs;
using Dashboard.Domain.Variables;
using System.Net;

namespace DashboardV2.Middleware
{
    public class IgnoreAuthorizationMiddleware
    {
        
        #region Properties

        private readonly RequestDelegate _next;

        #endregion Properties

        #region Constructor
        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="next"></param>
        public IgnoreAuthorizationMiddleware(RequestDelegate next)
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
        public async Task InvokeAsync(HttpContext httpContext)
        {
            
            if (httpContext.Response.HasStarted) return;
            await _next(httpContext);
        }
        #endregion Public
    }
}
