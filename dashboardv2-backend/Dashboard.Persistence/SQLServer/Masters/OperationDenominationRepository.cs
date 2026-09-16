using Dapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Masters;
using Dashboard.Domain.Entities.Security;
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
    public class OperationDenominationRepository : IGenericRepository<OperationDenomination, OperationDenominationDto>
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public OperationDenominationRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<OperationDenomination>> GetAllAsync()
        {
            if (_cache.TryGetValue(CK.MASTERS_OPERATION_DENOMINATIONS, out IEnumerable<OperationDenomination>? cachedResult))
            {
                if (cachedResult != null) return cachedResult;
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<OperationDenomination> operationDenomination = await conn.QueryAsync<OperationDenomination>(SP.MASTERS_SP_OPTTYPE_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1)
            };

            _cache.Set(CK.MASTERS_OPERATION_DENOMINATIONS, operationDenomination, cacheEntryOptions);

            return operationDenomination;
        }

        public async Task<OperationDenomination?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }



        public async Task<OperationDenomination?> CreateAsync(OperationDenominationDto newOperationDenomination)
        {
            var args = new
            {
                newOperationDenomination.Operation,
                newOperationDenomination.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            OperationDenomination? operationDenominationCreated = (await conn.QueryAsync<OperationDenomination>(SP.MASTERS_SP_OPTTYPE_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_OPERATION_DENOMINATIONS);
            return operationDenominationCreated;
        }

        public async Task<OperationDenomination?> UpdateAsync(OperationDenominationDto operationDenomination)
        {
            var args = new
            {
                operationDenomination.Id,
                operationDenomination.Operation,
                operationDenomination.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            OperationDenomination? operationDenominationUpdated = (await conn.QueryAsync<OperationDenomination>(SP.MASTERS_SP_OPTTYPE_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_OPERATION_DENOMINATIONS);

            return operationDenominationUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            OperationDenomination? optDenom = (await conn.QueryAsync<OperationDenomination>(SP.MASTERS_SP_OPTTYPE_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (optDenom != null)
            {
                return false;
            }

            _cache.Remove(CK.MASTERS_OPERATION_DENOMINATIONS);
            return true;
        }

       
    }
}
