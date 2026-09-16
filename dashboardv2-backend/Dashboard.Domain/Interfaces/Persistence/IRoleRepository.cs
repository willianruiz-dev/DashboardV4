using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Security;

namespace Dashboard.Domain.Interfaces.Persistence
{
    public interface IRoleRepository
    {
        Task<IEnumerable<Role>> GetAllAsync();
        Task<Role?> GetByIdAsync(int id);
        Task<Role?> CreateAsync(RoleDto newRole);
        Task<Role?> UpdateAsync(RoleDto Role);
        Task<bool> DeleteByIdAsync(int id);
        Task<List<Route>> GetRoutesByRoleAsync(int idRole);
        Task<RouteByRole?> CreateRouteByRoleAsync(int idRole, int idRoute);
        Task<bool> DeleteRouteByRoleAsync(int idRole, int idRoute);

        Task<List<Permission>> GetPermissionsByRoleAsync(int idRole);
        Task<PermissionByRole?> CreatePermissionByRoleAsync(int idRole, int idPermission);
        Task<bool> DeletePermissionByRoleAsync(int idRole, int idPermission);
    }
}
