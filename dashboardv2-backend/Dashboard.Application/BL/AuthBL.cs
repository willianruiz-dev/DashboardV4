

using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Security;
using Dashboard.Domain.Interfaces.Application;
using Microsoft.IdentityModel.Tokens;

namespace Dashboard.Application.BL
{
    public class AuthBL : IAuthBL
    {
        private readonly ITokenBL _tokenBL;
        private readonly IUserBL _userBL;
        private readonly IPayPadBL _paypadBL;
        private readonly IPayPadValidation _paypadValidation;
        private readonly IUserValidation _userValidation;
        private readonly ISessionBL _sessionBL;

        public AuthBL(ITokenBL tokenBL, IUserValidation userValidation, IUserBL userBL, IPayPadBL paypadBL, IPayPadValidation payPadValidation, ISessionBL sessionBL)
        {
            _tokenBL = tokenBL;
            _userBL = userBL;
            _userValidation = userValidation;
            _paypadBL = paypadBL;
            _paypadValidation = payPadValidation;
            _sessionBL = sessionBL;
        }

        public async Task<bool> VerifyPwd(LoginDto loginData)
        {
            //Validacion del usuario
            UserDto? user = await _userBL.GetByUserNameAsync(loginData.userName);
            if (user == null || user.Document == null) return false;
            user.Pwd = await _userBL.GetUserPasswordAsync(user.Document);
            var userResult = _userValidation.IsPasswordCorrect(user, loginData.password);
            if (userResult == null) return false;

            return true;

        }

        public async Task<string?> Login(LoginDto loginData)
        {
            //Validacion del usuario
            UserDto? user = await _userBL.GetByUserNameAsync(loginData.userName);
            if (user == null || user.Document == null) return null;
            user.Pwd = await _userBL.GetUserPasswordAsync(user.Document);
            var userResult = _userValidation.IsPasswordCorrect(user, loginData.password);
            if (userResult == null) return null;

            //Validación de sesiones activas
            var userActiveSessions = (await _sessionBL.GetByUserAsync(user.Id))?.Where(s => s.Active == true).ToList();

            // Se valida cualquier usuario excepto Root
            if ((userActiveSessions == null || userActiveSessions.Count > 0) && user.Id != 1) 
                throw new Exception("El usuario ya tiene una sesión activa, cierre dicha sesión para iniciar una nueva.");

            var token = _tokenBL.GenerateToken(userResult);
            SessionDto newSession = new SessionDto
            {
                IdUser = userResult.Id,
                Token = token,
                Active = true,
            };
            await _sessionBL.CreateAsync(newSession);
            return token;
            
        }

        public async Task<bool> Logout(string token)
        {
            var session = await _sessionBL.GetByTokenAsync(token);
            if (session == null) return false;

            session.Active = false; 
            await _sessionBL.UpdateAsync(session);
            return true;
        }

        public async Task<string?> LoginPP(LoginDto loginData)
        {
            PayPadDto? paypad = await _paypadBL.GetByUsernameAsync(loginData.userName);
            if (paypad == null || paypad.Username == null) return null;
            paypad.Pwd = await _paypadBL.GetPaypadPasswordAsync(paypad.Username);
            var paypadResult = _paypadValidation.IsPasswordCorrect(paypad, loginData.password);
            if (paypadResult != null)
                return _tokenBL.GenerateToken(paypadResult);

            return null;
        }
    }
}
