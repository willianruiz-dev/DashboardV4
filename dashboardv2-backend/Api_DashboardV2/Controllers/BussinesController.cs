using Dashboard.Domain.Enumerables;
using Dashboard.Domain;
using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Dashboard.Domain.Interfaces.Application;
using Microsoft.AspNetCore.Authorization;

namespace Api_DashboardV2.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class BussinesPayPad : ControllerBase
    {

        private readonly ITransactionBL _transactionBL;

        public BussinesPayPad(ITransactionBL transactionBL)
        {
            _transactionBL = transactionBL;
        }

        [HttpGet]
        [Route("Paypad/{idPayPad}/Transactions")]
        public async Task<IActionResult> GetByPayPad(int idPayPad, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            try
            {
                var transactions = await _transactionBL.GetByPaypadAsync(idPayPad, startDate, endDate);

                if (transactions == null || !transactions.Any())
                    return NotFound($"No se encontraron transacciones para el PayPad con ID {idPayPad} en el rango de fechas especificado");

                return Ok(transactions);
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error, $"Error: {ex.Message}", ex);
                return StatusCode((int)HttpStatusCode.InternalServerError, $"Ocurrió un error al obtener las transacciones para el PayPad con ID {idPayPad} en el rango de fechas especificado");
            }
        }

    }
}
