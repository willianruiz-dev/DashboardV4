namespace Dashboard.Domain.Variables
{
    public static class CacheKeys
    {
        public static string MASTERS_CURRENCY_DENOMINATIONS { get { return "Masters_CurrencyDenominations"; } }
        public static string MASTERS_CURRENCIES { get { return "Masters_Currencies"; } }
        public static string MASTERS_OPERATION_DENOMINATIONS { get { return "Masters_OperationDenominations"; } }
        public static string MASTERS_PAYMENT_TYPE { get { return "Masters_PaymentType"; } }
        public static string MASTERS_REGIONS { get { return "Masters_Regions"; } }
        public static string MASTERS_STATE_TRANSACTION { get { return "Masters_StateTransaction"; } }
        public static string MASTERS_TYPE_TRANSACTION { get { return "Masters_TypeTransaction"; } }
        public static string MASTERS_TYPE_DOCUMENT { get { return "Masters_TypeDocument"; } }

        public static string SECURITY_USERS { get { return "Security_Users"; } }
        public static string SECURITY_SESSIONS_USER { get { return "Security_SessionUser_"; } }
        public static string SECURITY_PERMISSIONS { get { return "Security_Permissions"; } }
        public static string SECURITY_ROLES { get { return "Security_Roles"; } }
        public static string SECURITY_ROUTES_BY_ROLE { get { return "Security_RoutesByRole"; } }
        public static string SECURITY_ROUTES { get { return "Security_Routes"; } }
        public static string SECURITY_PERMISSIONS_BY_ROLE { get { return "Security_PermissionsByRole"; } }



        public static string BUSINESS_TRANSACTIONS { get { return "Business_Transactions"; } }
        public static string BUSINESS_PAYPADS { get { return "Business_Paypads"; } }
        public static string BUSINESS_PAYPAD_STORAGE { get { return "Business_Paypad_Storage_"; } }
        public static string BUSINESS_PAYPAD_CONFIGURATION { get { return "Business_Paypad_Configuration"; } }
        public static string BUSINESS_TRANSACTIONS_BY_PAYPAD { get { return "Business_Transactions_PayPad_"; } }
        public static string BUSINESS_CLIENTS { get { return "Business_Clients"; } }
        public static string BUSINESS_OFFICES { get { return "Business_Offices"; } }
        public static string BUSINESS_TRANSACTIONS_RATINGS { get { return "Business_Transactions_Ratings"; } }
    }
}
