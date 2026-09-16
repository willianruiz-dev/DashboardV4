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
    public class CurrencyDenominationRepository : IGenericRepository<CurrencyDenomination, CurrencyDenominationDto>
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public CurrencyDenominationRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<CurrencyDenomination>> GetAllAsync()
        {
            
            if (_cache.TryGetValue(CK.MASTERS_CURRENCY_DENOMINATIONS, out IEnumerable<CurrencyDenomination>? cachedResult))
            {
                if (cachedResult != null ) return cachedResult;
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<CurrencyDenomination> currencyDenomination = await conn.QueryAsync<CurrencyDenomination>(SP.MASTERS_SP_CURRDENOM_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1)
            };

            _cache.Set(CK.MASTERS_CURRENCY_DENOMINATIONS, currencyDenomination, cacheEntryOptions);

            return currencyDenomination;
        }

        public async Task<CurrencyDenomination?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }



        public async Task<CurrencyDenomination?> CreateAsync(CurrencyDenominationDto newCurrencyDenomination)
        {
            var args = new
            {
                newCurrencyDenomination.IdCurrency,
                newCurrencyDenomination.Value,
                newCurrencyDenomination.Img,
                newCurrencyDenomination.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            CurrencyDenomination? currencyDenominationCreated = (await conn.QueryAsync<CurrencyDenomination>(SP.MASTERS_SP_CURRDENOM_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_CURRENCY_DENOMINATIONS);
            return currencyDenominationCreated;
        }

        public async Task<CurrencyDenomination?> UpdateAsync(CurrencyDenominationDto currencyDenomination)
        {
            var args = new
            {
                currencyDenomination.Id,
                currencyDenomination.IdCurrency,
                currencyDenomination.Value,
                currencyDenomination.Img,
                currencyDenomination.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            CurrencyDenomination? currencyDenominationUpdated = (await conn.QueryAsync<CurrencyDenomination>(SP.MASTERS_SP_CURRDENOM_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_CURRENCY_DENOMINATIONS);
            return currencyDenominationUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            CurrencyDenomination? currencyDenomination = (await conn.QueryAsync<CurrencyDenomination>(SP.MASTERS_SP_CURRDENOM_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (currencyDenomination != null)
            {
                return false;
            }

            _cache.Remove(CK.MASTERS_CURRENCY_DENOMINATIONS);
            return true;
        }

       
    }
}
