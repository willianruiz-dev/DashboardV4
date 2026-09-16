namespace Dashboard.Domain.DTOs
{
    public class TonnageDto : DtoCommon
    {
        public int IdPayPad { get; set; }
        public double TotalAp { get; set; }
        public double TotalDp { get; set; }
        public double TotalRj {  get; set; }
        public double Total { get; set; }
        public List<TonnageDetailDto> Details { get; set; } = new List<TonnageDetailDto>();
    }
}
