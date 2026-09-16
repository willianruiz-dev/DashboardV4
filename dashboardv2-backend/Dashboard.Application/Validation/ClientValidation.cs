using Dashboard.Domain.DTOs;
using Dashboard.Domain.Interfaces.Application;
using Microsoft.Extensions.Configuration;
using System.Text.RegularExpressions;

namespace Dashboard.Application.Validation
{
    public class ClientValidation: IClientValidation
    {

        private readonly IConfiguration _configuration;


        public ClientValidation( IConfiguration configuration)
        {

            _configuration = configuration;
        }



        public void ValidateClient(ref ClientDto client)
        {
            //Validacion de campos obligatorios
            if (string.IsNullOrEmpty(client.Name)) throw new Exception("No se proporcionó nombre de cliente");
            if (string.IsNullOrEmpty(client.Nit)) throw new Exception("No se proporcionó nit del cliente");
            if (string.IsNullOrEmpty(client.Email)) throw new Exception("No se proporcionó correo del cliente");
            if (!Convert.ToBoolean(client.IdRegion)) throw new Exception("No se proporcionó id de región");
            if (string.IsNullOrEmpty(client.LogoImg)) throw new Exception("No se proporcionó logo de cliente");
            if (string.IsNullOrEmpty(client.ImgExt)) throw new Exception("No se proporcionó extensión de imagen");

            client.Name = client.Name.Trim();
            client.Nit = client.Nit.Trim();
            client.Email = client.Email.Trim();

            ValidateEmail(client.Email);

            if (!string.IsNullOrEmpty(client.Phone)) client.Phone = client.Phone.Trim();
        }

        private void ValidateEmail(string email)
        {
            string pattern = @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$";
            if (!Regex.IsMatch(email, pattern)) throw new Exception("No se proporcionó correo válido");
        }

        

        

    }
}
