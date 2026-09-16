using Api_DashboardV2.Middleware;
using Dashboard.Domain;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Enumerables;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Variables;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Security.Claims;

namespace DashboardV2.Controllers
{

    public class UserController : BaseController
    {
        private readonly IUserBL _userBL;
        private readonly PermissionData _permissionData;

        public UserController(IUserBL userBL, PermissionData permissionData)
        {
            _userBL = userBL;
            _permissionData = permissionData;
        }


        [HttpGet]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<List<UserDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Get()
        {
            try
            {
                var result = await _userBL.GetAllAsync();

                if (result == null || result.Count <= 0)
                    return await GetResponseAsync<List<UserDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<List<UserDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Authorize]
        [Route("{id}")]
        [ProducesResponseType(typeof(HttpResponse<UserDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var result = await _userBL.GetByIdAsync(id);
                if (result == null) return await GetResponseAsync<UserDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<UserDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Authorize]
        [Route("Document/{document}")]
        [ProducesResponseType(typeof(HttpResponse<UserDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByDocument(string document)
        {
            try
            {
                var result = await _userBL.GetByDocumentAsync(document);
                if (result == null) return await GetResponseAsync<UserDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<UserDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }



        [HttpGet]
        [Authorize]
        [Route("Status/{status}")]
        [ProducesResponseType(typeof(HttpResponse<List<UserDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByStatus(int status)
        {
            try
            {
                var result = await _userBL.GetByStatusAsync(status);

                if (result == null || result.Count <= 0)
                    return await GetResponseAsync<List<UserDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<List<UserDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }



        [HttpGet]
        [Authorize]
        [Route("Role/{role}")]
        [ProducesResponseType(typeof(HttpResponse<List<UserDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByRole(int role)
        {
            try
            {
                var result = await _userBL.GetByRoleAsync(role);

                if (result == null || result.Count <= 0)
                    return await GetResponseAsync<List<UserDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<List<UserDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpGet]
        [Authorize]
        [Route("Name/{name}")]
        [ProducesResponseType(typeof(HttpResponse<UserDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByUserName(string name)
        {
            try
            {
                var result = await _userBL.GetByUserNameAsync(name);
                if (result == null) return await GetResponseAsync<UserDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<UserDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpPost]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<UserDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Post([FromBody] UserDto newUser)
        {
            try
            {
                try
                {
                    newUser.Pwd = Encryption.DecryptRSA(newUser.Pwd);
                }
                catch (Exception ex)
                {
                    await EventLogger.Save(ETypeLog.Error, $"Error: La contraseña proporcionada causó un error al intentar ser desencriptada {ex.Message}", newUser);
                    return await GetResponseAsync<string>(HttpStatusCode.BadRequest, "No se proporcionó contraseña", null);
                }

                var userLogged = _permissionData.UserLogged;

                var result = await _userBL.CreateAsync(newUser, userLogged.Id);

                if (result == null) return await GetResponseAsync<UserDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<UserDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpPut]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<UserDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Put([FromBody] UserDto user)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
           
                user.IdUserUpdated = userLogged.Id;
                var result = await _userBL.UpdateAsync(user, changePwd: false);

                if (result == null) 
                    return await GetResponseAsync<UserDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<UserDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpPut]
        [Authorize]
        [Route("ChangePwd")]
        [ProducesResponseType(typeof(HttpResponse<UserDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePwdDto changePwdDto)
        {
            try
            {
                if (string.IsNullOrEmpty(changePwdDto.Document) ||
                    string.IsNullOrEmpty(changePwdDto.OldPwd) ||
                    string.IsNullOrEmpty(changePwdDto.NewPwd))
                {
                    throw new Exception("Datos de formulario vacios y/o incorrectos");
                }

                try
                {
                    changePwdDto.OldPwd = Encryption.DecryptRSA(changePwdDto.OldPwd);
                    changePwdDto.NewPwd = Encryption.DecryptRSA(changePwdDto.NewPwd);
                }
                catch (Exception ex)
                {
                    await EventLogger.Save(ETypeLog.Error, $"Error: Alguna de las contraseñas proporcionadas causó un error al intentar ser desencriptada {ex.Message}", changePwdDto);
                    return await GetResponseAsync<string>(HttpStatusCode.BadRequest, "Usuario y/o contraseña invalido", null);
                }

                var user = await _userBL.GetByDocumentAsync(changePwdDto.Document);
                if (user == null) throw new Exception($"{(int)ErrorCodes.NotFound}: No se encontró resultado");

                
                var userLogged = _permissionData.UserLogged;

                var result = await _userBL.ChangePassword(user, changePwdDto, userLogged.Id);

                if (result == null) return await GetResponseAsync<UserDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<UserDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpDelete]
        [Route("{id}")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<bool>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var userToBeDeleted = await _userBL.GetByIdAsync(id);
                if (userToBeDeleted == null) throw new Exception("El usuario ya se encuentra eliminado o no existe");

                
                var wasDeleted = await _userBL.DeleteByIdAsync(id);

                if (!wasDeleted) return await GetResponseAsync<bool>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", false);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, wasDeleted);

                
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<bool>(HttpStatusCode.BadRequest, ex.Message, false);
            }
        }

        [HttpGet]
        [Route("Logged")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<UserDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetUserLogged()
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, userLogged);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<UserDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }

        }

        

    }
}