using Dapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Masters;
using Dashboard.Domain.Interfaces.Persistence;
using Dashboard.Domain.Variables;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using System.Data;
using System.Data.SqlClient;
using SP = Dashboard.Domain.Variables.Procedures;
using CK = Dashboard.Domain.Variables.CacheKeys;

namespace Dashboard.Persistence.SQLServer
{
    public class RegionRepository : IGenericRepository<Region, RegionDto>
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public RegionRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<Region>> GetAllAsync()
        {
            if (_cache.TryGetValue(CK.MASTERS_REGIONS, out IEnumerable<Region>? cachedResult))
            {
                if (cachedResult != null) return cachedResult;
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Region> region = await conn.QueryAsync<Region>(SP.MASTERS_SP_REGION_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1)
            };

            _cache.Set(CK.MASTERS_REGIONS, region, cacheEntryOptions);

            return region;
        }

        public async Task<Region?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }



        public async Task<Region?> CreateAsync(RegionDto newRegion)
        {
            var args = new
            {
                newRegion.Name,
                newRegion.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            Region? regionCreated = (await conn.QueryAsync<Region>(SP.MASTERS_SP_REGION_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_REGIONS);
            return regionCreated;
        }

        public async Task<Region?> UpdateAsync(RegionDto region)
        {
            var args = new
            {
                region.Id,
                region.Name,
                region.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            Region? regionUpdated = (await conn.QueryAsync<Region>(SP.MASTERS_SP_REGION_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_REGIONS);
            return regionUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            Region? region = (await conn.QueryAsync<Region>(SP.MASTERS_SP_REGION_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (region != null)
            {
                return false;
            }

            _cache.Remove(CK.MASTERS_REGIONS);
            return true;
        }

       
    }
}
