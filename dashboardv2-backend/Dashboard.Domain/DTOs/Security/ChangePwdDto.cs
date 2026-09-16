

namespace Dashboard.Domain.DTOs
{
    public class ChangePwdDto
    { 
        public string Document { get; set; }
        public string OldPwd { get; set; }
        public string NewPwd { get; set; }
    }
}
