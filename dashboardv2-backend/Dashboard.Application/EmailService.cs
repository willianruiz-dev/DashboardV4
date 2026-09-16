
using Dashboard.Domain;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Enumerables;
using MailKit.Net.Smtp;
using MimeKit;

namespace Dashboard.Application
{
    public class EmailService
    {
        private string host = "mail.1cero1.com";
        private int port = 465;
        private string sender = "alertas_dashboard@e-city.co";
        private string senderPwd = "alertas/*";

        public EmailService()
        {
           
        } 

        public async Task SendStorageAlert(List<SubscriptionDto> subs, List<string> denominaciones)
        {
           
            if (subs == null || subs.Count <= 0)
            {
                await EventLogger.Save(ETypeLog.Warning,"Servicio de email: No se pudo enviar la alerta de almacenamiento. No hay ninguna subscripción.");
                return;
            }
            string alertDescription = subs[0].Alert;
            string paypadName = subs[0].Paypad;
            var emailsSubscribed = subs.Select(s => s.Email).ToList();
            
            
            string subject = $"{alertDescription}: E-city";
            string body = $"Los siguientes denominaciones del corresponsal {paypadName} están excaseando, recomendamos hacer cargue de la maquina.\n"+
                           string.Join("\n", denominaciones);
            body += "\n\nPor favor no responder a este correo.";

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress("Alertas E-city", sender));
            foreach (var email in emailsSubscribed)
            {
                if (email == null) continue;
                message.To.Add(new MailboxAddress("", email));
            }
            message.Subject = subject;
            message.Body = new TextPart("plain") { Text = body };

            try
            {
                using var client = new SmtpClient();
                client.Connect(host, port, true);
                client.Authenticate(sender, senderPwd);
                client.Send(message);
                client.Disconnect(true);
                await EventLogger.Save(ETypeLog.Info, "Servicio de email: Alerta de Almacenamiento enviada exitosamente" );
                return;
            }
            catch (Exception ex)
            {
                await EventLogger.Save(ETypeLog.Error ,$"Servicio de email Error: No se pudo enviar la alerta de almacenamiento. Error en el metodo Send {ex.Message}");
                return;
            }

            
        }
        
    }
}
