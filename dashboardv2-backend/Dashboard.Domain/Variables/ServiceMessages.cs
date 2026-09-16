using MongoDB.Bson.Serialization.Serializers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Dashboard.Domain.Variables
{
    public static class ServiceMessages
    {
        public static string FORBIDDEN_MESSAGE = "No tienes permiso para acceder a este recurso";
        public static string FORBIDDEN = "Permiso Denegado";
        public static string ERROR = "Ocurrio un error en la ejecución del metodo";
        public static string OK = "Se ha ejecutado exitosamente";
        public static string NOK = "El resultado no fue exitoso";
        public static string UNAUTHORIZED = "No authorizado";
        public static string NOT_FOUND = "Recurso no encontrado";

    }
}
