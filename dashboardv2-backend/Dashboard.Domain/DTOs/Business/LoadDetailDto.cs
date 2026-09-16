namespace Dashboard.Domain.DTOs
{
    public class LoadDetailDto : DtoCommon
    {
        public int IdLoad { get; set; }
        public int IdCurrencyDenomination { get; set; }
        public int DenominationValue { get; set; }
        public int Quantity { get; set; }
    }
}
