
namespace Dashboard.Domain.DTOs
{
    public class RoleDto: DtoCommon
    {
        public string? Role { get; set; }
        public List<RouteDto> Routes { get; set; } = new List<RouteDto>();
        public List<PermissionDto> Permissions { get; set; } = new List<PermissionDto>();
    }
}
