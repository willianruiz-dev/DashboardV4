using DashboardV2.Middleware;

namespace DashboardV2.App_Start
{
    internal static class IgnoreAuthMiddlewareConfig
    {
        
        internal static IApplicationBuilder UseIgnoreAuthMiddleware(this IApplicationBuilder app)
        {
            if (app == null)
                throw new ArgumentNullException(nameof(app));

            return app.UseMiddleware<IgnoreAuthorizationMiddleware>();

        }
    }
}
