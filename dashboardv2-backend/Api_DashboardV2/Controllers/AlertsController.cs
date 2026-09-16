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

    public class AlertsController : BaseController
    {
        
        private readonly ISubscriptionBL _subscriptionBL;
        private readonly PermissionData _permissionData;

        public AlertsController(ISubscriptionBL subscriptionBL, PermissionData permissionData)
        {
            _subscriptionBL = subscriptionBL;
            _permissionData = permissionData;
        }


        [HttpGet]
        [Route("Subscription")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<List<SubscriptionDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetSubs()
        {
            try
            {
                var result = await _subscriptionBL.GetAllAsync();

                if (result == null || result.Count <= 0)
                    return await GetResponseAsync<List<SubscriptionDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);



                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

            }
            catch (Exception ex)
            {
                return await GetResponseAsync<List<SubscriptionDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        

        [HttpGet]
        [Authorize]
        [Route("Subscription/{id}")]
        [ProducesResponseType(typeof(HttpResponse<SubscriptionDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByIdSubscription(int id)
        {
            try
            {
                var result = await _subscriptionBL.GetByIdAsync(id);
                if (result == null) return await GetResponseAsync<SubscriptionDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                
                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<SubscriptionDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Authorize]
        [Route("Subscription/GetByPayPad/{idPayPad}")]
        [ProducesResponseType(typeof(HttpResponse<List<SubscriptionDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByIdPayPad(int idPayPad)
        {
            try
            {
                var result = await _subscriptionBL.GetByIdPaypadAsync(idPayPad);
                if (result == null) return await GetResponseAsync<List<SubscriptionDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);


                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<List<SubscriptionDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }



        [HttpPost]
        [Route("Subscription")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<SubscriptionDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Post([FromBody] SubscriptionDto newSubscription)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");
                
                newSubscription.IdUserCreated = userLogged.Id;
                var result = await _subscriptionBL.CreateAsync(newSubscription);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<SubscriptionDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<SubscriptionDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

       

        [HttpPut]
        [Route("Subscription")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<SubscriptionDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Put([FromBody] SubscriptionDto subscription)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");

                subscription.IdUserUpdated = userLogged.Id;
                var result = await _subscriptionBL.UpdateAsync(subscription);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<SubscriptionDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<SubscriptionDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }



        [HttpDelete]
        [Route("Subscription/{id}")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<bool>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> DeleteSubscription(int id)
        {
            try
            {
                var result = await _subscriptionBL.DeleteByIdAsync(id);

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