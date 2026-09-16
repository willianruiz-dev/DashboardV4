using Dapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Business;
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
    public class ClientRepository : IClientRepository
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public ClientRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<Client>> GetAllAsync()
        {
            if (_cache.TryGetValue(CK.BUSINESS_CLIENTS, out IEnumerable<Client>? cacheResult))
            {
                if (cacheResult != null) return cacheResult;
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Client> clients = await conn.QueryAsync<Client>(SP.BUSINESS_SP_CLIENTS_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            };

            _cache.Set(CK.BUSINESS_CLIENTS, clients, cacheEntryOptions);
            return clients;
        }

        public async Task<Client?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }

        


        public async Task<Client?> CreateAsync(ClientDto newClient)
        {
            var args = new
            {
                newClient.Name,
                newClient.Nit,
                newClient.Email,
                newClient.Phone,
                newClient.IdRegion,
                newClient.LogoImg,
                ImgExt = newClient.ImgExt,
                newClient.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            Client? clientCreated = (await conn.QueryAsync<Client>(SP.BUSINESS_SP_CLIENTS_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.BUSINESS_CLIENTS);
            return clientCreated;
        }

        public async Task<Client?> UpdateAsync(ClientDto client)
        {
            var args = new
            {
                client.Id,
                client.Name,
                client.Nit,
                client.Email,
                client.Phone,
                client.IdRegion,
                client.LogoImg,
                client.ImgExt,
                client.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            Client? clientUpdated = (await conn.QueryAsync<Client>(SP.BUSINESS_SP_CLIENTS_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.BUSINESS_CLIENTS);
            return clientUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            Client? role = (await conn.QueryAsync<Client>(SP.BUSINESS_SP_CLIENTS_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (role != null)
            {
                return false;
            }

            _cache.Remove(CK.BUSINESS_CLIENTS);
            return true;
        }

       
    }
}
