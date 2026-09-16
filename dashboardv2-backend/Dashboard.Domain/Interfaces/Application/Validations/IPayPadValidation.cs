using Dashboard.Domain.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Dashboard.Domain.Interfaces.Application
{
    public interface IPayPadValidation
    {
        PayPadDto? IsPasswordCorrect(PayPadDto? paypadResult, string password);
        void ValidateNewPwd(string newPayPad);
        void ValidatePaypad(ref PayPadDto paypad);
        void ValidatePaypadUpdate(ref PayPadDto paypad);
        void ValidatePaypadConfiguration(ref PayPadConfigurationDto paypad);
        void ValidatePaypadConfigurationUpdate(ref PayPadConfigurationDto paypad);


    }
}
