using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Dashboard.Domain.DTOs.Business
{
    public class ExcelTransactionDto
    {
        public int PaypadId { get; set; }
        public List<int> TransactionIds { get; set; }
        public string FileName { get; set; }
    }
}
