using Dashboard.Domain.DTOs;


namespace Dashboard.Domain.Interfaces.Application
{
    public interface ITonnageBL
    {
        Task<List<TonnageDto>?> GetAllAsync();
        Task<TonnageDto?> GetByIdAsync(int id);
        Task<List<TonnageDto>?> GetByPaypadAsync(int idPaypad);
        Task<TonnageDto?> CreateAsync(TonnageDto newTonnage);
        Task<List<TonnageDetailDto>?> GetDetailsByTonnageAsync(int idTonnage);

    }
}
