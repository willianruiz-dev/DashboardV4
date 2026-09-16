using Dashboard.Domain.DTOs;


namespace Dashboard.Domain.Interfaces.Application
{
    public interface IMastersBL<T>
    {
        Task<T?> GetByIdAsync(int id);
        Task<List<T>?> GetAllAsync();
        Task<T?> CreateAsync(T newEntry);
        Task<T?> UpdateAsync(T entry);
        Task<bool> DeleteByIdAsync(int id);
    }
}
