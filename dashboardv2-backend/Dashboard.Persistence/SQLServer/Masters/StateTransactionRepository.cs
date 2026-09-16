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
    public class StateTransactionRepository : IGenericRepository<StateTransaction, StateTransactionDto>
    {
        private readonly string? _dataBase;

        private readonly IMemoryCache _cache;

        public StateTransactionRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<StateTransaction>> GetAllAsync()
        {

            if (_cache.TryGetValue(CK.MASTERS_STATE_TRANSACTION, out IEnumerable<StateTransaction>? cachedResult))
            {
                if (cachedResult != null) return cachedResult;
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<StateTransaction> stateTransaction = await conn.QueryAsync<StateTransaction>(SP.MASTERS_SP_STATETRANSACTION_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1)
            };

            _cache.Set(CK.MASTERS_STATE_TRANSACTION, stateTransaction, cacheEntryOptions);
            return stateTransaction;
        }

        public async Task<StateTransaction?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }



        public async Task<StateTransaction?> CreateAsync(StateTransactionDto newStateTransaction)
        {
            var args = new
            {
                newStateTransaction.State,
                newStateTransaction.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            StateTransaction? stateTransactionCreated = (await conn.QueryAsync<StateTransaction>(SP.MASTERS_SP_STATETRANSACTION_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_STATE_TRANSACTION);
            return stateTransactionCreated;
        }

        public async Task<StateTransaction?> UpdateAsync(StateTransactionDto stateTransaction)
        {
            var args = new
            {
                stateTransaction.Id,
                stateTransaction.State,
                stateTransaction.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            StateTransaction? stateTransactionUpdated = (await conn.QueryAsync<StateTransaction>(SP.MASTERS_SP_STATETRANSACTION_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_STATE_TRANSACTION);
            return stateTransactionUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            StateTransaction? stateTransaction = (await conn.QueryAsync<StateTransaction>(SP.MASTERS_SP_STATETRANSACTION_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (stateTransaction != null)
            {
                return false;
            }

            _cache.Remove(CK.MASTERS_STATE_TRANSACTION);
            return true;
        }

       
    }
}
