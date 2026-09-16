using Dashboard.Domain.DTOs;
using Dashboard.Domain;
using Microsoft.Extensions.Configuration;
using Dashboard.Domain.Interfaces.Application;
using System.Runtime.CompilerServices;
using System.Net.Http.Headers;
using System.Text.RegularExpressions;
using Dashboard.Domain.Entities.Security;

namespace Dashboard.Application.Validation
{
    public class UserValidation: IUserValidation
    {

        private readonly IConfiguration _configuration;


        public UserValidation( IConfiguration configuration)
        {

            _configuration = configuration;
        }

        public UserDto? IsPasswordCorrect(UserDto? userResult, string password)
        {
            
            if (!string.IsNullOrEmpty(password))
            {

                if (userResult != null && !string.IsNullOrEmpty(userResult.Pwd) && password.ValidateEncodedPassword(userResult.Pwd, _configuration))
                {
                    return userResult;
                }
            }
            
            return null;
        }

        public void ValidateNewPassword(string newPwd)
        {
            string pattern = @"^(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*()-_=+[\]{}|;:'"",.<>?/]).{8,}$";
            if (!Regex.IsMatch(newPwd, pattern)) throw new Exception("Las contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un carácter especial.");
        }
        public void ValidateEmail(ref UserDto user)
        {
            if (string.IsNullOrEmpty(user.Email)) throw new Exception("No se proporcionó email");
            user.Email = user.Email.Trim();
            string pattern = @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$";
            if (!Regex.IsMatch(user.Email, pattern)) throw new Exception("No se proporcionó email válido");
        }

        public void ValidateUserCreate(ref UserDto user)
        {
            if (string.IsNullOrEmpty(user.Document))
            {
                throw new Exception("No se envió la cedula del usuario");
            }

            if (string.IsNullOrEmpty(user.Pwd))
            {
                throw new Exception("No se envió la contraseña del usuario");
            }

            if (string.IsNullOrEmpty(user.UserName))
            {
                throw new Exception("No se envió el nombre de usuario");
            }
            if (user.IdRole <= 0)
            {
                throw new Exception("No se envió el rol del usuario");
            }
            

            user.UserName= user.UserName.Trim();
            if (!string.IsNullOrEmpty(user.Name)) user.Name = user.Name.Trim();
            if (!string.IsNullOrEmpty(user.LastName)) user.LastName = user.LastName.Trim();

        }

        public void ValidateUserUpdate(UserDto user)
        {
            if (user.Id <= 0) throw new Exception("No se proporcionó id de usuario");
            if (user.IdUserUpdated <= 0) throw new Exception("Se debe proporcionar un id de usuario de actualización");
        }


    }
}
