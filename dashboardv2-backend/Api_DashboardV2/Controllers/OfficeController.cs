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

    public class OfficeController : BaseController
    {
        private readonly IRoleBL _roleBL;
        private readonly IUserBL _userBL;
        private readonly IClientBL _clientBL;
        private readonly IOfficeBL _officeBL;
        private readonly PermissionData _permissionData;

        public OfficeController(IRoleBL roleBL, IUserBL userBL, IOfficeBL officeBL, IClientBL clientBL, PermissionData permissionData)
        {
            _roleBL = roleBL;
            _userBL = userBL;
            _officeBL = officeBL;
            _clientBL = clientBL;
            _permissionData = permissionData;
        }


        [HttpGet]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<List<OfficeDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Get()
        {
            try
            {
                var result = await _officeBL.GetAllAsync();

                if (result != null && result.Count > 0)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<List<OfficeDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<List<OfficeDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpGet]
        [Authorize]
        [Route("{id}")]
        [ProducesResponseType(typeof(HttpResponse<OfficeDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var result = await _officeBL.GetByIdAsync(id);

                if (result != null )
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<OfficeDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<OfficeDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Authorize]
        [Route("Client/{idClient}")]
        [ProducesResponseType(typeof(HttpResponse<List<OfficeDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByClient(int idClient)
        {
            try
            {
                var result = await _officeBL.GetByClientAsync(idClient);

                if (result != null && result.Count > 0)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<List<OfficeDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<List<OfficeDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpPost]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<OfficeDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Post([FromBody] OfficeDto newClient)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{(int)ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");

                var result = await _officeBL.CreateAsync(newClient, userLogged.Id);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<OfficeDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<OfficeDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpPut]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<OfficeDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Put([FromBody] OfficeDto client)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{(int)ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");

                client.IdUserUpdated = userLogged.Id;
                var result = await _officeBL.UpdateAsync(client);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<OfficeDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<OfficeDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpDelete]
        [Route("{id}")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<bool>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpResponse<bool>), (int)HttpStatusCode.BadRequest)]
        [ProducesResponseType(typeof(HttpResponse<bool>), (int)HttpStatusCode.NotFound)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var result = await _officeBL.DeleteByIdAsync(id);

                if (result != false)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<bool>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", false);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<bool>(HttpStatusCode.BadRequest, ex.Message, false);
            }
        }
    }
}