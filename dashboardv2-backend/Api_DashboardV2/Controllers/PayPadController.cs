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

    public class PayPadController : BaseController
    {
        private readonly IUserBL _userBL;
        private readonly IRoleBL _roleBL;
        private readonly IPayPadBL _paypadBL;
        private readonly PermissionData _permissionData;
        public PayPadController(IUserBL userBL, IRoleBL roleBL, IPayPadBL payPadBL, PermissionData permissionData)
        {
            _userBL = userBL;
            _roleBL = roleBL;
            _paypadBL = payPadBL;
           _permissionData = permissionData;
        }


        [HttpGet]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<List<PayPadDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Get()
        {
            try
            {
                List<PayPadDto>? result;
                if (_permissionData.UserIsAdmin)
                {
                    result = await _paypadBL.GetAllAsync();
                }
                else
                {
                    if (_permissionData?.UserLogged == null )
                        return await GetResponseAsync<List<PayPadDto>?>(HttpStatusCode.Unauthorized, $"{(int)ErrorCodes.NotAllowed}: Ocurrió un error inesperado por favor vuelve a intentarlo.", null);
                    
                    
                    result = await _paypadBL.GetByUserAsync(_permissionData.UserLogged);
                    
                }
                if (result == null || result.Count <= 0)
                    return await GetResponseAsync<List<PayPadDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
                
                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<List<PayPadDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Authorize]
        [Route("{id}")]
        [ProducesResponseType(typeof(HttpResponse<PayPadDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var result = await _paypadBL.GetByIdAsync(id);
                if (result == null) return await GetResponseAsync<PayPadDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<PayPadDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpGet]
        [Authorize]
        [Route("Status/{status}")]
        [ProducesResponseType(typeof(HttpResponse<List<PayPadDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByStatus(int status)
        {
            try
            {
                var result = await _paypadBL.GetAllAsync();

                if (result == null || result.Count <= 0)
                    return await GetResponseAsync<List<PayPadDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                result = result.Where(p => p.Status == status).ToList();

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<List<PayPadDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Authorize]
        [Route("GetStorage/{idPaypad}")]
        [ProducesResponseType(typeof(HttpResponse<List<PayPadStorageDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetPaypadStorage(int idPaypad)
        {
            try
            {
                var result = await _paypadBL.GetStorageByIdPaypadAsync(idPaypad);

                if (result == null || result.Count <= 0)
                    return await GetResponseAsync<List<PayPadStorageDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<List<PayPadDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpPost]
        [Authorize]
        [Route("CreateStorage")]
        [ProducesResponseType(typeof(HttpResponse<PayPadStorageDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> PostStorage([FromBody] List<PayPadStorageDto> newPaypadStorages)
        {
            try
            {
                var result = await _paypadBL.CreateStorageAsync(newPaypadStorages);

                if (result == null || result.Count <= 0) return await GetResponseAsync<PayPadStorageDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<PayPadStorageDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpPost]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<PayPadDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Post([FromBody] PayPadDto newPaypad)
        {
            try
            {
                try
                {
                    newPaypad.Pwd = Encryption.DecryptRSA(newPaypad.Pwd);
                }
                catch (Exception ex)
                {
                    await EventLogger.Save(ETypeLog.Error, $"Error: la constraseña proporcionada causó un error al intentar ser desencriptada {ex.Message}", newPaypad);
                    return await GetResponseAsync<string>(HttpStatusCode.BadRequest, "No se proporcionó contraseña", null);
                }

                var userLogged = _permissionData.UserLogged;

                var result = await _paypadBL.CreateAsync(newPaypad, userLogged.Id);

                if (result == null) return await GetResponseAsync<PayPadDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<PayPadDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpPut]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<PayPadDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Put([FromBody] PayPadDto paypad)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
           
                paypad.IdUserUpdated = userLogged.Id;
                var result = await _paypadBL.UpdateAsync(paypad, changePwd: false);

                if (result == null) return await GetResponseAsync<PayPadDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<PayPadDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpPut]
        [Authorize]
        [Route("ChangePwd")]
        [ProducesResponseType(typeof(HttpResponse<PayPadDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpResponse<PayPadDto>), (int)HttpStatusCode.BadRequest)]
        [ProducesResponseType(typeof(HttpResponse<PayPadDto>), (int)HttpStatusCode.NotFound)]
        [ProducesResponseType(typeof(HttpResponse<PayPadDto>), (int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePwdDto changePwdDto)
        {
            try
            {
                if (string.IsNullOrEmpty(changePwdDto.Document) ||
                    string.IsNullOrEmpty(changePwdDto.OldPwd) ||
                    string.IsNullOrEmpty(changePwdDto.NewPwd))
                {
                    throw new Exception("Datos de cambio de contraseña vacios y/o incorrectos");
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

                var paypad = await _paypadBL.GetByIdAsync(Convert.ToInt32(changePwdDto.Document));
                if (paypad == null) throw new Exception($"{(int)ErrorCodes.NotFound}: No se encontró el recurso solicitado");

                
                var userLogged = _permissionData?.UserLogged;
                if (_permissionData == null || userLogged == null)
                    return await GetResponseAsync<List<PayPadDto>?>(HttpStatusCode.Unauthorized, $"{(int)ErrorCodes.NotAllowed}: Ocurrió un error inesperado por favor vuelve a intentarlo.", null);

                PayPadDto? result;
                if (_permissionData.UserIsAdmin)
                {
                    result = await _paypadBL.ChangePassword(paypad, changePwdDto, userLogged.Id);
                }
                else
                {
                    var paypadsUserIds = (await _paypadBL.GetByUserAsync(userLogged))?.Select(p => p.Id).ToList();
                    if (paypadsUserIds != null && paypadsUserIds.Count > 0)
                    {
                        if(!paypadsUserIds.Contains(paypad.Id))
                            return await GetResponseAsync<RoleDto?>(HttpStatusCode.Unauthorized, $"{(int)ErrorCodes.NotAllowed}: No tiene permisos para modificar este recurso", null);
                        
                        result = await _paypadBL.ChangePassword(paypad, changePwdDto, userLogged.Id);

                    }
                    else result = null;
                    
                }
                

                if (result == null) return await GetResponseAsync<PayPadDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró el recurso solicitado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<PayPadDto?>(HttpStatusCode.BadRequest, ex.Message, null);
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
                var wasDeleted = await _paypadBL.DeleteByIdAsync(id);

                if (!wasDeleted) return await GetResponseAsync<bool>(HttpStatusCode.InternalServerError, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", false);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, wasDeleted);

            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<bool>(HttpStatusCode.BadRequest, ex.Message, false);
            }
        }

        // Controlador solo accesible por los paypads
        [HttpGet]
        [Authorize]
        [Route("Validate")]
        [ProducesResponseType(typeof(HttpResponse<Tuple<string,bool>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> ValidatePayPad()
        {
            try
            {
                var paypadLogged = _permissionData.PayPadLogged;

                var result = await _paypadBL.ValidatePayPadAsync(paypadLogged.Id);

                if (result == null) throw new Exception("No se obtuvo resuesta de la validación");

                return await GetResponseAsync(HttpStatusCode.OK, result.Item1, result.Item2);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<string>(HttpStatusCode.BadRequest, ex.Message, "");
            }
        }


        [HttpPost]
        [Authorize]
        [Route("CreateConfiguration")]
        [ProducesResponseType(typeof(HttpResponse<PayPadConfigurationDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> CreateConfiguration([FromBody] PayPadConfigurationDto newPaypad)
        {
            try
            {

                var userLogged = _permissionData.UserLogged;
                newPaypad.IdUserCreated = userLogged.Id;

                var result = await _paypadBL.CreateConfigurationAsync(newPaypad);

                if (result == null) return await GetResponseAsync<PayPadConfigurationDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<PayPadConfigurationDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpPut]
        [Authorize]
        [Route("UpdateConfiguration")]
        [ProducesResponseType(typeof(HttpResponse<PayPadConfigurationDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> UpdateConfiguration([FromBody] PayPadConfigurationDto paypadConfiguration)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;

                paypadConfiguration.IdUserUpdated = userLogged.Id;
                var result = await _paypadBL.UpdateConfigurationAsync(paypadConfiguration);

                if (result == null) return await GetResponseAsync<PayPadConfigurationDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<PayPadConfigurationDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpGet]
        [Authorize]
        [Route("GetConfiguration/{idPaypad}")]
        [ProducesResponseType(typeof(HttpResponse<PayPadConfigurationDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetConfiguration(int idPaypad)
        {
            try
            {
                var result = await _paypadBL.GetConfigurationByPaypadId(idPaypad);
                if (result == null) return await GetResponseAsync<PayPadConfigurationDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<PayPadConfigurationDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

    }
}