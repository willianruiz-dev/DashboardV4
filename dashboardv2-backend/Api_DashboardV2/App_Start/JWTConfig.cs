using Dashboard.Domain;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Enumerables;
using Dashboard.Domain.Variables;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Cryptography.X509Certificates;
using System.Text;

namespace DashboardV2.App_Start
{
    internal static class JWTConfig
    {
        /// <summary>
        /// Add JWT documentation
        /// </summary>
        /// <param name="services">IServiceCollection</param>
        /// <returns></returns>
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

        /// <summary>
        /// Get token validation parameters
        /// </summary>
        /// <param name="secretkey">string</param>
        /// <returns></returns>
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

        internal static JwtBearerEvents GetJWTBearerEvents()
        {
            return new JwtBearerEvents
            {
                OnAuthenticationFailed = context =>
                {
                    var endpoint = context.HttpContext.GetEndpoint();
                    if (endpoint?.Metadata?.GetMetadata<IAllowAnonymous>() != null)
                    {
                        // if endpoint has AllowAnonymous doesn't validate the token expiration
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


        /// <summary>
        /// Use JWT documentation
        /// </summary>
        /// <param name="app">IApplicationBuilder</param>
        /// <returns></returns>
        internal static IApplicationBuilder UseJWTConfig(this IApplicationBuilder app)
        {
            return app.UseAuthentication();
        }
    }
}
