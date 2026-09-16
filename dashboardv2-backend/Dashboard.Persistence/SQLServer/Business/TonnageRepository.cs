using Dapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Business;
using Dashboard.Domain.Interfaces.Persistence;
using Dashboard.Domain.Variables;
using Microsoft.Extensions.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Reflection.Metadata;
using SP = Dashboard.Domain.Variables.Procedures;
using CK = Dashboard.Domain.Variables.CacheKeys;
using Microsoft.Extensions.Caching.Memory;

namespace Dashboard.Persistence.SQLServer
{
    public class TonnageRepository : ITonnageRepository
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public TonnageRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<Tonnage>> GetAllAsync()
        {
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Tonnage> paypad = await conn.QueryAsync<Tonnage>(SP.BUSINESS_SP_TONNAGES_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return paypad;
        }

        public async Task<Tonnage?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }

        public async Task<IEnumerable<Tonnage>> GetByPaypadAsync(int idPaypad)
        {
            var args = new
            {
                IdPayPad = idPaypad
            };
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Tonnage> tonnages = await conn.QueryAsync<Tonnage>(SP.BUSINESS_SP_TONNAGES_GETBY_PAYPAD, args, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return tonnages;
        }


        public async Task<Tonnage?> CreateAsync(TonnageDto newTonnage)
        {
            var args = new
            {
                newTonnage.IdPayPad,
                newTonnage.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            Tonnage? tonnageCreated = (await conn.QueryAsync<Tonnage>(SP.BUSINESS_SP_TONNAGES_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.BUSINESS_PAYPAD_STORAGE + newTonnage.IdPayPad);
            return tonnageCreated;
        }

        public async Task<IEnumerable<TonnageDetail>> GetDetailsByTonnageAsync(int idTonnage)
        {
            var args = new
            {
                IdTonnage = idTonnage
            };
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<TonnageDetail> details = await conn.QueryAsync<TonnageDetail>(SP.BUSINESS_SP_TONNAGEDETAILS_GETBY_TONNAGE, args, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return details;
        }

        
    }
}
