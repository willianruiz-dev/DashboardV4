using Dashboard.Domain.DTOs;


namespace Dashboard.Domain.Interfaces.Application
{
    public interface IRouteBL
    {
        Task<RouteDto?> GetByIdAsync(int id);
        Task<List<RouteDto>?> GetAllAsync();
        Task<RouteDto?> CreateAsync(RouteDto newRoute, int idUser);
        Task<RouteDto?> UpdateAsync(RouteDto route);
        Task<bool> DeleteByIdAsync(int id);
    }
}
