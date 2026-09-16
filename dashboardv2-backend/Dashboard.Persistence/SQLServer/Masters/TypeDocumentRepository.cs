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
using System.Diagnostics;

namespace Dashboard.Persistence.SQLServer
{
    public class TypeDocumentRepository : IGenericRepository<TypeDocument, TypeDocumentDto>
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public TypeDocumentRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<TypeDocument>> GetAllAsync()
        {
            
            if (_cache.TryGetValue(CK.MASTERS_TYPE_DOCUMENT, out IEnumerable<TypeDocument>? cachedResult))
            {
                if (cachedResult != null)
                {
                    return cachedResult;
                }
                
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<TypeDocument> typeDoc = await conn.QueryAsync<TypeDocument>(SP.MASTERS_SP_TYPEDOC_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1)
            };

            _cache.Set(CK.MASTERS_TYPE_DOCUMENT, typeDoc, cacheEntryOptions);
            return typeDoc;
        }

        public async Task<TypeDocument?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }



        public async Task<TypeDocument?> CreateAsync(TypeDocumentDto newTypeDocument)
        {
            var args = new
            {
                newTypeDocument.TypeDocument,
                newTypeDocument.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            TypeDocument? typeDocCreated = (await conn.QueryAsync<TypeDocument>(SP.MASTERS_SP_TYPEDOC_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_TYPE_DOCUMENT);
            return typeDocCreated;
        }

        public async Task<TypeDocument?> UpdateAsync(TypeDocumentDto typeDoc)
        {
            var args = new
            {
                typeDoc.Id,
                typeDoc.TypeDocument,
                typeDoc.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            TypeDocument? typeDocUpdated = (await conn.QueryAsync<TypeDocument>(SP.MASTERS_SP_TYPEDOC_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.MASTERS_TYPE_DOCUMENT);
            return typeDocUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            TypeDocument? typeDoc = (await conn.QueryAsync<TypeDocument>(SP.MASTERS_SP_TYPEDOC_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (typeDoc != null)
            {
                return false;
            }

            _cache.Remove(CK.MASTERS_TYPE_DOCUMENT);
            return true;
        }

       
    }
}
