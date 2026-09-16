using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Security;

namespace Dashboard.Domain.Interfaces.Persistence
{
    public interface IRouteRepository
    {
        Task<IEnumerable<Route>> GetAllAsync();
        Task<Route?> GetByIdAsync(int id);
        Task<Route?> CreateAsync(RouteDto newRoute);
        Task<Route?> UpdateAsync(RouteDto Route);
        Task<bool> DeleteByIdAsync(int id);


    }
}
