using Dapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Masters;
using Dashboard.Domain.Entities.Security;
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
    public class TransactionTypeRepository : IGenericRepository<TransactionType, TransactionTypeDto>
    {
        private readonly string? _dataBase;

        private readonly IMemoryCache _cache;
        public TransactionTypeRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<TransactionType>> GetAllAsync()
        {
            if (_cache.TryGetValue(CK.MASTERS_TYPE_TRANSACTION, out IEnumerable<TransactionType>? cachedResult))
            {
                if (cachedResult != null) return cachedResult;
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<TransactionType> transactionType = await conn.QueryAsync<TransactionType>(SP.MASTERS_SP_TRANTYPE_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1)
            };

            _cache.Set(CK.MASTERS_TYPE_TRANSACTION, transactionType, cacheEntryOptions);
            return transactionType;
        }

        public async Task<TransactionType?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }



        public async Task<TransactionType?> CreateAsync(TransactionTypeDto newTransactionType)
        {
            var args = new
            {
                newTransactionType.TranType,
                newTransactionType.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            TransactionType? transactionTypeCreated = (await conn.QueryAsync<TransactionType>(SP.MASTERS_SP_TRANTYPE_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_TYPE_TRANSACTION);
            return transactionTypeCreated;
        }

        public async Task<TransactionType?> UpdateAsync(TransactionTypeDto transactionType)
        {
            var args = new
            {
                transactionType.Id,
                transactionType.TranType,
                transactionType.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            TransactionType? transactionTypeUpdated = (await conn.QueryAsync<TransactionType>(SP.MASTERS_SP_TRANTYPE_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_TYPE_TRANSACTION);
            return transactionTypeUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            TransactionType? transactionType = (await conn.QueryAsync<TransactionType>(SP.MASTERS_SP_TRANTYPE_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (transactionType != null)
            {
                return false;
            }

            _cache.Remove(CK.MASTERS_TYPE_TRANSACTION);
            return true;
        }

       
    }
}
