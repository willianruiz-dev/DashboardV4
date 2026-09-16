using Dashboard.Domain.DTOs;


namespace Dashboard.Domain.Interfaces.Application
{
    public interface IPermissionBL
    {
        Task<PermissionDto?> GetByIdAsync(int id);
        Task<List<PermissionDto>?> GetAllAsync();
        
    }
}
