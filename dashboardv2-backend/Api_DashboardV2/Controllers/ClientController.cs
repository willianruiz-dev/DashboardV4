using Api_DashboardV2.Middleware;
using Dashboard.Domain;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Enumerables;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Variables;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;

namespace DashboardV2.Controllers
{

    public class ClientController : BaseController
    {
        private readonly PermissionData _permissionData;
        private readonly IUserBL _userBL;
        private readonly IClientBL _clientBL;

        public ClientController( IUserBL userBL, IClientBL clientBL,PermissionData permissionData)
        {
            
            _userBL = userBL;
            _clientBL = clientBL;
            _permissionData = permissionData;
        }


        [HttpGet]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<List<ClientDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Get()
        {
            try
            {
                var result = await _clientBL.GetAllAsync();

                if (result != null && result.Count > 0)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<List<ClientDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<List<ClientDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpGet]
        [Authorize]
        [Route("{id}")]
        [ProducesResponseType(typeof(HttpResponse<ClientDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var result = await _clientBL.GetByIdAsync(id);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<ClientDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<ClientDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpPost]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<ClientDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Post([FromBody] ClientDto newClient)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{(int)ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");

                var result = await _clientBL.CreateAsync(newClient, userLogged.Id);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<ClientDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<ClientDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpPut]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<ClientDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Put([FromBody] ClientDto client)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{(int)ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");

                client.IdUserUpdated = userLogged.Id;
                var result = await _clientBL.UpdateAsync(client);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<ClientDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<ClientDto?>(HttpStatusCode.BadRequest, ex.Message, null);
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
                var result = await _clientBL.DeleteByIdAsync(id);

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