namespace Dashboard.Domain.Entities.Masters
{
    public class CurrencyDenomination : EntityCommon
    {
        public int ID_CURRENCY { get; set; }
        public string? CURRENCY { get; set; }
        public int  VALUE { get; set; }
        public string? IMG { get; set; }
    }
}
