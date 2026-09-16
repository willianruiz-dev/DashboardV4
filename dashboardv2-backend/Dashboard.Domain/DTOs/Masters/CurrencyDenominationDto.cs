namespace Dashboard.Domain.DTOs
{
    public class CurrencyDenominationDto : DtoCommon
    {
        public int IdCurrency { get; set; }
        public string? Currency { get; set; }
        public int  Value { get; set; }
        public string? Img { get; set; }
        public string? ImgExt { get; set; }
        public List<byte> ImgList { get; set; }  = new List<byte>();
    }
}
