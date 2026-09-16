namespace Dashboard.Domain.DTOs
{
    public class TonnageDetailDto : DtoCommon
    {
        public int IdTonnage { get; set; }
        public int IdCurrencyDenomination { get; set; }
        public int DenominationValue { get; set; }
        public int QuantityAp { get; set; }
        public int QuantityDp { get; set; }
        public int QuantityRj {  get; set; }
        public int QuantityTotal { get; set; }
    }
}
