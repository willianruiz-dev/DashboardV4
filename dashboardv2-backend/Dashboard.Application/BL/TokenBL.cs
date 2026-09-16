using Dashboard.Domain.DTOs;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Variables;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Dashboard.Application.BL
{
    public class TokenBL : ITokenBL
    {
        private readonly IConfiguration _configuration;


        public TokenBL(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public string? GenerateToken(UserDto user)
        {
            string? result = null;
            if (user == null) { return result; }
            SymmetricSecurityKey authSigningKey = new(Encoding.UTF8.GetBytes(_configuration[AppSettings.JWT_SECRET]));
            JwtSecurityToken? token = BuildJwtSecurityToken(authSigningKey, user);

            if (token != null)
            {
                result = new JwtSecurityTokenHandler().WriteToken(token);
            }

            return result;
        }

        public string? GenerateToken(PayPadDto paypad)
        {
            string? result = null;
            if (paypad == null) { return result; }
            SymmetricSecurityKey authSigningKey = new(Encoding.UTF8.GetBytes(_configuration[AppSettings.JWT_SECRET]));
            JwtSecurityToken? token = BuildJwtSecurityToken(authSigningKey, paypad); 

            if (token != null)
            {
                result = new JwtSecurityTokenHandler().WriteToken(token);
            }

            return result;
        }

        /// <summary>
        /// Build JWT Security token
        /// </summary>
        /// <param name="authSigningKey">Parameter type of SymmetricSecurityKey with signing value</param>
        /// <returns>Token value type of JwtSecurityToken</returns>
        private JwtSecurityToken? BuildJwtSecurityToken(SymmetricSecurityKey authSigningKey, UserDto user)
        {   
            if (user.Document == null ) { return null; }
            if (user.UserName == null) { return null; }
            Claim[] claims = new[]
            {
                new Claim("Document", user.Document),
                new Claim("UserName", user.UserName),
            };
            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddDays(1),
                signingCredentials: new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256)
            );
            return token;
            
        }

        /// <summary>
        /// Build JWT Security token
        /// </summary>
        /// <param name="authSigningKey">Parameter type of SymmetricSecurityKey with signing value</param>
        /// <returns>Token value type of JwtSecurityToken</returns>
        private JwtSecurityToken? BuildJwtSecurityToken(SymmetricSecurityKey authSigningKey, PayPadDto paypad)
        {
            if (!Convert.ToBoolean(paypad.Id)) { return null; }
            if (paypad.Username == null) { return null; }
            Claim[] claims = new[]
            {
                new Claim("Username", paypad.Username),
                new Claim("Id", paypad.Id.ToString())
            };
            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddDays(1),
                signingCredentials: new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256)
            );
            return token;

        }
    }
}
