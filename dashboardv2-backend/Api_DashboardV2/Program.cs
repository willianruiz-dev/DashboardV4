using Api_DashboardV2.Middleware;
using Dashboard.Application;
using Dashboard.Domain;
using Dashboard.Domain.Variables;
using DashboardV2.App_Start;
using Microsoft.Extensions.Configuration;
using Microsoft.OpenApi.Models;

namespace DashboardV2
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            
            IConfiguration Configuration = builder.Configuration.AddJsonFile("appsettings.json").Build();

            // Add services to the container.
            builder.Services.AddCorsDocumentation();
            builder.Services.AddControllers();
            builder.Services.AddDependenciesInjectionConfig();
            builder.Services.AddJwtConfig(Configuration);
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(opt =>
            {
                opt.SwaggerDoc("v1", new OpenApiInfo { Title = "MyAPI", Version = "v1" });
                opt.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                        In = ParameterLocation.Header,
                        Description = "Please enter token",
                        Name = "Authorization",
                        Type = SecuritySchemeType.Http,
                        BearerFormat = "JWT",
                        Scheme = "bearer",
                        
                });

                opt.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
                {
                    Description = "ApiKey must appear in header",
                    Type = SecuritySchemeType.ApiKey,
                    Name = "DashboardKeyId",
                    In = ParameterLocation.Header,
                    Scheme = "ApiKeyScheme"
                });


                opt.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type=ReferenceType.SecurityScheme,
                                Id="Bearer"
                            },
                        },
                        new string[]{}
                    }
                });
                
                opt.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "ApiKey"
                            },
                            In = ParameterLocation.Header
                        },
                        new string[]{}
                    }
                });
                }
            );
            builder.Services.AddAutoMapperConfig();
            builder.Services.AddMemoryCache();

            var app = builder.Build();
            AppSettings.IsProduction = false;
            //AppSettings.IsProduction = !app.Environment.IsDevelopment();
            EventLogger.Init(Configuration.GetConnectionString(AppSettings.MONGO_DB_CONNECTION));
            ImageAdmin.Init(AppSettings.IsProduction, Configuration[AppSettings.STATIC_RES]);

            app.UseCorsDocumentation();

            app.UseSwagger();
            app.UseSwaggerUI();


            // El orden es importante. entender los middlewares antes de hacer cualquier cambio
            app.UseHttpsRedirection();
            app.UseDefaultFiles();
            app.UseStaticFiles();
            app.UseExceptionMiddleware();
            app.UseJWTConfig();
            app.UseIgnoreAuthMiddleware();
            app.UseAuthorization();
            app.UseMiddleware<PermissionMiddleware>();

            

            app.MapControllers();

            app.Run();
        }
    }
}