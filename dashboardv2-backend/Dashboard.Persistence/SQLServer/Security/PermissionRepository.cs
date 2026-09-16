using Dapper;
using Dashboard.Domain.Entities.Security;
using Dashboard.Domain.Interfaces.Persistence;
using Dashboard.Domain.Variables;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using System.Data;
using System.Data.SqlClient;
using CK = Dashboard.Domain.Variables.CacheKeys;
using SP = Dashboard.Domain.Variables.Procedures;

namespace Dashboard.Persistence.SQLServer.Security
{
    public class PermissionRepository : IPermissionRepository
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public PermissionRepository(IConfiguration configuration, IMemoryCache cache )
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<Permission>> GetAllAsync()
        {
            if (_cache.TryGetValue(CK.SECURITY_PERMISSIONS, out IEnumerable<Permission>? cacheResult))
            {
                if (cacheResult != null) return cacheResult;
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Permission> permissions = await conn.QueryAsync<Permission>(SP.SECURITY_SP_PERMISSIONS_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            };

            _cache.Set(CK.SECURITY_PERMISSIONS, permissions, cacheEntryOptions);
            return permissions;
        }

        public async Task<Permission?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }



        

    }
}
