namespace Dashboard.Domain.Variables
{
    public static class Procedures
    {
        public static string EXEC { get { return "EXEC"; } }


        public static string SECURITY_SP_USERS_GETALL { get { return "[security].[SP_GetAllUsers]"; } }
        public static string SECURITY_SP_USERS_GETBYID { get { return "[security].[SP_GetUser]"; } }
        public static string SECURITY_SP_USERS_CREATE { get { return "[security].[SP_CreateUser]"; } }
        public static string SECURITY_SP_USERS_UPDATE { get { return "[security].[SP_UpdateUser]"; } }
        public static string SECURITY_SP_USERS_DELETEBYID { get { return "[security].[SP_DeleteUser]"; } }
        public static string SECURITY_SP_USERS_GETPWD { get { return "[security].[SP_GetPasswordUser]"; } }

        public static string SECURITY_SP_ROLES_GETALL { get { return "[security].[SP_GetAllRoles]"; } }
        public static string SECURITY_SP_ROLES_CREATE { get { return "[security].[SP_CreateRole]"; } }
        public static string SECURITY_SP_ROLES_UPDATE { get { return "[security].[SP_UpdateRole]"; } }
        public static string SECURITY_SP_ROLES_DELETEBYID { get { return "[security].[SP_DeleteRole]"; } }

        public static string SECURITY_SP_ROUTES_GETALL { get { return "[security].[SP_GetAllRoutes]"; } }
        public static string SECURITY_SP_ROUTES_CREATE { get { return "[security].[SP_CreateRoute]"; } }
        public static string SECURITY_SP_ROUTES_UPDATE { get { return "[security].[SP_UpdateRoute]"; } }
        public static string SECURITY_SP_ROUTES_DELETEBYID { get { return "[security].[SP_DeleteRoute]"; } }

        public static string SECURITY_SP_ROUTESBYROLES_GETALL { get { return "[security].[SP_GetRoutesByRoles]"; } }
        public static string SECURITY_SP_ROUTESBYROLES_CREATE { get { return "[security].[SP_CreateRouteByRole]"; } }
        public static string SECURITY_SP_ROUTESBYROLES_DELETE { get { return "[security].[SP_DeleteRouteByRole]"; } }

        public static string SECURITY_SP_PERMISSIONS_GETALL { get { return "[security].[SP_GetAllPermissions]"; } }
        public static string SECURITY_SP_PERMISSIONS_CREATE { get { return "[security].[SP_CreatePermission]"; } }
        public static string SECURITY_SP_PERMISSIONS_UPDATE { get { return "[security].[SP_UpdatePermission]"; } }
        public static string SECURITY_SP_PERMISSIONS_DELETEBYID { get { return "[security].[SP_DeletePermission]"; } }

        public static string SECURITY_SP_PERMISSIONSBYROLES_GETALL { get { return "[security].[SP_GetPermissionsByRoles]"; } }
        public static string SECURITY_SP_PERMISSIONSBYROLES_CREATE { get { return "[security].[SP_CreatePermissionByRole]"; } }
        public static string SECURITY_SP_PERMISSIONSBYROLES_DELETE { get { return "[security].[SP_DeletePermissionByRole]"; } }

        public static string SECURITY_SP_SESSIONS_GETBY_TOKEN { get { return "[security].[SP_GetSesionByToken]"; } }
        public static string SECURITY_SP_SESSIONS_GETBY_USER { get { return "[security].[SP_GetSesionsByUser]"; } }
        public static string SECURITY_SP_SESSIONS_CREATE { get { return "[security].[SP_CreateSession]"; } }
        public static string SECURITY_SP_SESSIONS_UPDATE { get { return "[security].[SP_UpdateSession]"; } }

        public static string MASTERS_SP_TYPEDOC_GETALL { get { return "[masters].[SP_GetAllTypeDocument]"; } }
        public static string MASTERS_SP_TYPEDOC_CREATE { get { return "[masters].[SP_CreateTypeDocument]"; } }
        public static string MASTERS_SP_TYPEDOC_UPDATE { get { return "[masters].[SP_UpdateTypeDocument]"; } }
        public static string MASTERS_SP_TYPEDOC_DELETEBYID { get { return "[masters].[SP_DeleteTypeDocument]"; } }

        public static string MASTERS_SP_CURRENCY_GETALL { get { return "[masters].[SP_GetAllCurrency]"; } }
        public static string MASTERS_SP_CURRENCY_CREATE { get { return "[masters].[SP_CreateCurrency]"; } }
        public static string MASTERS_SP_CURRENCY_UPDATE { get { return "[masters].[SP_UpdateCurrency]"; } }
        public static string MASTERS_SP_CURRENCY_DELETEBYID { get { return "[masters].[SP_DeleteCurrency]"; } }

