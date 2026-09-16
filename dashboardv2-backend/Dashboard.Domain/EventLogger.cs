#define NO_MONGO
using Dashboard.Domain.Enumerables;
using MongoDB.Bson;
using MongoDB.Driver;
using Newtonsoft.Json;
using System.Diagnostics;
using System.Runtime.CompilerServices;

namespace Dashboard.Domain
{
    public static class EventLogger
    {
        public static string? _connectionString;
        public static MongoClientSettings? _clientSettings;

        
        public static void Init(string connectionString)
        {
            _connectionString = connectionString;
            _clientSettings = MongoClientSettings.FromConnectionString(_connectionString);
            _clientSettings.ConnectTimeout = TimeSpan.FromSeconds(3);
            _clientSettings.SocketTimeout = TimeSpan.FromSeconds(15);
/*
#if NO_MONGO
#pragma warning disable CA1416 // Validar la compatibilidad de la plataforma
            if (!EventLog.SourceExists(EVENT_VIEWER_SOURCE))
            {
                EventLog.CreateEventSource(EVENT_VIEWER_SOURCE, EVENT_VIEWER_LOGNAME);
            }
#pragma warning restore CA1416 // Validar la compatibilidad de la plataforma
#endif
*/
        }
        public static async Task Save(ETypeLog logType, string msg , object? obj = null, [CallerMemberName] string method = "", [CallerFilePath] string callerPath = "")
        {
#if NO_MONGO
            try
            {
                var _class = Path.GetFileNameWithoutExtension(callerPath);
                var document = new BsonDocument
                {
                    {"log", msg},
                    {"type", logType.ToString() },
                    {"date", DateTime.Now.AddHours(-5).ToLocalTime()},
                    {"class", _class.ToString() },
                    {"method", method },
                    {"object", JsonConvert.SerializeObject(obj, Formatting.Indented)}
                };

                if (_clientSettings == null) throw new Exception("No se ha configurado el cliente");

                MongoClient client = new MongoClient(_clientSettings);
                var database = client.GetDatabase("dashboard");
                var collection = database.GetCollection<BsonDocument>("Logs");

                await collection.InsertOneAsync(document);

            }
            catch (Exception ex)
            {
                /*
#pragma warning disable CA1416 // Validar la compatibilidad de la plataforma
                EventLog.WriteEntry(EVENT_VIEWER_SOURCE, $"Ocurrio un error fatal en el log de eventos de MongoDB: {ex.Message}\n StackTrace: {ex.StackTrace}", EventLogEntryType.Error);
#pragma warning restore CA1416 // Validar la compatibilidad de la plataforma
                */

            }
#else
            await Task.Delay(1);
#endif
        }
    }
}
