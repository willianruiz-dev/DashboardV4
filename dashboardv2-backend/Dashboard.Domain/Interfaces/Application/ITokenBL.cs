using Dashboard.Domain.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Dashboard.Domain.Interfaces.Application
{
    public interface ITokenBL
    {
        string? GenerateToken(UserDto user);
        string? GenerateToken(PayPadDto paypad);
    }
}
