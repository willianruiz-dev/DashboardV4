namespace Dashboard.Domain.Entities.Business
{
    public class Transaction : EntityCommon
    {
        public string? DOCUMENT { get; set; }
        public string? REFERENCE { get; set; }
        public string? PRODUCT { get; set; }
        public double TOTAL_AMOUNT { get; set; }
        public double REAL_AMOUNT { get; set; }
        public double INCOME_AMOUNT { get; set; }
        public double RETURN_AMOUNT { get; set; }
        public string? DESCRIPTION { get; set; }
        public int ID_STATE_TRANSACTION { get; set; }
        public string STATE_TRANSACTION { get; set; }
        public int ID_TYPE_TRANSACTION { get; set; }
        public string TYPE_TRANSACTION { get; set; }
        public int ID_TYPE_PAYMENT { get; set; }
        public string TYPE_PAYMENT { get; set; }
        public int ID_PAYPAD { get; set; }
        public string PAYPAD { get; set; }

    }
}
