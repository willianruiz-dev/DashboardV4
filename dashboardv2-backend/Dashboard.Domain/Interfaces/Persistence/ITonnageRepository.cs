using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Business;


namespace Dashboard.Domain.Interfaces.Persistence
{
    public interface ITonnageRepository
    {
        Task<IEnumerable<Tonnage>> GetAllAsync();
        Task<Tonnage?> GetByIdAsync(int id);
        Task<IEnumerable<Tonnage>> GetByPaypadAsync(int idPaypad);
        Task<Tonnage?> CreateAsync(TonnageDto newTonnage);
        Task<IEnumerable<TonnageDetail>> GetDetailsByTonnageAsync(int idTonnage);


    }
}
