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
    public class PaymentTypeRepository : IGenericRepository<PaymentType, PaymentTypeDto>
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public PaymentTypeRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<PaymentType>> GetAllAsync()
        {
            if (_cache.TryGetValue(CK.MASTERS_PAYMENT_TYPE, out IEnumerable<PaymentType>? cachedResult))
            {
                if (cachedResult != null) return cachedResult;
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<PaymentType> paymentType = await conn.QueryAsync<PaymentType>(SP.MASTERS_SP_PAYMENTTYPE_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1)
            };

            _cache.Set(CK.MASTERS_PAYMENT_TYPE, paymentType, cacheEntryOptions);
            return paymentType;
        }

        public async Task<PaymentType?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }



        public async Task<PaymentType?> CreateAsync(PaymentTypeDto newPaymentType)
        {
            var args = new
            {
                newPaymentType.PaymentType,
                newPaymentType.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            PaymentType? paymentTypeCreated = (await conn.QueryAsync<PaymentType>(SP.MASTERS_SP_PAYMENTTYPE_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_PAYMENT_TYPE);
            return paymentTypeCreated;
        }

        public async Task<PaymentType?> UpdateAsync(PaymentTypeDto paymentType)
        {
            var args = new
            {
                paymentType.Id,
                paymentType.PaymentType,
                paymentType.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            PaymentType? paymentTypeUpdated = (await conn.QueryAsync<PaymentType>(SP.MASTERS_SP_PAYMENTTYPE_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_PAYMENT_TYPE);
            return paymentTypeUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            PaymentType? paymentType = (await conn.QueryAsync<PaymentType>(SP.MASTERS_SP_PAYMENTTYPE_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (paymentType != null)
            {
                return false;
            }

            _cache.Remove(CK.MASTERS_PAYMENT_TYPE);
            return true;
        }

       
    }
}
