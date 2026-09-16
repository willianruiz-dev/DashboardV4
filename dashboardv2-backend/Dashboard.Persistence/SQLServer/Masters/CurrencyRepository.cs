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
    public class CurrencyRepository : IGenericRepository<Currency, CurrencyDto>
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public CurrencyRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<Currency>> GetAllAsync()
        {
            if (_cache.TryGetValue(CK.MASTERS_CURRENCIES, out IEnumerable<Currency>? cachedResult))
            {
                if (cachedResult != null) return cachedResult;
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Currency> currency = await conn.QueryAsync<Currency>(SP.MASTERS_SP_CURRENCY_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1)
            };

            _cache.Set(CK.MASTERS_CURRENCIES, currency, cacheEntryOptions);
            return currency;
        }

        public async Task<Currency?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }



        public async Task<Currency?> CreateAsync(CurrencyDto newCurrency)
        {
            var args = new
            {
                newCurrency.Description,
                newCurrency.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            Currency? currencyCreated = (await conn.QueryAsync<Currency>(SP.MASTERS_SP_CURRENCY_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_CURRENCIES);
            return currencyCreated;
        }

        public async Task<Currency?> UpdateAsync(CurrencyDto currency)
        {
            var args = new
            {
                currency.Id,
                currency.Description,
                currency.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            Currency? currencyUpdated = (await conn.QueryAsync<Currency>(SP.MASTERS_SP_CURRENCY_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_CURRENCIES);
            return currencyUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            Currency? currency = (await conn.QueryAsync<Currency>(SP.MASTERS_SP_CURRENCY_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (currency != null)
            {
                return false;
            }

            _cache.Remove(CK.MASTERS_CURRENCIES);
            return true;
        }

       
    }
}
