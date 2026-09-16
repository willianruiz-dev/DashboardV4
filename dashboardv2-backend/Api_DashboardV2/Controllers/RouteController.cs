using Api_DashboardV2.Middleware;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Enumerables;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Variables;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Server.IIS.Core;
using System.Net;
using System.Security.Claims;

namespace DashboardV2.Controllers
{

    public class RouteController : BaseController
    {
        private readonly IRoleBL _roleBL;
        private readonly IUserBL _userBL;
        private readonly IRouteBL _routeBL;
        private readonly PermissionData _permissionData;

        public RouteController(IRoleBL roleBL, IUserBL userBL, IRouteBL routeBL, PermissionData permissionData)
        {
            _roleBL = roleBL;
            _userBL = userBL;
            _routeBL = routeBL;
            _permissionData = permissionData;
        }


        [HttpGet]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<List<RouteDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Get()
        {
            try
            {
                var result = await _routeBL.GetAllAsync();

                if (result != null && result.Count > 0)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<List<RouteDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<List<RouteDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Route("Logged")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<List<Route>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetLoggedRoutes()
        {
            try
            {
                var role = _permissionData.RoleLogged;
                var userRoutes = role.Routes;

                if (userRoutes != null && userRoutes.Count > 0)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, userRoutes);

                return await GetResponseAsync<List<RouteDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<List<RouteDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpGet]
        [Authorize]
        [Route("{id}")]
        [ProducesResponseType(typeof(HttpResponse<RouteDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var result = await _routeBL.GetByIdAsync(id);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<RouteDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<RouteDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpPost]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<RouteDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Post([FromBody] RouteDto newRoute)
        {
            try
            {

                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");

                var result = await _routeBL.CreateAsync(newRoute, userLogged.Id);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<RouteDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<RouteDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpPut]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<RouteDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Put([FromBody] RouteDto route)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");

                route.IdUserUpdated = userLogged.Id;
                var result = await _routeBL.UpdateAsync(route);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<RouteDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<RouteDto?>(HttpStatusCode.BadRequest, ex.Message, null);
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
                var result = await _routeBL.DeleteByIdAsync(id);

                if (result != false)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<bool>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", false);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<bool>(HttpStatusCode.BadRequest, ex.Message, false);
            }
        }
    }
}