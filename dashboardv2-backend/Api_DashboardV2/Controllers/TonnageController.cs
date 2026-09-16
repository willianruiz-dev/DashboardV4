using Api_DashboardV2.Middleware;
using Dashboard.Domain;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities;
using Dashboard.Domain.Enumerables;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Variables;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Net;
using System.Security.Claims;

namespace DashboardV2.Controllers
{

    public class TonnageController : BaseController
    {
        
        private readonly ITonnageBL _tonnageBL;
        private readonly PermissionData _permissionData;
        public TonnageController(ITonnageBL tonnageBL, PermissionData permissionData)
        {
            _permissionData = permissionData;
            _tonnageBL = tonnageBL;
        }


        [HttpGet]
        [Authorize]
        [Route("GetByPaypad/{idPaypad}")]
        [ProducesResponseType(typeof(HttpResponse<List<TonnageDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByIdPaypad(int idPaypad)
        {
            try
            {
                var result = await _tonnageBL.GetByPaypadAsync(idPaypad);
                if (result == null || result.Count <= 0)
                    return await GetResponseAsync<List<TonnageDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
                
                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<List<TonnageDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Authorize]
        [Route("{idTonnage}")]
        [ProducesResponseType(typeof(HttpResponse<TonnageDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpResponse<TonnageDto>), (int)HttpStatusCode.BadRequest)]
        [ProducesResponseType(typeof(HttpResponse<TonnageDto>), (int)HttpStatusCode.NotFound)]
        [ProducesResponseType(typeof(HttpResponse<TonnageDto>), (int)HttpStatusCode.Unauthorized)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByTonnageId(int idTonnage)
        {
            try
            {
                var result = await _tonnageBL.GetByIdAsync(idTonnage);
                if (result == null) 
                    return await GetResponseAsync<TonnageDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<TonnageDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        

        [HttpPost]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<TonnageDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Post([FromBody] TonnageDto newTonnage)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;

                newTonnage.IdUserCreated = userLogged.Id;
                var result = await _tonnageBL.CreateAsync(newTonnage);


                if (result == null) return await GetResponseAsync<TonnageDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return await GetResponseAsync<TonnageDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

    }
}