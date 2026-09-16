using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Security;

namespace Dashboard.Domain.Interfaces.Persistence
{
    public interface IGenericRepository<T, Tdto>
    {
        Task<IEnumerable<T>> GetAllAsync();
        Task<T?> GetByIdAsync(int id);
        Task<T?> CreateAsync(Tdto newEntry);
        Task<T?> UpdateAsync(Tdto entry);
        Task<bool> DeleteByIdAsync(int id);

    }
}
