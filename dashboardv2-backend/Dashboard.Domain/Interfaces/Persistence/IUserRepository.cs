using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Security;

namespace Dashboard.Domain.Interfaces.Persistence
{
    public interface IUserRepository
    {
        Task<IEnumerable<User>> GetAllAsync();
        Task<User?> GetByIdAsync(long id);
        Task<User?> CreateAsync(UserDto newUser);
        Task<User?> UpdateAsync(UserDto user);
        Task<bool> DeleteByIdAsync(long id);
        Task<string?> GetUserPassword(string document);


    }
}
