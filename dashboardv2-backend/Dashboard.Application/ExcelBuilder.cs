

using Dashboard.Domain.DTOs;
using MongoDB.Driver;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using System.Drawing;

namespace Dashboard.Application
{
    public static class ExcelBuilder
    {
        


        public static byte[] BuildTransactionReport(List<TransactionDto> transactions)
        {
            transactions = transactions.OrderBy(x => x.DateCreated).ToList();
            List<string> prods = transactions.Select(x => x.Product??"").Distinct().ToList() ?? new List<string>();
            var dateFrom = transactions.First().DateCreated ?? DateTime.MinValue;
            var dateTo = transactions.Last().DateCreated ?? DateTime.Now;


            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            using var package = new ExcelPackage();

            var worksheet = package.Workbook.Worksheets.Add("Hoja1");
            FillTable(ref worksheet, transactions);

            worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();
            var stream = new MemoryStream();
            package.SaveAs(stream);
            return stream.ToArray();
        }

        

        

        internal static void FillTable(ref ExcelWorksheet worksheet, List<TransactionDto> transactions)
        {

            
            int col = 1;
            worksheet.Cells[1, col].Value = "ID";
            worksheet.Cells[1, col + 1].Value = "Trámite";
            worksheet.Cells[1, col + 2].Value = "Referencia";
            worksheet.Cells[1, col + 3].Value = "Documento";
            worksheet.Cells[1, col + 4].Value = "Total";
            worksheet.Cells[1, col + 5].Value = "Total sin redondear";
            worksheet.Cells[1, col + 6].Value = "Excedente pagado";
            worksheet.Cells[1, col + 7].Value = "Ingresado";
            worksheet.Cells[1, col + 8].Value = "Devuelto";
            worksheet.Cells[1, col + 9].Value = "Recaudado";
            worksheet.Cells[1, col + 10].Value = "Estado transacción";
            worksheet.Cells[1, col + 11].Value = "Fecha creación";
            int row = 2;
            foreach (TransactionDto tran in transactions)
            {
                worksheet.Cells[row, col].Value = tran.Id;
                worksheet.Cells[row, col + 1].Value = tran.Product;
                worksheet.Cells[row, col + 2].Value = tran.Reference;
                worksheet.Cells[row, col + 3].Value = tran.Document;
                worksheet.Cells[row, col + 4].Value = tran.TotalAmount;
                worksheet.Cells[row, col + 5].Value = tran.RealAmount;
                worksheet.Cells[row, col + 6].Value = tran.TotalAmount - tran.RealAmount;
                worksheet.Cells[row, col + 7].Value = tran.IncomeAmount;
                worksheet.Cells[row, col + 8].Value = tran.ReturnAmount;
                worksheet.Cells[row, col + 9].Value = tran.IncomeAmount - tran.ReturnAmount;
                worksheet.Cells[row, col + 10].Value = tran.StateTransaction;
                worksheet.Cells[row, col + 11].Value = tran.DateCreated?.ToString("yyyy/MM/dd HH:mm:ss") ?? string.Empty;


                for (int i = 4; i < 10; i++)
                {
                    worksheet.Cells[row, col + i].Style.Numberformat.Format = "$#,##0";
                }
                row++;
            }

            
        }


    }
}
