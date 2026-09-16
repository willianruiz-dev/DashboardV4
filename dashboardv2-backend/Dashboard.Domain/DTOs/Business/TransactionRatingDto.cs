namespace Dashboard.Domain.DTOs
{
    public class TransactionRatingDto
    {
        public int Id { get; set; }
        public int IdTransaction { get; set; }
        public int Rating { get; set; }
        public DateTime DateCreated { get; set; }

    }
}