        public static string MASTERS_SP_OPTTYPE_GETALL { get { return "[masters].[SP_GetAllOperationDenomination]"; } }
        public static string MASTERS_SP_OPTTYPE_CREATE { get { return "[masters].[SP_CreateOperationDenomination]"; } }
        public static string MASTERS_SP_OPTTYPE_UPDATE { get { return "[masters].[SP_UpdateOperationDenomination]"; } }
        public static string MASTERS_SP_OPTTYPE_DELETEBYID { get { return "[masters].[SP_DeleteOperationDenomination]"; } }

        public static string MASTERS_SP_STATETRANSACTION_GETALL { get { return "[masters].[SP_GetAllStateTransaction]"; } }
        public static string MASTERS_SP_STATETRANSACTION_CREATE { get { return "[masters].[SP_CreateStateTransaction]"; } }
        public static string MASTERS_SP_STATETRANSACTION_UPDATE { get { return "[masters].[SP_UpdateStateTransaction]"; } }
        public static string MASTERS_SP_STATETRANSACTION_DELETEBYID { get { return "[masters].[SP_DeleteStateTransaction]"; } }

        public static string MASTERS_SP_PAYMENTTYPE_GETALL { get { return "[masters].[SP_GetAllPaymentType]"; } }
        public static string MASTERS_SP_PAYMENTTYPE_CREATE { get { return "[masters].[SP_CreatePaymentType]"; } }
        public static string MASTERS_SP_PAYMENTTYPE_UPDATE { get { return "[masters].[SP_UpdatePaymentType]"; } }
        public static string MASTERS_SP_PAYMENTTYPE_DELETEBYID { get { return "[masters].[SP_DeletePaymentType]"; } }

        public static string MASTERS_SP_TRANTYPE_GETALL { get { return "[masters].[SP_GetAllTransactionType]"; } }
        public static string MASTERS_SP_TRANTYPE_CREATE { get { return "[masters].[SP_CreateTransactionType]"; } }
        public static string MASTERS_SP_TRANTYPE_UPDATE { get { return "[masters].[SP_UpdateTransactionType]"; } }
        public static string MASTERS_SP_TRANTYPE_DELETEBYID { get { return "[masters].[SP_DeleteTransactionType]"; } }

        public static string MASTERS_SP_CURRDENOM_GETALL { get { return "[masters].[SP_GetAllCurrencyDenomination]"; } }
        public static string MASTERS_SP_CURRDENOM_CREATE { get { return "[masters].[SP_CreateCurrencyDenomination]"; } }
        public static string MASTERS_SP_CURRDENOM_UPDATE { get { return "[masters].[SP_UpdateCurrencyDenomination]"; } }
        public static string MASTERS_SP_CURRDENOM_DELETEBYID { get { return "[masters].[SP_DeleteCurrencyDenomination]"; } }

        public static string MASTERS_SP_ALERTS_GETALL { get { return "[masters].[SP_GetAllAlerts]"; } }
        public static string MASTERS_SP_ALERTS_CREATE { get { return "[masters].[SP_CreateAlert]"; } }
        public static string MASTERS_SP_ALERTS_UPDATE { get { return "[masters].[SP_UpdateAlert]"; } }
        public static string MASTERS_SP_ALERTS_DELETEBYID { get { return "[masters].[SP_DeleteAlert]"; } }

        

        public static string MASTERS_SP_REGION_GETALL { get { return "[masters].[SP_GetAllRegion]"; } }
        public static string MASTERS_SP_REGION_CREATE { get { return "[masters].[SP_CreateRegion]"; } }
        public static string MASTERS_SP_REGION_UPDATE { get { return "[masters].[SP_UpdateRegion]"; } }
        public static string MASTERS_SP_REGION_DELETEBYID { get { return "[masters].[SP_DeleteRegion]"; } }

        public static string BUSINESS_SP_OFFICES_GETALL { get { return "[business].[SP_GetAllOffices]"; } }
        public static string BUSINESS_SP_OFFICES_CREATE { get { return "[business].[SP_CreateOffice]"; } }
        public static string BUSINESS_SP_OFFICES_UPDATE { get { return "[business].[SP_UpdateOffice]"; } }
        public static string BUSINESS_SP_OFFICES_DELETEBYID { get { return "[business].[SP_DeleteOffice]"; } }

        public static string BUSINESS_SP_PAYPAD_GETALL { get { return "[business].[SP_GetAllPayPad]"; } }
        public static string BUSINESS_SP_PAYPAD_GET_STORAGE { get { return "[business].[SP_GetPayPadStorage]"; } }
        public static string BUSINESS_SP_PAYPAD_GETPWD { get { return "[business].[SP_GetPasswordPaypad]"; } }
        public static string BUSINESS_SP_PAYPAD_CREATE { get { return "[business].[SP_CreatePayPad]"; } }
        public static string BUSINESS_SP_PAYPAD_UPDATE { get { return "[business].[SP_UpdatePayPad]"; } }
        public static string BUSINESS_SP_PAYPAD_DELETEBYID { get { return "[business].[SP_DeletePayPad]"; } }

        public static string BUSINESS_SP_PAYPAD_CREATE_STORAGE { get { return "[business].[SP_CreatePayPadStorage]"; } }

