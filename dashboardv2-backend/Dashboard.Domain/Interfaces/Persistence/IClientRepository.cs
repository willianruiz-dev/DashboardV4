using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Business;


namespace Dashboard.Domain.Interfaces.Persistence
{
    public interface IClientRepository
    {
        Task<IEnumerable<Client>> GetAllAsync();
        Task<Client?> GetByIdAsync(int id);
        Task<Client?> CreateAsync(ClientDto newPaypad);
        Task<Client?> UpdateAsync(ClientDto paypad);
        Task<bool> DeleteByIdAsync(int id);


    }
}
