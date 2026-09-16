using Amazon.Runtime.Internal.Util;
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
    public class LoadRepository : ILoadRepository
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public LoadRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<Load>> GetAllAsync()
        {
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Load> paypad = await conn.QueryAsync<Load>(SP.BUSINESS_SP_LOADS_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return paypad;
        }

        public async Task<Load?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }

        public async Task<IEnumerable<Load>> GetByPaypadAsync(int idPaypad)
        {
            var args = new
            {
                IdPayPad = idPaypad
            };
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Load> loads = await conn.QueryAsync<Load>(SP.BUSINESS_SP_LOADS_GETBY_PAYPAD, args, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return loads;
        }


        public async Task<Load?> CreateAsync(LoadDto newLoad)
        {
            var args = new
            {
                newLoad.IdPayPad,
                newLoad.TotalLoaded,
                newLoad.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            Load? loadCreated = (await conn.QueryAsync<Load>(SP.BUSINESS_SP_LOADS_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.BUSINESS_PAYPAD_STORAGE+newLoad.IdPayPad);
            return loadCreated;
        }

        public async Task<IEnumerable<LoadDetail>> GetDetailsByLoadAsync(int idLoad)
        {
            var args = new
            {
                IdLoad = idLoad
            };
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<LoadDetail> details = await conn.QueryAsync<LoadDetail>(SP.BUSINESS_SP_LOADDETAILS_GETBY_LOAD, args, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();
            
            return details;
        }

        public async Task<LoadDetail?> CreateDetailAsync(LoadDetailDto newLoadDetail)
        {
            var args = new
            {
                newLoadDetail.IdLoad,
                newLoadDetail.IdCurrencyDenomination,
                newLoadDetail.DenominationValue,
                newLoadDetail.Quantity,
                newLoadDetail.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            LoadDetail? detailCreated = (await conn.QueryAsync<LoadDetail>(SP.BUSINESS_SP_LOADDETAILS_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            
            return detailCreated;
        }

        public async Task<bool> DeleteLoadAsync(int idPayPad, int idLoad)
        {
            var args = new
            {
                IdPayPad = idPayPad,
                IdLoad = idLoad
            };
            using var conn = new SqlConnection(_dataBase);
            Load? load = (await conn.QueryAsync<Load>(SP.BUSINESS_SP_LOADS_DELETE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();
            
            if(load == null)
            {
                return false;
            }

            _cache.Remove(CK.BUSINESS_PAYPAD_STORAGE + idPayPad);
            return true;
        }
    }
}
