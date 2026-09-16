using AutoMapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Alerts;
using Dashboard.Domain.Entities.Business;
using Dashboard.Domain.Entities.Masters;
using Dashboard.Domain.Entities.Security;
using Newtonsoft.Json;

namespace DashboardV2.App_Start
{
    internal static class AutoMapperConfig
    {
        /// <summary>
        /// Add Auto Mapper Configuration
        /// </summary>
        /// <param name="services"></param>
        /// <returns></returns>
        internal static IServiceCollection AddAutoMapperConfig(this IServiceCollection services)
        {
            var mapperConfig = new MapperConfiguration(mc => mc.AddProfile(new MappingProfile()));
            IMapper mapper = mapperConfig.CreateMapper();
            return services.AddSingleton(mapper);
        }
    }
    /// <summary>
    /// Mapping Profile configuration
    /// </summary>
    internal class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // Es necesario crear mapas de los atributos de clases que su nombre sea de más de una palabra
            #region Security
            CreateMap<User, UserDto>()
                .ForMember(dest => dest.Pwd, opt => opt.MapFrom(src => (string)null))
                .ForMember(dest => dest.IdTypeDocument, opt => opt.MapFrom(src => src.ID_TYPE_DOCUMENT))
                .ForMember(dest => dest.IdRole, opt => opt.MapFrom(src => src.ID_ROLE))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.Img, opt => opt.MapFrom(src => src.IMG))
                .ForMember(dest => dest.IdClient, opt => opt.MapFrom(src => src.ID_CLIENT))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.TypeDocument, opt => opt.MapFrom(src => src.TYPE_DOCUMENT))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<Role, RoleDto>()
                .ForMember(dest => dest.Role, opt => opt.MapFrom(src => src.ROLE))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<Dashboard.Domain.Entities.Security.Route, RouteDto>()
                .ForMember(dest => dest.IdFather, opt => opt.MapFrom(src => src.ID_FATHER))
                .ForMember(dest => dest.Title, opt => opt.MapFrom(src => src.TITLE))
                .ForMember(dest => dest.Route, opt => opt.MapFrom(src => src.ROUTE))
                .ForMember(dest => dest.Icon, opt => opt.MapFrom(src => src.ICON))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<Session, SessionDto>()
                .ForMember(dest => dest.IdUser, opt => opt.MapFrom(src => src.ID_USER))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<Permission, PermissionDto>()
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            #endregion
            #region Business
            CreateMap<PayPad, PayPadDto>()
                .ForMember(dest => dest.IdCurrency, opt => opt.MapFrom(src => src.ID_CURRENCY))
                .ForMember(dest => dest.IdOffice, opt => opt.MapFrom(src => src.ID_OFFICE))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<PayPadConfiguration, PayPadConfigurationDto>()
                .ForMember(dest => dest.Paypad, opt => opt.MapFrom(src => src.PAYPAD))
                .ForMember(dest => dest.IdPaypad, opt => opt.MapFrom(src => src.ID_PAYPAD))
                .ForMember(dest => dest.Debug, opt => opt.MapFrom(src => src.DEBUG))
                .ForMember(dest => dest.ValidatePeripherals, opt => opt.MapFrom(src => src.VALIDATE_PERIPHERALS))
                .ForMember(dest => dest.ScannerPort, opt => opt.MapFrom(src => src.SCANNER_PORT))
                .ForMember(dest => dest.ArduinoPort, opt => opt.MapFrom(src => src.ARDUINO_PORT))
                .ForMember(dest => dest.MeiPort, opt => opt.MapFrom(src => src.MEI_PORT))
                .ForMember(dest => dest.PrinterPort, opt => opt.MapFrom(src => src.PRINTER_PORT))
                .ForMember(dest => dest.DispenserDenominations, opt => opt.MapFrom(src => src.DISPENSER_DENOMINATIONS))
                .ForMember(dest => dest.ExtraDataJson, opt => opt.MapFrom(src => JsonConvert.DeserializeObject<List<ExtraData>>(src.EXTRA_DATA_JSON)))
                .ForMember(dest => dest.DispenserPort, opt => opt.MapFrom(src => src.DISPENSER_PORT))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<PayPadStorage, PayPadStorageDto>()
                .ForMember(dest => dest.IdPayPad, opt => opt.MapFrom(src => src.ID_PAYPAD))
                .ForMember(dest => dest.IdCurrencyDenomination, opt => opt.MapFrom(src => src.ID_CURRENCY_DENOMINATION))
                .ForMember(dest => dest.DenominationValue, opt => opt.MapFrom(src => src.DENOMINATION_VALUE))
                .ForMember(dest => dest.ImgDenom, opt => opt.MapFrom(src => src.IMG_DENOM))
                .ForMember(dest => dest.ApStored, opt => opt.MapFrom(src => src.AP_STORED))
                .ForMember(dest => dest.ApTotal, opt => opt.MapFrom(src => src.AP_TOTAL))
                .ForMember(dest => dest.DpStored, opt => opt.MapFrom(src => src.DP_STORED))
                .ForMember(dest => dest.DpTotal, opt => opt.MapFrom(src => src.DP_TOTAL))
                .ForMember(dest => dest.RjStored, opt => opt.MapFrom(src => src.RJ_STORED))
                .ForMember(dest => dest.RjTotal, opt => opt.MapFrom(src => src.RJ_TOTAL))
                .ForMember(dest => dest.QuantityStored, opt => opt.MapFrom(src => src.QUANTITY_STORED))
                .ForMember(dest => dest.IsDispensing, opt => opt.MapFrom(src => src.IS_DISPENSING))
                .ForMember(dest => dest.MinDpQuantity, opt => opt.MapFrom(src => src.MIN_DP_QUANTITY))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<Client, ClientDto>()
                .ForMember(dest => dest.IdRegion, opt => opt.MapFrom(src => src.ID_REGION))
                .ForMember(dest => dest.ImgExt, opt => opt.MapFrom(src => src.IMGEXT))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<Office, OfficeDto>()
                .ForMember(dest => dest.IdClient, opt => opt.MapFrom(src => src.ID_CLIENT))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<Transaction, TransactionDto>()
                .ForMember(dest => dest.IdPayPad, opt => opt.MapFrom(src => src.ID_PAYPAD))
                .ForMember(dest => dest.IdStateTransaction, opt => opt.MapFrom(src => src.ID_STATE_TRANSACTION))
                .ForMember(dest => dest.StateTransaction, opt => opt.MapFrom(src => src.STATE_TRANSACTION))
                .ForMember(dest => dest.IdTypePayment, opt => opt.MapFrom(src => src.ID_TYPE_PAYMENT))
                .ForMember(dest => dest.TypePayment, opt => opt.MapFrom(src => src.TYPE_PAYMENT))
                .ForMember(dest => dest.IdTypeTransaction, opt => opt.MapFrom(src => src.ID_TYPE_TRANSACTION))
                .ForMember(dest => dest.TypeTransaction, opt => opt.MapFrom(src => src.TYPE_TRANSACTION))
                .ForMember(dest => dest.IncomeAmount, opt => opt.MapFrom(src => src.INCOME_AMOUNT))
                .ForMember(dest => dest.ReturnAmount, opt => opt.MapFrom(src => src.RETURN_AMOUNT))
                .ForMember(dest => dest.TotalAmount, opt => opt.MapFrom(src => src.TOTAL_AMOUNT))
                .ForMember(dest => dest.RealAmount, opt => opt.MapFrom(src => src.REAL_AMOUNT))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));
            CreateMap<TransactionRating, TransactionRatingDto>()
                .ForMember(dest => dest.IdTransaction, opt => opt.MapFrom(src => src.ID_TRANSACTION))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED));
            CreateMap<TransactionDetail, TransactionDetailDto>()
                .ForMember(dest => dest.IdTransaction, opt => opt.MapFrom(src => src.ID_TRANSACTION))
                .ForMember(dest => dest.IdCurrencyDenomination, opt => opt.MapFrom(src => src.ID_CURRENCY_DENOMINATION))
                .ForMember(dest => dest.CurrencyDenomination, opt => opt.MapFrom(src => src.CURRENCY_DENOMINATION))
                .ForMember(dest => dest.IdTypeOperation, opt => opt.MapFrom(src => src.ID_TYPE_OPERATION))
                .ForMember(dest => dest.TypeOperation, opt => opt.MapFrom(src => src.TYPE_OPERATION))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<Load, LoadDto>()
                .ForMember(dest => dest.IdPayPad, opt => opt.MapFrom(src => src.ID_PAYPAD))
                .ForMember(dest => dest.TotalLoaded, opt => opt.MapFrom(src => src.TOTAL_LOADED))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<LoadDetail, LoadDetailDto>()
                .ForMember(dest => dest.IdLoad, opt => opt.MapFrom(src => src.ID_LOAD))
                .ForMember(dest => dest.IdCurrencyDenomination, opt => opt.MapFrom(src => src.ID_CURRENCY_DENOMINATION))
                .ForMember(dest => dest.DenominationValue, opt => opt.MapFrom(src => src.DENOMINATION_VALUE))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<Tonnage, TonnageDto>()
                .ForMember(dest => dest.IdPayPad, opt => opt.MapFrom(src => src.ID_PAYPAD))
                .ForMember(dest => dest.TotalAp, opt => opt.MapFrom(src => src.TOTAL_AP))
                .ForMember(dest => dest.TotalDp, opt => opt.MapFrom(src => src.TOTAL_DP))
                .ForMember(dest => dest.TotalRj, opt => opt.MapFrom(src => src.TOTAL_RJ))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<TonnageDetail, TonnageDetailDto>()
                .ForMember(dest => dest.IdTonnage, opt => opt.MapFrom(src => src.ID_TONNAGE))
                .ForMember(dest => dest.IdCurrencyDenomination, opt => opt.MapFrom(src => src.ID_CURRENCY_DENOMINATION))
                .ForMember(dest => dest.DenominationValue, opt => opt.MapFrom(src => src.DENOMINATION_VALUE))
                .ForMember(dest => dest.QuantityAp, opt => opt.MapFrom(src => src.QUANTITY_AP))
                .ForMember(dest => dest.QuantityDp, opt => opt.MapFrom(src => src.QUANTITY_DP))
                .ForMember(dest => dest.QuantityRj, opt => opt.MapFrom(src => src.QUANTITY_RJ))
                .ForMember(dest => dest.QuantityTotal, opt => opt.MapFrom(src => src.QUANTITY_TOTAL))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));
            #endregion

            #region Alerts
            CreateMap<Subscription, SubscriptionDto>()
                .ForMember(dest => dest.IdPayPad, opt => opt.MapFrom(src => src.ID_PAYPAD))
                .ForMember(dest => dest.IdAlert, opt => opt.MapFrom(src => src.ID_ALERT))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            #endregion

            #region Masters
            CreateMap<Currency, CurrencyDto>()
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<TypeDocument, TypeDocumentDto>()
                .ForMember(dest => dest.TypeDocument, opt => opt.MapFrom(src => src.TYPE_DOCUMENT))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<Region, RegionDto>()
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<CurrencyDenomination, CurrencyDenominationDto>()
                .ForMember(dest => dest.IdCurrency, opt => opt.MapFrom(src => src.ID_CURRENCY))
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));

            CreateMap<Alert, AlertDto>()
                .ForMember(dest => dest.IdUserCreated, opt => opt.MapFrom(src => src.ID_USER_CREATED))
                .ForMember(dest => dest.IdUserUpdated, opt => opt.MapFrom(src => src.ID_USER_UPDATED))
                .ForMember(dest => dest.DateCreated, opt => opt.MapFrom(src => src.DATE_CREATED))
                .ForMember(dest => dest.DateUpdated, opt => opt.MapFrom(src => src.DATE_UPDATED))
                .ForMember(dest => dest.UserCreated, opt => opt.MapFrom(src => src.USER_CREATED_NAME))
                .ForMember(dest => dest.UserUpdated, opt => opt.MapFrom(src => src.USER_UPDATED_NAME));
            #endregion

        }
    }
}
