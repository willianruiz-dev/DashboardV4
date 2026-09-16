using Api_DashboardV2.Middleware;
using Dashboard.Application;
using Dashboard.Application.BL;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities;
using Dashboard.Domain.Enumerables;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Variables;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Security.Claims;

namespace DashboardV2.Controllers
{

    public class MastersController : BaseController
    {
        
        private readonly IMastersBL<CurrencyDto> _currencyBL;
        private readonly IMastersBL<TypeDocumentDto> _typeDocumentBL;
        private readonly IMastersBL<RegionDto> _regionBL;
        private readonly IMastersBL<CurrencyDenominationDto> _currencyDenomBL;
        private readonly PermissionData _permissionData;

        public MastersController(IMastersBL<CurrencyDto> currencyBL,IMastersBL<TypeDocumentDto> typeDocumentBL,
            IMastersBL<RegionDto> regionBL, IMastersBL<CurrencyDenominationDto> currencyDenomBL,
            PermissionData permissionData)
        {
            
            _currencyBL = currencyBL;
            _typeDocumentBL = typeDocumentBL;
            _regionBL = regionBL;
            _currencyDenomBL = currencyDenomBL;
            _permissionData = permissionData;
        }


        [HttpGet]
        [Route("Currency")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<List<CurrencyDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetCurrencies()
        {
            try
            {
                var result = await _currencyBL.GetAllAsync();

                if (result == null || result.Count <= 0)
                    return await GetResponseAsync<List<CurrencyDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);



                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

            }
            catch (Exception ex)
            {
                return await GetResponseAsync<List<CurrencyDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Route("TypeDocument")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<List<TypeDocumentDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetTypeDocument()
        {
            try
            {
                var result = await _typeDocumentBL.GetAllAsync();

                if (result == null || result.Count <= 0)
                    return await GetResponseAsync<List<TypeDocumentDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);



                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

            }
            catch (Exception ex)
            {
                return await GetResponseAsync<List<TypeDocumentDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Route("Region")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<List<RegionDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetRegion()
        {
            try
            {
                var result = await _regionBL.GetAllAsync();

                if (result == null || result.Count <= 0)
                    return await GetResponseAsync<List<RegionDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);



                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

            }
            catch (Exception ex)
            {
                return await GetResponseAsync<List<RegionDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Route("CurrencyDenomination")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<List<CurrencyDenominationDto>>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetCurrencyDenomination()
        {
            try
            {
                var result = await _currencyDenomBL.GetAllAsync();

                if (result == null || result.Count <= 0)
                    return await GetResponseAsync<List<CurrencyDenominationDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);



                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

            }
            catch (Exception ex)
            {
                return await GetResponseAsync<List<CurrencyDenominationDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Authorize]
        [Route("Currency/{id}")]
        [ProducesResponseType(typeof(HttpResponse<CurrencyDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByIdCurrency(int id)
        {
            try
            {
                var result = await _currencyBL.GetByIdAsync(id);
                if (result == null) return await GetResponseAsync<CurrencyDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

                
                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<CurrencyDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Authorize]
        [Route("TypeDocument/{id}")]
        [ProducesResponseType(typeof(HttpResponse<TypeDocumentDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByIdTypeDocument(int id)
        {
            try
            {  
                var result = await _typeDocumentBL.GetByIdAsync(id);
                if (result == null) return await GetResponseAsync<TypeDocumentDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);


                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<TypeDocumentDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Authorize]
        [Route("Region/{id}")]
        [ProducesResponseType(typeof(HttpResponse<RegionDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByIdRegion(int id)
        {
            try
            {
                var result = await _regionBL.GetByIdAsync(id);
                if (result == null) return await GetResponseAsync<RegionDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);


                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<RegionDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpGet]
        [Authorize]
        [Route("CurrencyDenomination/{id}")]
        [ProducesResponseType(typeof(HttpResponse<CurrencyDenominationDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> GetByIdCurrencyDenomination(int id)
        {
            try
            {
                var result = await _currencyDenomBL.GetByIdAsync(id);
                if (result == null) return await GetResponseAsync<CurrencyDenominationDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);


                return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<CurrencyDenominationDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpPost]
        [Route("Currency")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<CurrencyDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Post([FromBody] CurrencyDto newCurrency)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");
                
                newCurrency.IdUserCreated = userLogged.Id;
                var result = await _currencyBL.CreateAsync(newCurrency);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<CurrencyDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<CurrencyDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpPost]
        [Route("TypeDocument")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<TypeDocumentDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Post([FromBody] TypeDocumentDto newTypeDocument)
        {
            try
            {

                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");

                newTypeDocument.IdUserCreated = userLogged.Id;
                var result = await _typeDocumentBL.CreateAsync(newTypeDocument);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<TypeDocumentDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<TypeDocumentDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpPost]
        [Route("Region")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<RegionDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Post([FromBody] RegionDto newRegion)
        {
            try
            {
                
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");

                newRegion.IdUserCreated = userLogged.Id;
                var result = await _regionBL.CreateAsync(newRegion);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<RegionDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<RegionDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpPost]
        [Route("CurrencyDenomination")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<CurrencyDenominationDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Post([FromBody] CurrencyDenominationDto newCurrencyDenom)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");

                newCurrencyDenom.IdUserCreated = userLogged.Id;

                SaveCurrencyDenominationImg(ref newCurrencyDenom);

                var result = await _currencyDenomBL.CreateAsync(newCurrencyDenom);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<CurrencyDenominationDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<CurrencyDenominationDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpPut]
        [Route("Currency")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<CurrencyDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Put([FromBody] CurrencyDto currency)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");

                currency.IdUserUpdated = userLogged.Id;
                var result = await _currencyBL.UpdateAsync(currency);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<CurrencyDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<CurrencyDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpPut]
        [Route("TypeDocument")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<TypeDocumentDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Put([FromBody] TypeDocumentDto typeDoc)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");

                typeDoc.IdUserUpdated = userLogged.Id;
                var result = await _typeDocumentBL.UpdateAsync(typeDoc);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<TypeDocumentDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<TypeDocumentDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpPut]
        [Route("Region")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<RegionDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Put([FromBody] RegionDto region)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");

                region.IdUserUpdated = userLogged.Id;
                var result = await _regionBL.UpdateAsync(region);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<RegionDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<RegionDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpPut]
        [Route("CurrencyDenomination")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<CurrencyDenominationDto>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> Put([FromBody] CurrencyDenominationDto currencyDenom)
        {
            try
            {
                var userLogged = _permissionData.UserLogged;
                if (userLogged == null) throw new Exception($"{ErrorCodes.UserLoggedNotExists}: El usuario loggeado ya no se encuentra en la base de datos");

                currencyDenom.IdUserUpdated = userLogged.Id;

                if (currencyDenom.ImgList != null && currencyDenom.ImgList.Count != 0) SaveCurrencyDenominationImg(ref currencyDenom);

                var result = await _currencyDenomBL.UpdateAsync(currencyDenom);

                if (result != null)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<CurrencyDenominationDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<CurrencyDenominationDto?>(HttpStatusCode.BadRequest, ex.Message, null);
            }
        }

        [HttpDelete]
        [Route("Currency/{id}")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<bool>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> DeleteCurrency(int id)
        {
            try
            {
                var result = await _currencyBL.DeleteByIdAsync(id);

                if (result != false)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<bool>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", false);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<bool>(HttpStatusCode.BadRequest, ex.Message, false);
            }
        }

        [HttpDelete]
        [Route("TypeDocument/{id}")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<bool>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> DeleteTypeDocument(int id)
        {
            try
            {
                var result = await _typeDocumentBL.DeleteByIdAsync(id);

                if (result != false)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<bool>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", false);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<bool>(HttpStatusCode.BadRequest, ex.Message, false);
            }
        }

        [HttpDelete]
        [Route("Region/{id}")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<bool>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> DeleteRegion(int id)
        {
            try
            {
                var result = await _regionBL.DeleteByIdAsync(id);

                if (result != false)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<bool>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", false);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<bool>(HttpStatusCode.BadRequest, ex.Message, false);
            }
        }

        [HttpDelete]
        [Route("CurrencyDenomination/{id}")]
        [Authorize]
        [ProducesResponseType(typeof(HttpResponse<bool>), (int)HttpStatusCode.OK)]
        [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
        public async Task<IActionResult> DeleteCurrencyDenomination(int id)
        {
            try
            {
                var result = await _currencyDenomBL.DeleteByIdAsync(id);

                if (result != false)
                    return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

                return await GetResponseAsync<bool>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", false);
            }
            catch (Exception ex)
            {
                return await GetResponseAsync<bool>(HttpStatusCode.BadRequest, ex.Message, false);
            }
        }

        private void SaveCurrencyDenominationImg(ref CurrencyDenominationDto currencyDenomination)
        {
            string imgPath = @"images\denominations";
            switch (currencyDenomination.IdCurrency)
            {
                case 1:
                    imgPath = Path.Combine(imgPath, "COP");
                    break;
                case 2:
                    imgPath = Path.Combine(imgPath, "MXN");
                    break;
                case 3:
                    imgPath = Path.Combine(imgPath, "USD");
                    break;
            }
            imgPath = Path.Combine(imgPath, $"{currencyDenomination.Value}.{currencyDenomination.ImgExt}");
            currencyDenomination.Img = "/"+imgPath.Replace('\\','/');
            ImageAdmin.SaveStaticImage(imgPath, currencyDenomination.ImgList.ToArray());
        }
    }
}