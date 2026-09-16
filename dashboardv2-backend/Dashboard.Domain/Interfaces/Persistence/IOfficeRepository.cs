using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Business;


namespace Dashboard.Domain.Interfaces.Persistence
{
    public interface IOfficeRepository
    {
        Task<IEnumerable<Office>> GetAllAsync();
        Task<Office?> GetByIdAsync(int id);
        Task<Office?> CreateAsync(OfficeDto newPaypad);
        Task<Office?> UpdateAsync(OfficeDto paypad);
        Task<bool> DeleteByIdAsync(int id);


    }
}
