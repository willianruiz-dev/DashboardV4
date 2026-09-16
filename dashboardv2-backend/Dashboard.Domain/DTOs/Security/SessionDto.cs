
namespace Dashboard.Domain.DTOs
{
    public class SessionDto: DtoCommon
    {
        public int IdUser { get; set; }
        public string? Token { get; set; }
        public bool Active { get; set; }
    }
}
