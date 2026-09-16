using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Business;


namespace Dashboard.Domain.Interfaces.Persistence
{
    public interface ILoadRepository
    {
        Task<IEnumerable<Load>> GetAllAsync();
        Task<Load?> GetByIdAsync(int id);
        Task<IEnumerable<Load>> GetByPaypadAsync(int idPaypad);
        Task<Load?> CreateAsync(LoadDto newLoad);
        Task<IEnumerable<LoadDetail>> GetDetailsByLoadAsync(int idLoad);
        Task<LoadDetail?> CreateDetailAsync(LoadDetailDto newLoadDetail);
        Task<bool> DeleteLoadAsync(int idPayPad, int idLoad);


    }
}
