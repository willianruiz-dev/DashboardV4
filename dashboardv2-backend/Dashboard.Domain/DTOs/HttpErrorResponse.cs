using Newtonsoft.Json;
using System.Text.Json;

namespace Dashboard.Domain.DTOs
{
    /// <summary>
    /// Http Error Generic Response 
    /// </summary>
    public class HttpErrorResponse
    {
        public int statusCode { get; set; }
        public string? description { get; set; }
        public string? message { get; set; }
        public string? stackTrace { get; set; }

        public override string ToString()
        {
            return JsonConvert.SerializeObject(this);
        }
    }
}
