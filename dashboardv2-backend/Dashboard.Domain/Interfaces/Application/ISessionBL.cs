using Dashboard.Domain.DTOs;


namespace Dashboard.Domain.Interfaces.Application
{
    public interface ISessionBL
    {
        Task<SessionDto?> GetByTokenAsync(string token);
        Task<List<SessionDto>?> GetByUserAsync(int idUser);
        Task<SessionDto?> CreateAsync(SessionDto newSession);
        Task<SessionDto?> UpdateAsync(SessionDto session);
    }
}
