using MongoDB.Driver.Core.Authentication;

namespace Dashboard.Domain.Static
{
    public static class AuthAttempts
    {
        private static int MAX_ATTEMPTS = 10;
        private static int WAITING_TIME_MINUTES = 15; 
        private static List<UserAttempts> userAttemptsList = new List<UserAttempts>();
        

        private static async Task waitTimeResetAttempts(string username)
        {
            await Task.Delay((1000*60)*WAITING_TIME_MINUTES);
            restartAttempts(username);
        }

        public static void saveAttempt(string username)
        {
            var userAttempts = userAttemptsList.Where(ua => ua.username == username).FirstOrDefault();
            if (userAttempts == null)
            {
                userAttempts = new UserAttempts { username = username, attempts = 0 };
                userAttemptsList.Add(userAttempts);
            }
            userAttempts.attempts += 1;

            if (userAttempts.attempts >= MAX_ATTEMPTS && !userAttempts.isWaiting)
            {
                Task waitReset = waitTimeResetAttempts(username);
            }
        }

        public static void restartAttempts(string username) 
        {
            var userAttempts = userAttemptsList.Where(ua => ua.username == username).FirstOrDefault();
            if (userAttempts == null)
            {
                userAttempts = new UserAttempts { username = username, attempts = 0 };
                userAttemptsList.Add(userAttempts);
            }

            userAttempts.attempts = 0;
            userAttempts.isWaiting = false;
        }

        public static bool isAttemptsExceeded(string username)
        {
            var userAttempts = userAttemptsList.Where(ua => ua.username == username).FirstOrDefault();
            if (userAttempts != null)
            {
                return userAttempts.attempts >= MAX_ATTEMPTS;
            }
            return false;
        }

    }

    internal class UserAttempts
    {
        public string username { get; set; }
        public int attempts { get; set; }
        public bool isWaiting { get; set; }
    }
}
