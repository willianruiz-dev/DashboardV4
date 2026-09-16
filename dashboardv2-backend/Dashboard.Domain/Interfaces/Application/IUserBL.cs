using Dashboard.Domain.DTOs;


namespace Dashboard.Domain.Interfaces.Application
{
    public interface IUserBL
    {
        Task<UserDto?> GetByIdAsync(int id);
        Task<UserDto?> GetByDocumentAsync(string document);
        Task<UserDto?> GetByUserNameAsync(string userName);
        Task<List<UserDto>?> GetByRoleAsync(int role);
        Task<List<UserDto>?> GetAllAsync();
        Task<UserDto?> CreateAsync(UserDto newUser, int idUser);
        Task<UserDto?> UpdateAsync(UserDto user, bool changePwd);
        Task<bool> DeleteByIdAsync(int id);
        Task<UserDto?> ChangePassword(UserDto user, ChangePwdDto data, int idUserUpdater);
        Task<List<UserDto>?> GetByStatusAsync(int status);
        Task<string?> GetUserPasswordAsync(string document);
    }
}
