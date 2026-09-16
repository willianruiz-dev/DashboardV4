using Api_DashboardV2.Middleware;
using Dashboard.Application;
using Dashboard.Application.BL;
using Dashboard.Domain;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.DTOs.Business;
using Dashboard.Domain.Entities;
using Dashboard.Domain.Entities.Business;
using Dashboard.Domain.Enumerables;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Variables;
using FluentFTP;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using OfficeOpenXml.Drawing.Chart;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Text;

namespace DashboardV2.Controllers;


public class TransactionController : BaseController
{

    private readonly ITransactionBL _transactionBL;
    private readonly PermissionData _permissionData;
    private readonly IConfiguration _config;
    private readonly IPayPadBL _paypadBL;

    public TransactionController(ITransactionBL transactionBL, PermissionData permissionData, IPayPadBL paypadBL, IConfiguration config)
    {

        _transactionBL = transactionBL;
        _permissionData = permissionData;
        _paypadBL = paypadBL;
        _config = config;
    }


    [HttpGet]
    //[Authorize]
    [ProducesResponseType(typeof(HttpResponse<List<TransactionDto>>), (int)HttpStatusCode.OK)]
    [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
    public async Task<IActionResult> Get()
    {
        try
        {
            var result = await _transactionBL.GetAllAsync();

            if (result == null || result.Count <= 0)
                return await GetResponseAsync<List<TransactionDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);
            return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<List<TransactionDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }

    [HttpGet]
    //[Authorize]
    [Route("Paypad/{idTransaction}")]
    [ProducesResponseType(typeof(HttpResponse<TransactionDto>), (int)HttpStatusCode.OK)]
    [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
    public async Task<IActionResult> GetById(int idTransaction)
    {
        try
        {
            var paypadLogged = _permissionData.PayPadLogged;
            var result = await _transactionBL.GetByIdAsync(idTransaction);
            if (result == null) return await GetResponseAsync<TransactionDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

            return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<TransactionDto?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }

    [HttpGet]
    //[Authorize]
    [Route("{idPaypad}")]
    [ProducesResponseType(typeof(HttpResponse<TransactionDto>), (int)HttpStatusCode.OK)]
    [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
    public async Task<IActionResult> GetByPaypad(int idPaypad)
    {
        try
        {
            var result = await _transactionBL.GetByPaypadAsync(idPaypad);
            if (result == null) return await GetResponseAsync<TransactionDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

            return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<TransactionDto?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }


    [HttpPost]
    //[Authorize]
    [Route("GetByDate")]
    [ProducesResponseType(typeof(HttpResponse<List<TransactionDto>>), (int)HttpStatusCode.OK)]
    [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
    public async Task<IActionResult> GetByDate([FromBody] DateRangeDto dateRange)
    {
        try
        {
            if (string.IsNullOrEmpty(dateRange.from) || string.IsNullOrEmpty(dateRange.to))
            {
                throw new Exception("No se proporcionó rango de fecha");
            }

            DateTime fromDate = DateTime.ParseExact(dateRange.from, "yyyy-MM-ddTHH:mm:ss.fffZ", null);
            DateTime toDate = DateTime.ParseExact(dateRange.to, "yyyy-MM-ddTHH:mm:ss.fffZ", null);

            var result = await _transactionBL.GetByPaypadAndDateAsync(dateRange.id, fromDate, toDate);

            if (result == null || result.Count <= 0)
                return await GetResponseAsync<List<TransactionDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);


            return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<List<TransactionDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }

    [HttpPost]
    //[Authorize]
    [Route("Paypad")]
    [ProducesResponseType(typeof(HttpResponse<TransactionDto>), (int)HttpStatusCode.OK)]
    [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
    public async Task<IActionResult> Post([FromBody] TransactionDto newTransaction)
    {
        try
        {
            var paypadLogged = _permissionData.PayPadLogged;

            newTransaction.IdPayPad = paypadLogged.Id;
            var result = await _transactionBL.CreateAsync(newTransaction);

            if (result == null) return await GetResponseAsync<TransactionDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

            return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<TransactionDto?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }


    [HttpPut]
    //[Authorize]
    [Route("Paypad")]
    [ProducesResponseType(typeof(HttpResponse<TransactionDto>), (int)HttpStatusCode.OK)]
    [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
    public async Task<IActionResult> Put([FromBody] TransactionDto transaction)
    {
        try
        {
            var paypadLogged = _permissionData.PayPadLogged;
            transaction.IdPayPad = paypadLogged.Id;
            var result = await _transactionBL.UpdateAsync(transaction);

            if (result == null) return await GetResponseAsync<TransactionDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

            return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<TransactionDto?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }

    // ==============================================================================================================================================================================//

    [HttpGet]
    //[Authorize]
    [Route("{idTransaction}/Details")]
    [ProducesResponseType(typeof(HttpResponse<List<TransactionDetailDto>>), (int)HttpStatusCode.OK)]
    [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
    public async Task<IActionResult> GetDetailsByIdTransaction(int idTransaction)
    {
        try
        {
            var result = await _transactionBL.GetDetailsByIdTranAsync(idTransaction);

            if (result == null || result.Count <= 0)
                return await GetResponseAsync<List<TransactionDetailDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);



            return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<List<TransactionDetailDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }

    [HttpGet]
    //[Authorize]
    [Route("Paypad/Details/{idDetail}")]
    [ProducesResponseType(typeof(HttpResponse<List<TransactionDetailDto>>), (int)HttpStatusCode.OK)]
    [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
    public async Task<IActionResult> GetDetailById(int idDetail)
    {
        try
        {
            var paypadLogged = _permissionData?.PayPadLogged;
            if (paypadLogged == null)
                return await GetResponseAsync<List<TransactionDetailDto>?>(HttpStatusCode.Unauthorized, $"{(int)ErrorCodes.NotAllowed}: No se encontró paypad", null);

            var result = await _transactionBL.GetDetailByIdAsync(idDetail);

            if (result == null)
                return await GetResponseAsync<List<TransactionDetailDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);



            return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<List<TransactionDetailDto>?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }

    [HttpPost]
    //[Authorize]
    [Route("Paypad/Details")]
    [ProducesResponseType(typeof(HttpResponse<TransactionDetailDto>), (int)HttpStatusCode.OK)]
    [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
    public async Task<IActionResult> PostDetail([FromBody] TransactionDetailDto newTransactionDetail)
    {
        try
        {
            var paypadLogged = _permissionData?.PayPadLogged;
            if (paypadLogged == null)
                return await GetResponseAsync<TransactionDetailDto?>(HttpStatusCode.Unauthorized, $"{(int)ErrorCodes.NotAllowed}: No se encontró paypad", null);


            var result = await _transactionBL.CreateDetailAsync(newTransactionDetail);

            if (result == null || result.Count == 0) return await GetResponseAsync<List<TransactionDetailDto>?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

            return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<TransactionDetailDto?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }


    [HttpPut]
    //[Authorize]
    [Route("Paypad/Details")]
    [ProducesResponseType(typeof(HttpResponse<TransactionDetailDto>), (int)HttpStatusCode.OK)]
    [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
    public async Task<IActionResult> PutDetail([FromBody] TransactionDetailDto transactionDetail)
    {
        try
        {
            var paypadLogged = _permissionData?.PayPadLogged;
            if (paypadLogged == null)
                return await GetResponseAsync<List<TransactionDetailDto>?>(HttpStatusCode.Unauthorized, $"{(int)ErrorCodes.NotAllowed}: No se encontró paypad", null);


            var result = await _transactionBL.UpdateDetailAsync(transactionDetail);

            if (result == null) return await GetResponseAsync<TransactionDetailDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

            return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<TransactionDetailDto?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }

    [HttpPost]
    //[Authorize]
    [Route("Paypad/UploadVideo")]
    public async Task<IActionResult> UploadVideo([FromForm] IFormFile videoFile, [FromForm] int idPaypad = 0, [FromForm] int idTransaction = 0)
    {
        if (idPaypad <= 0 || idTransaction <= 0 || videoFile == null)
        {
            return await GetResponseAsync<string?>(HttpStatusCode.BadRequest, "No se proporcionaron los datos adecuados", null);
        }

        try
        {
            var videosPath = Path.Combine(_config[AppSettings.VIDEOS_PATH] ?? "", $@"{idPaypad}");
            if (!Directory.Exists(videosPath))
            {
                Directory.CreateDirectory(videosPath);
            }

            //Check Allowed Extensions
            var imageExt = Path.GetExtension(videoFile.FileName);
            if (imageExt.ToLower() != ".mp4")
            {
                return await GetResponseAsync<string?>(HttpStatusCode.BadRequest, $"La extensión del archivo no es valida, la extensión esperada es .mp4", null);
            }

            var filename = $"{idPaypad}_{idTransaction}.mp4";
            var fullPath = Path.Combine(videosPath, filename);

            await using var stream = new FileStream(fullPath, FileMode.Create);
            await videoFile.CopyToAsync(stream);

            return await GetResponseAsync<string?>(HttpStatusCode.OK, $"El video se ha subido exitósamente en {fullPath}", null);

        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<TransactionDetailDto?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }


    // ==============================================================================================================================================================================//

    [HttpGet]
    //[Authorize]
    [Route("{idTransaction}/Rating")]
    [ProducesResponseType(typeof(HttpResponse<TransactionRatingDto>), (int)HttpStatusCode.OK)]
    [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
    public async Task<IActionResult> GetRatingByIdTransaction(int idTransaction)
    {
        try
        {
            var result = await _transactionBL.GetRatingAsync(idTransaction);

            if (result == null)
                return await GetResponseAsync<TransactionRatingDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);



            return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);

        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<TransactionRatingDto?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }

    [HttpPost]
    //[Authorize]
    [Route("Rating")]
    [ProducesResponseType(typeof(HttpResponse<TransactionRatingDto>), (int)HttpStatusCode.OK)]
    [ProducesResponseType(typeof(HttpErrorResponse), (int)HttpStatusCode.InternalServerError)]
    public async Task<IActionResult> PostRating([FromBody] TransactionRatingDto newTransactionRating)
    {
        try
        {
            var paypadLogged = _permissionData?.PayPadLogged;
            if (paypadLogged == null)
                return await GetResponseAsync<TransactionRatingDto?>(HttpStatusCode.Unauthorized, $"{(int)ErrorCodes.NotAllowed}: No se encontró paypad", null);


            var result = await _transactionBL.CreateRatingAsync(newTransactionRating.IdTransaction, newTransactionRating.Rating);

            if (result == null) return await GetResponseAsync<TransactionRatingDto?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No se encontró resultado", null);

            return await GetResponseAsync(HttpStatusCode.OK, ServiceMessages.OK, result);
        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<TransactionRatingDto?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }


    // ==============================================================================================================================================================================//
    [HttpPost]
    [Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]
    //[Authorize]
    [Route("ExcelDoc")]
    public async Task<IActionResult> PostExcelDoc([FromBody] ExcelTransactionDto parameters)
    {
        try
        {
            var transactionsForPaypad = await _transactionBL.GetByPaypadAsync(parameters.PaypadId);
            var results = transactionsForPaypad.Where((tr) => parameters.TransactionIds.Contains(tr.Id));

            return File(ExcelBuilder.BuildTransactionReport(results.ToList()), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", parameters.FileName);

        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<TransactionRatingDto?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }

    [HttpGet]
    [Produces("application/json")]
    //[Authorize]
    [Route("VideoFtp")]
    public async Task<IActionResult> VideoDownloadFtp([FromQuery] int idPaypad = 0, [FromQuery] int idTransaction = 0)
    {
        if (idPaypad <= 0 || idTransaction <= 0)
        {
            return await GetResponseAsync<string?>(HttpStatusCode.BadRequest, "No se proporcionaron los datos adecuados", null);
        }

        try
        {
            var paypadConfig = await _paypadBL.GetConfigurationByPaypadId(idPaypad);
            var transaction = await _transactionBL.GetByIdAsync(idTransaction);
            if (paypadConfig == null || transaction == null)
            {
                return await GetResponseAsync<string>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No existe transacción o paypad con los id proporcionados", null);
            }
            var extraDataPaypad = paypadConfig.ExtraDataJson;
            if (extraDataPaypad == null)
            {
                return await GetResponseAsync<string>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No existe configuración para este paypad debe crearla", null);
            }

            var ftpUrl = extraDataPaypad.Where(x => x.Key == "ftpUrl").FirstOrDefault()?.Value;
            var ftpUser = extraDataPaypad.Where(x => x.Key == "ftpUser").FirstOrDefault()?.Value;
            var ftpPwd = extraDataPaypad.Where(x => x.Key == "ftpPwd").FirstOrDefault()?.Value;

            if (string.IsNullOrEmpty(ftpUrl) || string.IsNullOrEmpty(ftpUser) || string.IsNullOrEmpty(ftpPwd))
            {
                return await GetResponseAsync<string>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: No existe configuración ftp para este paypad debe crearla", null);
            }

            var filename = $"{idPaypad}_{idTransaction}_{transaction.DateCreated?.ToString("ddMMyyyy")}_source0.mp4";
            await EventLogger.Save(ETypeLog.Info, $"Downloading video from ftpServer: {ftpUrl}, user {ftpUser},  pwd {ftpPwd}, filename {filename}");
            var client = new AsyncFtpClient(ftpUrl, ftpUser, ftpPwd);
            await client.AutoConnect();

            if (!await client.FileExists(filename))
            {
                await EventLogger.Save(ETypeLog.Warning, $"file {filename} not exists in {ftpUrl}");
                return await GetResponseAsync<string?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: El video no existe o ya ha sido eliminado", null);
            }

            byte[] fileBytes = await client.DownloadBytes(filename, token: default);

            return File(fileBytes, "video/mp4", filename);


        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<TransactionRatingDto?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }

    [HttpGet]
    [Produces("application/json")]
    //[Authorize]
    [Route("Video")]
    public async Task<IActionResult> VideoDownload([FromQuery] int idPaypad = 0, [FromQuery] int idTransaction = 0)
    {
        if (idPaypad <= 0 || idTransaction <= 0)
        {
            return await GetResponseAsync<string?>(HttpStatusCode.BadRequest, "No se proporcionaron los datos adecuados", null);
        }
        try
        {
            var filename = $"{idPaypad}_{idTransaction}.mp4";
            var fullpath = Path.Combine(_config[AppSettings.VIDEOS_PATH] ?? "", $@"{idPaypad}\{filename}");
            if (!System.IO.File.Exists(fullpath))
            {
                return await GetResponseAsync<string?>(HttpStatusCode.NotFound, $"{(int)ErrorCodes.NotFound}: El video no existe o ya ha sido eliminado", null);
            }
            return File(await System.IO.File.ReadAllBytesAsync(fullpath), "video/mp4", filename);


        }
        catch (Exception ex)
        {
            await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
            return await GetResponseAsync<TransactionRatingDto?>(HttpStatusCode.BadRequest, ex.Message, null);
        }
    }
  
}