using Api_DashboardV2.Middleware;
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

    public class RoleController : BaseController
    {
        private readonly IRoleBL _roleBL;
        private readonly PermissionData _permissionData;

        public RoleController(IRoleBL roleBL, PermissionData permissionData)
        {
            _roleBL = roleBL;
            _permissionData = permissionData;
        }


        [HttpGet]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<List<RoleDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Get()
        {
            try
            {
                var result = await _roleBL.GetAllAsync();

                if (result != null && result.Count > 0)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<List<RoleDto>?>(HttpStatusCode.NotFound, "No se encontró resultado", null);
            }catch(Exception ex)
            {
                return await GetResponseAsync<List<RoleDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Authorize]
        [Route("{id}")]
        [ProducesResponseType(typeof(HttpResponse<RoleDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                
                var result = await _roleBL.GetByIdAsync(id);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<RoleDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<RoleDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpPost]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<RoleDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Post([FromBody] RoleDto newRole)
        {
            try
            {
                
                var userLogged = _permissionData.UserLogged;

                var result = await _roleBL.CreateAsync(newRole, userLogged.Id);
                

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<RoleDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<RoleDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }


        [HttpPut]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<RoleDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Put([FromBody] RoleDto role)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");


                role.IdUserUpdated = userLogged.Id; 
                var result = await _roleBL.UpdateAsync(role);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<RoleDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("ERROR_DB"))
                {
                    return await GetResponseAsync<bool>(HttpStatusCode.BadRequest, "Error actualizando el recurso, posiblemente debido a una restricción en el modelo de datos", false);
                }
                return await GetResponseAsync<RoleDto?>(HttpStatusCode.BadRequest, ex.Message, null);
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
                var result = await _roleBL.DeleteByIdAsync(id);

                if (result != false)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<bool>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", false);
            }
            catch(Exception ex)
            {
                if (ex.Message.Contains("ERROR_DB"))
                {
                    return await GetResponseAsync<bool>(HttpStatusCode.BadRequest, 
                        "Error eliminando el recurso, posiblemente debido a una restricción en el modelo de datos. Recuerde eliminar antes los usuarios y rutas relacionados a este rol.", 
                        false);
                }
                return await GetResponseAsync<bool>(HttpStatusCode.BadRequest, ex.Message, false);
            }
        }

        

       
    }
}