using Dashboard.Domain.DTOs;


namespace Dashboard.Domain.Interfaces.Application
{
    public interface IRoleBL
    {
        Task<RoleDto?> GetByIdAsync(int id);
        Task<List<RoleDto>?> GetAllAsync();
        Task<RoleDto?> CreateAsync(RoleDto newRole, int idUser);
        Task<RoleDto?> UpdateAsync(RoleDto role);
        Task<bool> DeleteByIdAsync(int id);
    }
}
