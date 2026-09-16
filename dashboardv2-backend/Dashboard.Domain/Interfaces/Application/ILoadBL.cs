using Dashboard.Domain.DTOs;


namespace Dashboard.Domain.Interfaces.Application
{
    public interface ILoadBL
    {
        Task<List<LoadDto>?> GetAllAsync();
        Task<LoadDto?> GetByIdAsync(int id);
        Task<List<LoadDto>?> GetByPaypadAsync(int idPaypad);
        Task<LoadDto?> CreateAsync(LoadDto newLoad);
        Task<List<LoadDetailDto>?> GetDetailsByLoadAsync(int idLoad);
        Task<List<LoadDetailDto>> CreateDetails(LoadDto load);

    }
}
