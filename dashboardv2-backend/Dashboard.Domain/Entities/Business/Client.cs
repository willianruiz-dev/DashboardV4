namespace Dashboard.Domain.Entities.Business
{
    public class Client : EntityCommon
    {
        public string NAME { get; set; }
        public string NIT { get; set; }
        public string EMAIL { get; set; }
        public string PHONE { get; set; }
        public int ID_REGION { get; set; }
        public string REGION { get; set; }
        public string? LOGOIMG { get; set; }

        public string? IMGEXT { get; set; }

        public int ID_USER_LINKED { get; set; }
        public string USER_LINKED { get; set; }

    }
}
