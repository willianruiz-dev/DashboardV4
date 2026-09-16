namespace Dashboard.Domain.DTOs
{
    public class PayPadDto : DtoCommon
    {
        public string? Username { get; set; }
        public string? Pwd { get; set; }
        public string? Description { get; set; }
        public string? Longitude { get; set; }
        public string? Latitude { get; set; }
        public int IdCurrency { get; set; }
        public string? Currency { get; set; }
        public int Status { get; set; }
        public int IdOffice { get; set; }
        public string? Office { get; set; }

    }
}
