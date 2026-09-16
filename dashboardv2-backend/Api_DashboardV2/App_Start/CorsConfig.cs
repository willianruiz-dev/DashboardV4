using Dashboard.Domain.Variables;

namespace DashboardV2.App_Start
{
    internal static class CorsConfig
    {
        internal static IServiceCollection AddCorsDocumentation(this IServiceCollection services)
        {
            services.AddCors(options =>
            {
                options.AddPolicy(AppSettings.CORS_NAME, builder => {
                    builder.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
                    
                });
            });
            return services;
        }

        internal static IApplicationBuilder UseCorsDocumentation(this IApplicationBuilder app)
        {
            app.UseCors(AppSettings.CORS_NAME);
            return app;
        }
    }
}
