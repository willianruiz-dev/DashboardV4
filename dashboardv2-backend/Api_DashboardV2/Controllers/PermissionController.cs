using Api_DashboardV2.Middleware;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Enumerables;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Variables;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;

namespace DashboardV2.Controllers
{

    public class PermissionController : BaseController
    {
        private readonly IPermissionBL _permissionBL;
        private readonly PermissionData _permissionData;

        public PermissionController(IPermissionBL permissionBL, PermissionData permissionData)
        {
            _permissionBL = permissionBL;
            _permissionData = permissionData;
        }


        [HttpGet]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<List<PermissionDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Get()
        {
            try
            {
                var result = await _permissionBL.GetAllAsync();

                if (result != null && result.Count > 0)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<List<PermissionDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<List<PermissionDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        

        [HttpGet]
        [Authorize]
        [Route("{id}")]
        [ProducesResponseType(typeof(HttpResponse<PermissionDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var result = await _permissionBL.GetByIdAsync(id);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<PermissionDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<PermissionDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

       
    }
}