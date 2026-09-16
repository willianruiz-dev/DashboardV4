
using Api_DashboardV2.Middleware;
using Dashboard.Application;
using Dashboard.Application.BL;
using Dashboard.Application.Validation;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Alerts;
using Dashboard.Domain.Entities.Masters;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Interfaces.Persistence;
using Dashboard.Persistence.SQLServer;
using Dashboard.Persistence.SQLServer.Security;
using Microsoft.Extensions.DependencyInjection;

namespace DashboardV2.App_Start
{
    internal static class DependencyInjectionConfig
    {
        /// <summary>
        /// Add dependencies injection configuration
        /// </summary>
        /// <param name="services"></param>
        internal static void AddDependenciesInjectionConfig(this IServiceCollection services)
        {
            services.AddScoped(typeof(PermissionData));

            #region Application BL
            services.AddScoped(typeof(IAuthBL), typeof(AuthBL)); 
            services.AddScoped(typeof(ISessionBL), typeof(SessionBL));
            services.AddScoped(typeof(IUserBL), typeof(UserBL));
            services.AddScoped(typeof(ITokenBL), typeof(TokenBL));
            services.AddScoped(typeof(IRoleBL), typeof(RoleBL));
            services.AddScoped(typeof(IRouteBL), typeof(RouteBL));
            services.AddScoped(typeof(IMastersBL<CurrencyDto>), typeof(MastersBL<Currency, CurrencyDto>));
            services.AddScoped(typeof(IMastersBL<TypeDocumentDto>), typeof(MastersBL<TypeDocument, TypeDocumentDto>));
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

            #region Validations
            services.AddScoped(typeof(IUserValidation), typeof(UserValidation));
            services.AddScoped(typeof(IPayPadValidation), typeof(PayPadValidation));
            services.AddScoped(typeof(IClientValidation), typeof(ClientValidation));
            #endregion


            #region Repository
            services.AddScoped(typeof(IUserRepository), typeof(UserRepository));
            services.AddScoped(typeof(IRoleRepository), typeof(RoleRepository));
            services.AddScoped(typeof(IRouteRepository), typeof(RouteRepository));
            services.AddScoped(typeof(ISessionRepository), typeof(SessionRepository));
            services.AddScoped(typeof(IGenericRepository<Currency, CurrencyDto>), typeof(CurrencyRepository));
            services.AddScoped(typeof(IGenericRepository<TypeDocument, TypeDocumentDto>), typeof(TypeDocumentRepository));
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

            #region Services
            services.AddScoped(typeof(EmailService));
            #endregion
        }
    }
}
