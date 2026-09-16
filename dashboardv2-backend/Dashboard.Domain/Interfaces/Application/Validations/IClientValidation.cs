using Dashboard.Domain.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Dashboard.Domain.Interfaces.Application
{
    public interface IClientValidation
    {
        void ValidateClient(ref ClientDto client);


    }
}
