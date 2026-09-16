

namespace Dashboard.Domain.DTOs
{
    public class RouteDto: DtoCommon
    {
        public int? IdFather { get; set; }
        public string? Title { get; set; }
        public string? Route { get; set; }
        public string? Icon { get; set; }

    }
}
