
namespace Dashboard.Domain.DTOs.Business;

public class TransactionPayPadDto
{
    public int ID_Transaction { get; set; }
    public DateTime Fecha_Pago { get; set; }
    public decimal Valor_Pagar { get; set; }
    public string? Medio_Pago { get; set; }
    public string? Estado { get; set; }
}
