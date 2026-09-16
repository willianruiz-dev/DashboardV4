namespace Dashboard.Domain.DTOs
{
    public class LoadDto : DtoCommon
    {
        public int IdPayPad { get; set; }
        public int TotalLoaded { get; set; }
        public List<LoadDetailDto> Details { get; set; } = new List<LoadDetailDto>();
    }
}
