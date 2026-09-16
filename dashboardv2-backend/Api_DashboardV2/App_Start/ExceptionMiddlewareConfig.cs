using DashboardV2.Middleware;

namespace DashboardV2.App_Start
{
    internal static class ExceptionMiddlewareConfig
    {
        /// <summary>
        /// Use Exception Middleware
        /// </summary>
        /// <param name="app"></param>
        /// <returns></returns>
        internal static IApplicationBuilder UseExceptionMiddleware(this IApplicationBuilder app)
        {
            if (app == null)
                throw new ArgumentNullException(nameof(app));

            return app.UseMiddleware<ExceptionMiddleware>();

        }
    }
}
