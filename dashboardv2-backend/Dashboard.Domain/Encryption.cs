using Dashboard.Domain.Variables;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;
using System.Text;


namespace Dashboard.Domain
{
    public static class Encryption
    {
        public static bool ValidateEncodedPassword(this string password, string hashedPwd, IConfiguration configuration)
        {
            byte[] passwordBytes = Encoding.UTF8.GetBytes(password);
            byte[] saltBytes = Encoding.UTF8.GetBytes(configuration[AppSettings.SALT_INTERNAL]);
            byte[] saltedValue = passwordBytes.Concat(saltBytes).ToArray();
            using (SHA256 sha256Hash = SHA256.Create())
            {
                string saltedHash = Convert.ToBase64String(sha256Hash.ComputeHash(saltedValue));
                byte[] hashedPwdBytes = Encoding.UTF8.GetBytes(hashedPwd);
                byte[] saltedHashBytes = Encoding.UTF8.GetBytes(saltedHash);
                return hashedPwdBytes.SequenceEqual(saltedHashBytes);
            }
        }
        public static string GenerarHash(this string contrasena, IConfiguration configuration)
        {
            byte[] contrasenaBytes = Encoding.UTF8.GetBytes(contrasena);
            byte[] saltBytes = Encoding.UTF8.GetBytes(configuration[AppSettings.SALT_INTERNAL]);
            byte[] saltedValue = contrasenaBytes.Concat(saltBytes).ToArray();
            using (SHA256 sha256Hash = SHA256.Create())
                return Convert.ToBase64String(sha256Hash.ComputeHash(saltedValue));
        }

        public static string DecryptRSA(string pwdEncrypted)
        {
            var privateKeyText = File.ReadAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "rsa_keys\\private.pem"));
            var privateKey = new RSACryptoServiceProvider();
            privateKey.ImportFromPem(privateKeyText);

            byte[] pwdEncryptedBytes = Convert.FromBase64String(pwdEncrypted);
            byte[] decryptedData = privateKey.Decrypt(pwdEncryptedBytes, true);

            string result = Encoding.UTF8.GetString(decryptedData);
            return result;   
        }
        public static string EncryptRSA(string pwd)
        {
            byte[] pwdBytes = Encoding.UTF8.GetBytes(pwd);
            var publicKeyText = File.ReadAllText(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "rsa_keys\\public.pem"));
            var publicKey = new RSACryptoServiceProvider();
            publicKey.ImportFromPem(publicKeyText);

            
            byte[] encryptedData = publicKey.Encrypt(pwdBytes, true);

            string result = Convert.ToBase64String(encryptedData);
            return result;
        }
    }
}
