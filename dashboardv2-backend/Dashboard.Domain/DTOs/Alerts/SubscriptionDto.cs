using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Dashboard.Domain.DTOs
{
    public class SubscriptionDto: DtoCommon
    {
        public int IdPayPad { get; set; }
        public string Paypad { get; set; }
        public int IdAlert { get; set; }
        public string Alert { get; set; }
        public string Email { get; set; }

    }
}
