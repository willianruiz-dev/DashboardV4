namespace Dashboard.Domain.Entities.Security
{
    public class Route : EntityCommon
    {
        public int ID_FATHER { get; set; }
        public string? TITLE { get; set; }
        public string? ROUTE { get; set; }
        public string? ICON { get; set; }
    }
}