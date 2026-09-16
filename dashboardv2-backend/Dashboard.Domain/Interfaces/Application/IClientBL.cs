using Dashboard.Domain.DTOs;


namespace Dashboard.Domain.Interfaces.Application
{
    public interface IClientBL
    {
        Task<ClientDto?> GetByIdAsync(int id);
        Task<List<ClientDto>?> GetAllAsync();
        Task<ClientDto?> CreateAsync(ClientDto newClient, int idUser);
        Task<ClientDto?> UpdateAsync(ClientDto Client);
        Task<bool> DeleteByIdAsync(int id);
    }
}
