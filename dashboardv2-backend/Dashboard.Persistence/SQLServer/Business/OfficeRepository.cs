using Dapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Business;
using Dashboard.Domain.Interfaces.Persistence;
using Dashboard.Domain.Variables;
using Microsoft.Extensions.Configuration;
using System.Data;
using System.Data.SqlClient;
using SP = Dashboard.Domain.Variables.Procedures;
using CK = Dashboard.Domain.Variables.CacheKeys;
using Microsoft.Extensions.Caching.Memory;

namespace Dashboard.Persistence.SQLServer
{
    public class OfficeRepository : IOfficeRepository
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public OfficeRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<Office>> GetAllAsync()
        {
            if (_cache.TryGetValue(CK.BUSINESS_OFFICES, out IEnumerable<Office>? cacheResult))
            {
                if (cacheResult != null) return cacheResult;
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Office> offices = await conn.QueryAsync<Office>(SP.BUSINESS_SP_OFFICES_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            };

            _cache.Set(CK.BUSINESS_OFFICES, offices, cacheEntryOptions);
            return offices;
        }

        public async Task<Office?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }

        


        public async Task<Office?> CreateAsync(OfficeDto newOffice)
        {
            var args = new
            {
                newOffice.Name,
                newOffice.Address,
                newOffice.IdClient,
                newOffice.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            Office? clientCreated = (await conn.QueryAsync<Office>(SP.BUSINESS_SP_OFFICES_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.BUSINESS_OFFICES);
            return clientCreated;
        }

        public async Task<Office?> UpdateAsync(OfficeDto client)
        {
            var args = new
            {
                client.Id,
                client.Name,
                client.Address,
                client.IdClient,
                client.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            Office? clientUpdated = (await conn.QueryAsync<Office>(SP.BUSINESS_SP_OFFICES_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.BUSINESS_OFFICES);
            return clientUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            Office? role = (await conn.QueryAsync<Office>(SP.BUSINESS_SP_OFFICES_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (role != null)
            {
                return false;
            }

            _cache.Remove(CK.BUSINESS_OFFICES);
            return true;
        }

       
    }
}
