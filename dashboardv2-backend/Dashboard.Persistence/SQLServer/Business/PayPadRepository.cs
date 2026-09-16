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
using Newtonsoft.Json;

namespace Dashboard.Persistence.SQLServer
{
    public class PayPadRepository : IPayPadRepository
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public PayPadRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<PayPad>> GetAllAsync()
        {
            if (_cache.TryGetValue(CK.BUSINESS_PAYPADS, out IEnumerable<PayPad>? cachedResult))
            {
                if (cachedResult != null) return cachedResult;
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<PayPad> paypad = await conn.QueryAsync<PayPad>(SP.BUSINESS_SP_PAYPAD_GETALL, null, commandType: CommandType.StoredProcedure);
            paypad = paypad.Where(x => x.STATUS != 0);
            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            };

            _cache.Set(CK.BUSINESS_PAYPADS, paypad, cacheEntryOptions);
            return paypad;
        }

        public async Task<PayPad?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }

        public async Task<string?> GetPaypadPasswordAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            string? password = (await conn.QueryAsync<string>(SP.BUSINESS_SP_PAYPAD_GETPWD, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return password;
        }

        public async Task<IEnumerable<PayPadStorage>> GetStorageByIdPaypadAsync(int idPaypad)
        {
            if (_cache.TryGetValue(CK.BUSINESS_PAYPAD_STORAGE+idPaypad, out IEnumerable<PayPadStorage>? cachedResult))
            {
                if (cachedResult != null) return cachedResult;
            }

            var args = new
            {
                IdPayPad = idPaypad
            };
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<PayPadStorage> storages = await conn.QueryAsync<PayPadStorage>(SP.BUSINESS_SP_PAYPAD_GET_STORAGE, args, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1)
            };

            _cache.Set(CK.BUSINESS_PAYPAD_STORAGE + idPaypad, storages, cacheEntryOptions);
            return storages;
        }

        public async Task<PayPad?> CreateAsync(PayPadDto newPayPad)
        {
            var args = new
            {
                newPayPad.Username,
                newPayPad.Pwd,
                newPayPad.Description,
                newPayPad.Longitude,
                newPayPad.Latitude,
                newPayPad.Status,
                newPayPad.IdCurrency,
                newPayPad.IdOffice,
                newPayPad.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            PayPad? paypadCreated = (await conn.QueryAsync<PayPad>(SP.BUSINESS_SP_PAYPAD_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.BUSINESS_PAYPADS);
            return paypadCreated;
        }

        public async Task<PayPad?> UpdateAsync(PayPadDto paypad)
        {
            var args = new
            {
                paypad.Id,
                paypad.Username,
                paypad.Pwd,
                paypad.Description,
                paypad.Longitude,
                paypad.Latitude,
                paypad.Status,
                paypad.IdCurrency,
                paypad.IdOffice,
                paypad.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            PayPad? paypadUpdated = (await conn.QueryAsync<PayPad>(SP.BUSINESS_SP_PAYPAD_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.BUSINESS_PAYPADS);
            return paypadUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            PayPad? role = (await conn.QueryAsync<PayPad>(SP.BUSINESS_SP_PAYPAD_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (role != null)
            {
                return false;
            }
            _cache.Remove(CK.BUSINESS_PAYPADS);
            return true;
        }

        public async Task<PayPadStorage?> CreateStorageAsync(PayPadStorageDto newStorage)
        {
            var args = new
            {
                newStorage.IdPayPad,
                newStorage.IdCurrencyDenomination,
                newStorage.IsDispensing,
                newStorage.MinDpQuantity
            };
            using var conn = new SqlConnection(_dataBase);
            PayPadStorage? storageCreated = (await conn.QueryAsync<PayPadStorage>(SP.BUSINESS_SP_PAYPAD_CREATE_STORAGE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.BUSINESS_PAYPAD_STORAGE+newStorage.IdPayPad);
            return storageCreated;
        }

        public async Task<PayPadConfiguration?> CreateConfigurationAsync(PayPadConfigurationDto newConfiguration)
        {
            var args = new
            {
                newConfiguration.IdPaypad,
                IsDebug = newConfiguration.Debug,
                newConfiguration.ValidatePeripherals,
                newConfiguration.ScannerPort,
                newConfiguration.ArduinoPort,
                newConfiguration.DispenserPort,
                newConfiguration.MeiPort,
                newConfiguration.PrinterPort,
                newConfiguration.DispenserDenominations,
                ExtraDataJson = JsonConvert.SerializeObject(newConfiguration.ExtraDataJson),
                newConfiguration.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            PayPadConfiguration? configurationCreated = (await conn.QueryAsync<PayPadConfiguration>(SP.BUSINESS_SP_PAYPAD_CREATE_CONFIGURATION, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.BUSINESS_PAYPAD_CONFIGURATION);
            return configurationCreated;
        }

        public async Task<PayPadConfiguration?> UpdateConfigurationAsync(PayPadConfigurationDto newConfiguration)
        {
            var args = new
            {
                newConfiguration.Id,
                IsDebug = newConfiguration.Debug,
                newConfiguration.ValidatePeripherals,
                newConfiguration.ScannerPort,
                newConfiguration.ArduinoPort,
                newConfiguration.DispenserPort,
                newConfiguration.MeiPort,
                newConfiguration.PrinterPort,
                newConfiguration.DispenserDenominations,
                ExtraDataJson = JsonConvert.SerializeObject(newConfiguration.ExtraDataJson),
                newConfiguration.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            PayPadConfiguration? configurationCreated = (await conn.QueryAsync<PayPadConfiguration>(SP.BUSINESS_SP_PAYPAD_UPDATE_CONFIGURATION, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.BUSINESS_PAYPAD_CONFIGURATION);
            return configurationCreated;
        }

        public async Task<PayPadConfiguration?> GetConfigurationByIdAsync(int id)
        {
            if (_cache.TryGetValue(CK.BUSINESS_PAYPAD_CONFIGURATION, out IEnumerable<PayPadConfiguration>? cachedResult))
            {
                if (cachedResult != null) return cachedResult.Where((paypadConfig) => paypadConfig.ID_PAYPAD == id).FirstOrDefault();
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<PayPadConfiguration> paypadConfigurations = (await conn.QueryAsync<PayPadConfiguration>(SP.BUSINESS_SP_PAYPAD_CONFIGURATION_GETALL, null, commandType: CommandType.StoredProcedure));

            await conn.CloseAsync();
            await conn.DisposeAsync();


            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            };

            _cache.Set(CK.BUSINESS_PAYPAD_CONFIGURATION, paypadConfigurations, cacheEntryOptions);
            return paypadConfigurations.Where((paypadConfig) => paypadConfig.ID_PAYPAD == id).FirstOrDefault();

        }
    }
}
