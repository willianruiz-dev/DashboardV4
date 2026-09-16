
using Dashboard.Domain.DTOs;

namespace Dashboard.Domain.Interfaces.Application
{
    public interface IAuthBL
    {
        Task<bool> VerifyPwd(LoginDto loginData);
        Task<string?> Login(LoginDto loginData);
        Task<bool> Logout(string token);
        Task<string?> LoginPP(LoginDto loginData);
    }
}
