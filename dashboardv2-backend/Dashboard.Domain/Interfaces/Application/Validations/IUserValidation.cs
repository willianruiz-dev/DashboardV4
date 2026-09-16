using Dashboard.Domain.DTOs;

namespace Dashboard.Domain.Interfaces.Application
{
    public interface IUserValidation
    {
        UserDto? IsPasswordCorrect(UserDto? userResult, string password);
        void ValidateNewPassword(string newPwd);
        void ValidateEmail(ref UserDto user);
        void ValidateUserCreate(ref UserDto user);
        void ValidateUserUpdate(UserDto user);


    }
}
