using Dashboard.Domain.DTOs;


namespace Dashboard.Domain.Interfaces.Application
{
    public interface IOfficeBL
    {
        Task<OfficeDto?> GetByIdAsync(int id);
        Task<List<OfficeDto>?> GetByClientAsync(int idClient);
        Task<List<OfficeDto>?> GetAllAsync();
        Task<OfficeDto?> CreateAsync(OfficeDto newOffice, int idUser);
        Task<OfficeDto?> UpdateAsync(OfficeDto Office);
        Task<bool> DeleteByIdAsync(int id);
    }
}