        public static string BUSINESS_SP_PAYPAD_CREATE_CONFIGURATION { get { return "[business].[SP_CreatePayPadConfiguration]"; } }
        public static string BUSINESS_SP_PAYPAD_CONFIGURATION_GETALL { get { return "[business].[SP_GetAllPayPadConfiguration]"; } }
        public static string BUSINESS_SP_PAYPAD_UPDATE_CONFIGURATION { get { return "[business].[SP_UpdatePayPadConfiguration]"; } }

        public static string BUSINESS_SP_CLIENTS_GETALL { get { return "[business].[SP_GetAllClients]"; } }
        public static string BUSINESS_SP_CLIENTS_CREATE { get { return "[business].[SP_CreateClient]"; } }
        public static string BUSINESS_SP_CLIENTS_UPDATE { get { return "[business].[SP_UpdateClient]"; } }
        public static string BUSINESS_SP_CLIENTS_DELETEBYID { get { return "[business].[SP_DeleteClient]"; } }

        public static string BUSINESS_SP_TRANSACTIONS_GETALL { get { return "[business].[SP_GetAllTransactions]"; } }
        public static string BUSINESS_SP_TRANSACTIONS_GETBY_PAYPAD { get { return "[business].[SP_GetTransactionsByPayPad]"; } }
        public static string BUSINESS_SP_TRANSACTIONS_GETBY_PAYPAD_AND_DATE { get { return "[business].[SP_GetTransactionsByPaypadAndDate]"; } }
        public static string BUSINESS_SP_TRANSACTIONS_CREATE { get { return "[business].[SP_CreateTransaction]"; } }
        public static string BUSINESS_SP_TRANSACTIONS_UPDATE { get { return "[business].[SP_UpdateTransaction]"; } }

        public static string BUSINESS_SP_TRANSACTIONSDETAIL_GETALL { get { return "[business].[SP_GetAllTransactionsDetails]"; } }
        public static string BUSINESS_SP_TRANSACTIONSDETAIL_GETBY_TRANSACTION { get { return "[business].[SP_GetTransactionDetailsByTransaction]"; } }
        public static string BUSINESS_SP_TRANSACTIONSDETAIL_CREATE { get { return "[business].[SP_CreateTransactionDetail]"; } }
        public static string BUSINESS_SP_TRANSACTIONSDETAIL_UPDATE { get { return "[business].[SP_UpdateTransactionDetail]"; } }

        public static string BUSINESS_SP_TRANSACTIONRATINGS_GETALL { get { return "[business].[SP_GetTransactionRatings]"; } }
        public static string BUSINESS_SP_TRANSACTIONRATINGS_CREATE { get { return "[business].[SP_CreateTransactionRating]"; } }

        public static string BUSINESS_SP_LOADS_GETALL { get { return "[business].[SP_GetAllLoads]"; } }
        public static string BUSINESS_SP_LOADS_GETBY_PAYPAD { get { return "[business].[SP_GetLoadsByIdPaypad]"; } }
        public static string BUSINESS_SP_LOADS_CREATE { get { return "[business].[SP_CreateLoad]"; } }
        public static string BUSINESS_SP_LOADS_DELETE { get { return "[business].[SP_DeleteLoadRecursive]"; } }


        public static string BUSINESS_SP_LOADDETAILS_GETBY_LOAD { get { return "[business].[SP_GetLoadDetailsByIdLoad]"; } }
        public static string BUSINESS_SP_LOADDETAILS_CREATE { get { return "[business].[SP_CreateLoadDetail]"; } }

        public static string BUSINESS_SP_TONNAGES_GETALL { get { return "[business].[SP_GetAllTonnages]"; } }
        public static string BUSINESS_SP_TONNAGES_GETBY_PAYPAD { get { return "[business].[SP_GetTonnagesByIdPaypad]"; } }
        public static string BUSINESS_SP_TONNAGES_CREATE { get { return "[business].[SP_CreateTonnage]"; } }

        public static string BUSINESS_SP_TONNAGEDETAILS_GETBY_TONNAGE { get { return "[business].[SP_GetTonnagesDetailByIdTonnage]"; } }
        
        
        //SP.BUSINESS_SP_GET_TRANSACTION_PAYPAD

        public static string BUSINESS_SP_GET_TRANSACTION_PAYPAD { get { return "[business].[SP_GetTransactionPayPad ]"; } }



        public static string ALERTS_SP_SUBSCRIPTIONS_GETALL { get { return "[Alerts].[SP_GetAllSubscriptions]"; } }
        public static string ALERTS_SP_SUBSCRIPTIONS_CREATE { get { return "[Alerts].[SP_CreateSubscription]"; } }
        public static string ALERTS_SP_SUBSCRIPTIONS_UPDATE { get { return "[Alerts].[SP_UpdateSubscription]"; } }
        public static string ALERTS_SP_SUBSCRIPTIONS_DELETEBYID { get { return "[Alerts].[SP_DeleteSubscription]"; } }

    }
}
