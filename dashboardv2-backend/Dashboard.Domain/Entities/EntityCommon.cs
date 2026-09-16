using Dashboard.Domain.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Dashboard.Domain.Entities
{
    public class EntityCommon
    {
        public int ID { get; set; }
        public int ID_USER_UPDATED { get; set; }
        public string? USER_UPDATED_NAME { get; set; }
        public DateTime? DATE_CREATED { get; set; }
        public int ID_USER_CREATED { get; set; }
        public string? USER_CREATED_NAME { get; set; }
        public DateTime? DATE_UPDATED { get; set; }

    }
}
