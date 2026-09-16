namespace Dashboard.Domain.Entities.Business
{
    public class PayPad : EntityCommon
    {
        public string USERNAME { get; set; }
        public string PWD { get; set; }
        public string DESCRIPTION { get; set; }
        public string LONGITUDE { get; set; }
        public string LATITUDE { get; set; }
        public int ID_CURRENCY { get; set; }
        public string CURRENCY { get; set; }
        public int ID_OFFICE { get; set; }
        public string OFFICE { get; set; }
        public int STATUS { get; set; }

    }
}
