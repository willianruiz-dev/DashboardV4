namespace Dashboard.Domain.Exceptions
{
    public class DbException: Exception
    {   

        public DbException() 
        {
            
        }

        public DbException(string message) : base(ValidateMessage(message))
        {
            
        }

        public DbException(string message,  Exception innerException) : base(ValidateMessage(message), innerException) 
        { 

        }

        private static string ValidateMessage(string msg) 
        {
            
            if (msg.ToLower().Contains("unique"))
            {
                return "Violación de clave única";
            }
            return msg;
        }

    }
}
