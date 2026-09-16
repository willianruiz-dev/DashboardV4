using Dashboard.Domain;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Interfaces.Application;
using Microsoft.Extensions.Configuration;
using System.Text.RegularExpressions;

namespace Dashboard.Application.Validation
{
    public class PayPadValidation: IPayPadValidation
    {

        private readonly IConfiguration _configuration;


        public PayPadValidation( IConfiguration configuration)
        {

            _configuration = configuration;
        }

        public PayPadDto? IsPasswordCorrect(PayPadDto? paypadResult, string password)
        {
            if (!string.IsNullOrEmpty(password))
            {

                if (paypadResult != null && !string.IsNullOrEmpty(paypadResult.Pwd) && password.ValidateEncodedPassword(paypadResult.Pwd, _configuration))
                {
                    return paypadResult;
                }
            }

            return null;
        }

        public void ValidateNewPwd(string newPwd) 
        {
            string pattern = @"^(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*()-_=+[\]{}|;:'"",.<>?/]).{8,}$";
            if (!Regex.IsMatch(newPwd, pattern)) throw new Exception("Las contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un carácter especial.");
        }
        
        public void ValidatePaypad(ref PayPadDto paypad)
        {
            //Validacion de campos obligatorios
            if (string.IsNullOrEmpty(paypad.Username)) throw new Exception("No se proporcionó nombre de Paypad");
            if (string.IsNullOrEmpty(paypad.Longitude) || string.IsNullOrEmpty(paypad.Latitude))
                throw new Exception("No se proporcionaron datos de ubicación de Paypad");
            if (!Convert.ToBoolean(paypad.IdCurrency)) throw new Exception("No se proporcionó id de Moneda");
            if (!Convert.ToBoolean(paypad.IdOffice)) throw new Exception("No se proporcionó id de Oficina");

            paypad.Username= paypad.Username.Trim();
            paypad.Longitude= paypad.Longitude.Trim();
            paypad.Latitude = paypad.Latitude.Trim();
            if (!string.IsNullOrEmpty(paypad.Description)) paypad.Description = paypad.Description.Trim();

            //Validar que la ubicación se puede transformar a decimal
            try
            {
                var longitudeFloat = Convert.ToDouble(paypad.Longitude);
                var latitudeFloat = Convert.ToDouble(paypad.Latitude);
            }
            catch (FormatException) 
            {
                throw new Exception("Los datos de ubicación no son válidos como decimales o numeros");
            }

        }

        public void ValidatePaypadUpdate(ref PayPadDto paypad)
        {
            ValidatePaypad(ref paypad);
            if (paypad.IdUserUpdated <= 0) throw new Exception("No se proporcionó id de usuario actualización");
        }

        public void ValidatePaypadConfiguration(ref PayPadConfigurationDto paypadConfiguration)
        {
            //Validacion de campos obligatorios
            if (!Convert.ToBoolean(paypadConfiguration.IdPaypad)) throw new Exception("No se proporcionó id del Paypad");
            if (!Convert.ToBoolean(paypadConfiguration.IdUserCreated)) throw new Exception("No se proporcionó id del usuario de creacion");

        }

        public void ValidatePaypadConfigurationUpdate(ref PayPadConfigurationDto paypadConfiguration)
        {
            ValidatePaypadConfiguration(ref paypadConfiguration);
            if (paypadConfiguration.IdUserUpdated <= 0) throw new Exception("No se proporcionó id de usuario actualización");
        }

    }
}
