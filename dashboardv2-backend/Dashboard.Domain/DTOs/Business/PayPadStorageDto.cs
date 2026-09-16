namespace Dashboard.Domain.DTOs
{
    public class PayPadStorageDto : DtoCommon
    {
        public int IdPayPad { get; set; }
        public string? PayPad { get; set; }
        public int IdCurrencyDenomination { get; set; }
        public int DenominationValue { get; set; }
        public string? ImgDenom { get; set; }
        public int ApStored { get; set; }
        public double ApTotal { get; set; }
        public int DpStored { get; set; }
        public double DpTotal { get; set; }
        public int RjStored { get; set; }
        public double RjTotal { get; set; }
        public int QuantityStored { get; set; }
        public double Total { get; set; }

        public bool IsDispensing { get; set; }
        public int MinDpQuantity { get; set; } 
    }
}
