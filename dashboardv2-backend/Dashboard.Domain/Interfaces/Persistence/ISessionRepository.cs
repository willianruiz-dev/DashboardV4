using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Security;

namespace Dashboard.Domain.Interfaces.Persistence
{
    public interface ISessionRepository
    {
        Task<Session?> GetByTokenAsync(string token);
        Task<IEnumerable<Session>> GetByUserAsync(int idUser);
        Task<Session?> CreateAsync(SessionDto newSession);
        Task<Session?> UpdateAsync(SessionDto Session);


    }
}
