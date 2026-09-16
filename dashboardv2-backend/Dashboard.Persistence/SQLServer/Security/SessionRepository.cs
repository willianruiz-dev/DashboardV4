using Dapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Security;
using Dashboard.Domain.Interfaces.Persistence;
using Dashboard.Domain.Variables;
using Microsoft.Extensions.Configuration;
using System.Data;
using System.Data.SqlClient;
using SP = Dashboard.Domain.Variables.Procedures;
using CK = Dashboard.Domain.Variables.CacheKeys;
using Microsoft.Extensions.Caching.Memory;

namespace Dashboard.Persistence.SQLServer.Security
{
    public class SessionRepository : ISessionRepository
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public SessionRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

           

        public async Task<Session?> GetByTokenAsync(string token)
        {
            var args = new
            {
                Token = token
            };
            using var conn = new SqlConnection(_dataBase);
            Session? session = (await conn.QueryAsync<Session>(SP.SECURITY_SP_SESSIONS_GETBY_TOKEN, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return session;
        }

        public async Task<IEnumerable<Session>> GetByUserAsync(int idUser)
        {
            if(_cache.TryGetValue(CK.SECURITY_SESSIONS_USER+idUser, out IEnumerable<Session>? cachedResult)) 
            {
                if (cachedResult != null) return cachedResult;
            }

            var args = new
            {
                IdUser = idUser
            };
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Session> session = await conn.QueryAsync<Session>(SP.SECURITY_SP_SESSIONS_GETBY_USER, args, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
            };

            _cache.Set(CK.SECURITY_SESSIONS_USER + idUser, session, cacheEntryOptions);
            return session;
        }


        public async Task<Session?> CreateAsync(SessionDto newSession)
        {
            var args = new
            {
                newSession.IdUser,
                newSession.Token,
            };
            using var conn = new SqlConnection(_dataBase);
            Session? sessionCreated = (await conn.QueryAsync<Session>(SP.SECURITY_SP_SESSIONS_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.SECURITY_SESSIONS_USER + newSession.IdUser);
            return sessionCreated;
        }

        public async Task<Session?> UpdateAsync(SessionDto session)
        {
            var args = new
            {
                session.Id,
                session.Active
            };
            using var conn = new SqlConnection(_dataBase);
            Session? sessionUpdated = (await conn.QueryAsync<Session>(SP.SECURITY_SP_SESSIONS_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.SECURITY_SESSIONS_USER + session.IdUser);
            return sessionUpdated;
        }

        

    }
}
