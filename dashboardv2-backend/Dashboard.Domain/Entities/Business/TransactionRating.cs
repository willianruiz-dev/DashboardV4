namespace Dashboard.Domain.Entities.Business
{
    public class TransactionRating 
    {
        public int ID { get; set; }
        public int ID_TRANSACTION {  get; set; }
        public int RATING { get; set; }
        public DateTime DATE_CREATED { get; set; }

    }
}
