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

    public class LoadController : BaseController
    {
        private readonly PermissionData _permissionData;
        private readonly ILoadBL _loadBL;
        public LoadController(PermissionData permissionData, ILoadBL loadBL)
        {
            _permissionData = permissionData;
            _loadBL = loadBL;
        }


        [HttpGet]
        [Authorize]
        [Route("GetByPaypad/{idPaypad}")]
        [ProducesResponseType(typeof(HttpResponse<List<LoadDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpResponse<List<LoadDto>>), (int)HttpStatusCode.BadRequest)]
        [ProducesResponseType(typeof(HttpResponse<List<LoadDto>>), (int)HttpStatusCode.NotFound)]
        [ProducesResponseType(typeof(HttpResponse<List<LoadDto>>), (int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByIdPaypad(int idPaypad)
        {
            try
            {
                var result = await _loadBL.GetByPaypadAsync(idPaypad);
                if (result == null || result.Count <= 0)
                    return await GetResponseAsync<List<LoadDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
                
                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<List<LoadDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Authorize]
        [Route("{idLoad}")]
        [ProducesResponseType(typeof(HttpResponse<LoadDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpResponse<LoadDto>), (int)HttpStatusCode.BadRequest)]
        [ProducesResponseType(typeof(HttpResponse<LoadDto>), (int)HttpStatusCode.NotFound)]
        [ProducesResponseType(typeof(HttpResponse<LoadDto>), (int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByLoadId(int idLoad)
        {
            try
            {
                var result = await _loadBL.GetByIdAsync(idLoad);
                if (result == null) return await GetResponseAsync<LoadDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<LoadDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        

        [HttpPost]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<LoadDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpResponse<LoadDto>), (int)HttpStatusCode.BadRequest)]
        [ProducesResponseType(typeof(HttpResponse<LoadDto>), (int)HttpStatusCode.NotFound)]
        [ProducesResponseType(typeof(HttpResponse<LoadDto>), (int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Post([FromBody] LoadDto newLoad)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;

                newLoad.IdUserCreated = userLogged.Id;
                var result = await _loadBL.CreateAsync(newLoad);


                if (result == null) return await GetResponseAsync<LoadDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<LoadDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

    }
}