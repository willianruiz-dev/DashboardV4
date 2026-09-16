namespace Dashboard.Domain.Variables
{
    public static class AppSettings
    {
        public static bool IsProduction { get; set; }
        public static string SALT_INTERNAL { get { return "App:InternalSaltKey"; } }
        public static string SALT_EXTERNAL { get { return "App:ExternalSaltKey"; } }
        public static string JWT_SECRET { get { return "Jwt:Secret"; } }
        public static string DASHBOARD_KEY_ID { get { return "DashboardKeyId"; } }
        public static string CORS_NAME { get { return "DashboardSecurityPolicy"; } }
        public static string DB_CONNECTION { get {
                if (IsProduction)
                    return "DbConnection";
                else
                    return "DbConnectionDev";
            } }
        public static string MONGO_DB_CONNECTION { get { return "MongoDb"; } }
        public static string ENVIRONMENT { get { return "Environment"; } }
        public static string STATIC_RES { get { return "StaticRes:StaticFiles"; } }
        public static string VIDEOS_PATH { get { return "StaticRes:VideoFiles"; } }
    }
}
