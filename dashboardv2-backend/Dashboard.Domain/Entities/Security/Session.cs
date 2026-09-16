namespace Dashboard.Domain.Entities.Security
{
    public class Session : EntityCommon
    {
        public int ID_USER { get; set; }
        public string? TOKEN { get; set; }
        public bool ACTIVE { get; set; }
    }
}