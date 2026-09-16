using Dashboard.Domain;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Enumerables;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Static;
using Dashboard.Domain.Variables;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using System.Net;


namespace DashboardV2.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class AuthController : BaseController
    {
        private readonly IAuthBL _authenticationBL;
        private readonly IUserBL _userBL;

        public AuthController(IAuthBL authBL, IUserBL userBL)
        {
            _authenticationBL = authBL;
            _userBL = userBL;
        }

        [AllowAnonymous]
        [HttpPost()]
        [Route("Login")]
        [ProducesResponseType(typeof(HttpResponse<string>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpResponse<string>), (int)HttpStatusCode.BadRequest)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Login([FromBody] LoginDto loginData)
        {
            try
            {
                if (AuthAttempts.isAttemptsExceeded(loginData.userName))
                {
                    return await GetResponseAsync<string?>(HttpStatusCode.BadRequest, "Ha superado el n�mero de intentos para iniciar sesi�n. Intentelo m�s tarde", null);
                }

                try
                {
                    loginData.password = Encryption.DecryptRSA(loginData.password);
                }
                catch(Exception ex)
                {
                    await EventLogger.Save(ETypeLog.Error, $"Error: la contrase�a proporcionada caus� un error al intentar ser desencriptada {ex.Message}", ex);

                    AuthAttempts.saveAttempt(loginData.userName);
                    return await GetResponseAsync<string?>(HttpStatusCode.BadRequest, "Usuario y/o contrase�a incorrecto", null);
                }

                string? token = await _authenticationBL.Login(loginData);
                if (token != null)
                {
                    await EventLogger.Save(ETypeLog.Info, $"Nuevo inicio de sesi�n {loginData.userName}");
                    AuthAttempts.restartAttempts(loginData.userName);
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, token);
                }

                AuthAttempts.saveAttempt(loginData.userName);
                return await GetResponseAsync<string?>(HttpStatusCode.BadRequest, "Usuario y/o contrase�a incorrecto", null);
            }catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}",ex);
                return await GetResponseAsync<string?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [AllowAnonymous]
        [HttpPost()]
        [Route("LoginPayPad")]
        [ProducesResponseType(typeof(HttpResponse<string>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpResponse<string>), (int)HttpStatusCode.BadRequest)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> LoginPP([FromBody] LoginDto loginData)
        {
            try
            {
                if (AuthAttempts.isAttemptsExceeded(loginData.userName))
                {
                    return await GetResponseAsync<string?>(HttpStatusCode.BadRequest, "Ha superado el n�mero de intentos para iniciar sesi�n. Intentelo m�s tarde", null);
                }

                try
                {
                    loginData.password = Encryption.DecryptRSA(loginData.password);
                }
                catch (Exception ex)
                {
                    await EventLogger.Save(ETypeLog.Error, $"Error: la contrase�a proporcionada caus� un error al intentar ser desencriptada {ex.Message}",ex);

                    AuthAttempts.saveAttempt(loginData.userName);
                    return await GetResponseAsync<string?>(HttpStatusCode.BadRequest, "Usuario y/o contrase�a incorrecto", null);
                }

                string? token = await _authenticationBL.LoginPP(loginData);
                if (token != null)
                {
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, token);
                }

                AuthAttempts.saveAttempt(loginData.userName);
                return await GetResponseAsync<string?>(HttpStatusCode.BadRequest, "Usuario y/o contrase�a incorrecto", null);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error:{ex.Message}", ex);
                return await GetResponseAsync<string?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [AllowAnonymous]
        [HttpGet()]
        [Route("Logout")]
        [ProducesResponseType(typeof(HttpResponse<bool>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpResponse<bool>), (int)HttpStatusCode.BadRequest)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Logout()
        {
            try
            {
                if (!Request.Headers.ContainsKey("Authorization"))
                {
                    throw new Exception("Es necesario el token para cerrar sesi�n.");
                }

                string? authorizationHeader = Request.Headers["Authorization"];
                if (authorizationHeader == null || !authorizationHeader.StartsWith("Bearer "))
                {
                    throw new Exception("Es necesario el token para cerrar sesi�n.");
                }

                string token = authorizationHeader.Substring("Bearer ".Length).Trim();
                if (token == null) throw new Exception("Ocurrio un problema validando el token");
                
                bool resultLogOut = await _authenticationBL.Logout(token);

                
                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, resultLogOut);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync(HttpStatusCode.BadRequest, ex.Message, false);
            }
        }

        [AllowAnonymous]
        [HttpPost()]
        [Route("VerifyPwd")]
        [ProducesResponseType(typeof(HttpResponse<bool>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpResponse<bool>), (int)HttpStatusCode.BadRequest)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> VerifyPwd([FromBody] LoginDto loginData)
        {
            try
            {
                if (AuthAttempts.isAttemptsExceeded(loginData.userName))
                {
                    return await GetResponseAsync<string?>(HttpStatusCode.BadRequest, "�Ha superado el n�mero de intentos para iniciar sesi�n. Intentelo m�s tarde", null);
                }
                
                try
                {
                    loginData.password = Encryption.DecryptRSA(loginData.password);
                }
                catch (Exception ex)
                {
                    await EventLogger.Save(ETypeLog.Error, $"Error: la contrase�a proporcionada caus� un error al intentar ser desencriptada {ex.Message}", ex);
                    AuthAttempts.saveAttempt(loginData.userName);
                    return await GetResponseAsync<string?>(HttpStatusCode.BadRequest, "Usuario y/o contrase�a incorrecto", null);
                }

                bool isCorrect = await _authenticationBL.VerifyPwd(loginData);
                if (isCorrect)
                {
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, true);
                }

                AuthAttempts.saveAttempt(loginData.userName);
                return await GetResponseAsync<bool>(HttpStatusCode.BadRequest, "Usuario y/o contrase�a incorrecto", false);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}");
                return await GetResponseAsync<bool>(HttpStatusCode.BadRequest, ex.Message, false);
            }
        }


    }
}