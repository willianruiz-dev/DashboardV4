namespace Dashboard.Domain.Entities.Business
{
    public class Office:EntityCommon
    {
        public string NAME { get; set; }
        public string ADDRESS { get; set; }
        public int ID_CLIENT { get; set; }
    }
}
