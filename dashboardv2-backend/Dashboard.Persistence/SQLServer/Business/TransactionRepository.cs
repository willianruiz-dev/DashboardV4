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
using Dashboard.Domain.Entities.Masters;
using System.Diagnostics;
using Dashboard.Domain.DTOs.Business;

namespace Dashboard.Persistence.SQLServer
{
    public class TransactionRepository : ITransactionRepository
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public TransactionRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<Transaction>> GetAllAsync()
        {
            if (_cache.TryGetValue(CK.BUSINESS_TRANSACTIONS, out IEnumerable<Transaction>? cachedResult))
            {
                if (cachedResult != null) return cachedResult;
            }
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Transaction> transactions = await conn.QueryAsync<Transaction>(SP.BUSINESS_SP_TRANSACTIONS_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            };

            _cache.Set(CK.BUSINESS_TRANSACTIONS, transactions, cacheEntryOptions);
            return transactions;
        }

        public async Task<Transaction?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }

        public async Task<IEnumerable<Transaction>> GetByPaypadAsync(int idPayPad)
        {
            if (_cache.TryGetValue(CK.BUSINESS_TRANSACTIONS_BY_PAYPAD+idPayPad, out IEnumerable<Transaction>? cachedResult))
            {
                if (cachedResult != null) return cachedResult;
            }

            var args = new
            {
                IdPayPad = idPayPad,
            };
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Transaction> transactions = await conn.QueryAsync<Transaction>(SP.BUSINESS_SP_TRANSACTIONS_GETBY_PAYPAD, args, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            };

            _cache.Set(CK.BUSINESS_TRANSACTIONS_BY_PAYPAD + idPayPad, transactions, cacheEntryOptions);
            return transactions;
        }

        
        public async Task<IEnumerable<Transaction>> GetByPaypadAndDateAsync(int idPayPad, DateTime from, DateTime to)
        {
            IEnumerable<Transaction> transactions = (await GetByPaypadAsync(idPayPad)).Where((t) => t.DATE_CREATED >= from && t.DATE_CREATED <= to);
            return transactions;

            /* DEPRECATED
            var args = new
            {
                IdPayPad = idPayPad,
                FromDate = from,
                ToDate = to,
            };
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Transaction> transactions = await conn.QueryAsync<Transaction>(SP.BUSINESS_SP_TRANSACTIONS_GETBY_PAYPAD_AND_DATE, args, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();
            */

        }

        public async Task<Transaction?> CreateAsync(TransactionDto newTransaction)
        {
            var args = new
            {
                newTransaction.Document,
                newTransaction.Reference,
                newTransaction.Product,
                newTransaction.TotalAmount,
                newTransaction.RealAmount,
                newTransaction.IncomeAmount,
                newTransaction.ReturnAmount,
                newTransaction.Description,
                newTransaction.IdStateTransaction,
                newTransaction.IdTypeTransaction,
                newTransaction.IdTypePayment,
                newTransaction.IdPayPad,
            };
            using var conn = new SqlConnection(_dataBase);
            Transaction? transactionCreated = (await conn.QueryAsync<Transaction>(SP.BUSINESS_SP_TRANSACTIONS_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.BUSINESS_TRANSACTIONS_BY_PAYPAD + newTransaction.IdPayPad);
            _cache.Remove(CK.BUSINESS_TRANSACTIONS);
            return transactionCreated;
        }

        public async Task<Transaction?> UpdateAsync(TransactionDto transaction)
        {
            var args = new
            {
                transaction.Id,
                transaction.Document,
                transaction.Reference,
                transaction.Product,
                transaction.TotalAmount,
                transaction.RealAmount,
                transaction.IncomeAmount,
                transaction.ReturnAmount,
                transaction.Description,
                transaction.IdStateTransaction,
                transaction.IdTypeTransaction,
                transaction.IdTypePayment,
            };
            using var conn = new SqlConnection(_dataBase);
            Transaction? transactionUpdated = (await conn.QueryAsync<Transaction>(SP.BUSINESS_SP_TRANSACTIONS_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.BUSINESS_TRANSACTIONS_BY_PAYPAD + transaction.IdPayPad);
            _cache.Remove(CK.BUSINESS_TRANSACTIONS);
            return transactionUpdated;
        }


        //===============================================================

        public async Task<IEnumerable<TransactionPayPadDto>> GetTransactionsByPayPadAsync(int idPayPad, DateTime startDate, DateTime endDate)
        {
            var args = new
            {
                ID_PayPad = idPayPad,
                Date_Start_Query = startDate,
                Date_End_Query = endDate
            };
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<TransactionPayPadDto> transactions = await conn.QueryAsync<TransactionPayPadDto>(SP.BUSINESS_SP_GET_TRANSACTION_PAYPAD, args, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            return transactions;
        }

        // Transaction details
        public async Task<IEnumerable<TransactionDetail>> GetAllDetailsAsync()
        {
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<TransactionDetail> details = await conn.QueryAsync<TransactionDetail>(SP.BUSINESS_SP_TRANSACTIONSDETAIL_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return details;
        }

        public async Task<IEnumerable<TransactionDetail>> GetDetailsByIdTranAsync(int idTransaction)
        {
            var args = new
            {
                IdTransaction = idTransaction,
            };
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<TransactionDetail> details = await conn.QueryAsync<TransactionDetail>(SP.BUSINESS_SP_TRANSACTIONSDETAIL_GETBY_TRANSACTION, args, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return details;
        }

        public async Task<TransactionDetail?> CreateDetailAsync(TransactionDetailDto newTransactionDetail)
        {
            var args = new
            {
                newTransactionDetail.IdTransaction,
                newTransactionDetail.IdCurrencyDenomination,
                newTransactionDetail.IdTypeOperation
            };
            using var conn = new SqlConnection(_dataBase);
            TransactionDetail? datailCreated = (await conn.QueryAsync<TransactionDetail>(SP.BUSINESS_SP_TRANSACTIONSDETAIL_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return datailCreated;
        }

        public async Task<TransactionDetail?> UpdateDetailAsync(TransactionDetailDto transactionDetail)
        {
            var args = new
            {
                transactionDetail.Id,
                transactionDetail.IdTransaction,
                transactionDetail.IdCurrencyDenomination,
                transactionDetail.IdTypeOperation
            };
            using var conn = new SqlConnection(_dataBase);
            TransactionDetail? detailUpdated = (await conn.QueryAsync<TransactionDetail>(SP.BUSINESS_SP_TRANSACTIONSDETAIL_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return detailUpdated;
        }

         
        public async Task<IEnumerable<TransactionRating>> GetAllRatingsAsync()
        {
            if (_cache.TryGetValue(CK.BUSINESS_TRANSACTIONS_RATINGS, out IEnumerable<TransactionRating>? cachedResult))
            {
                if (cachedResult != null) return cachedResult;
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<TransactionRating> transactionRatings = await conn.QueryAsync<TransactionRating>(SP.BUSINESS_SP_TRANSACTIONRATINGS_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            };

            _cache.Set(CK.BUSINESS_TRANSACTIONS_RATINGS, transactionRatings, cacheEntryOptions);
            return transactionRatings;
        }

        public async Task<TransactionRating?> CreateRatingAsync(int idTransaction, int rating)
        {
            var args = new
            {
                IdTransaction = idTransaction,
                Rating = rating
            };
            using var conn = new SqlConnection(_dataBase);
            TransactionRating? ratingCreated = (await conn.QueryAsync<TransactionRating>(SP.BUSINESS_SP_TRANSACTIONRATINGS_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.BUSINESS_TRANSACTIONS_RATINGS);
            return ratingCreated;
        }
    }
}
