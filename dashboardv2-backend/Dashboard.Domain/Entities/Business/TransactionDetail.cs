namespace Dashboard.Domain.Entities.Business
{
    public class TransactionDetail : EntityCommon
    {
        public int ID_TRANSACTION { get; set; }
        public int ID_CURRENCY_DENOMINATION { get; set; }
        public int CURRENCY_DENOMINATION { get; set; }
        public int ID_TYPE_OPERATION { get; set; }
        public string TYPE_OPERATION { get; set; }
    }
}
