using Dapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Security;
using Dashboard.Domain.Exceptions;
using Dashboard.Domain.Interfaces.Persistence;
using Dashboard.Domain.Variables;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using System.Data;
using System.Data.SqlClient;
using CK = Dashboard.Domain.Variables.CacheKeys;
using SP = Dashboard.Domain.Variables.Procedures;

namespace Dashboard.Persistence.SQLServer.Security
{
    public class UserRepository : IUserRepository
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public UserRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<User>> GetAllAsync()
        {
            if (_cache.TryGetValue(CK.SECURITY_USERS, out IEnumerable<User>? cachedResult))
            {
                if (cachedResult != null) return cachedResult;
            }

            try
            {
                using var conn = new SqlConnection(_dataBase);
                IEnumerable<User> users = await conn.QueryAsync<User>(SP.SECURITY_SP_USERS_GETALL, null, commandType: CommandType.StoredProcedure);

                await conn.CloseAsync();
                await conn.DisposeAsync();

                var cacheEntryOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                };

                _cache.Set(CK.SECURITY_USERS, users, cacheEntryOptions);
                return users;
            }
            catch (Exception ex)
            {
                throw new DbException(ex.Message, ex);
            }
        }

        public async Task<User?> GetByIdAsync(long id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }

        public async Task<string?> GetUserPassword(string document)
        {
            try
            {
                var args = new
                {
                    document
                };
                using var conn = new SqlConnection(_dataBase);
                string? pwd = (await conn.QueryAsync<string>(SP.SECURITY_SP_USERS_GETPWD, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

                await conn.CloseAsync();
                await conn.DisposeAsync();
                return pwd;
            }
            catch (Exception ex)
            {
                throw new DbException(ex.Message,ex);
            }
        }


        public async Task<User?> CreateAsync(UserDto newUser)
        {
            try
            {
                var args = new
                {
                    newUser.UserName,
                    newUser.Pwd,
                    newUser.Document,
                    newUser.IdTypeDocument,
                    newUser.Name,
                    newUser.LastName,
                    newUser.IdRole,
                    newUser.Phone,
                    newUser.Email,
                    newUser.Img,
                    newUser.IdClient,
                    newUser.Status,
                    newUser.IdUserCreated
                };
                using var conn = new SqlConnection(_dataBase);
                User? userCreated = (await conn.QueryAsync<User>(SP.SECURITY_SP_USERS_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

                await conn.CloseAsync();
                await conn.DisposeAsync();

                _cache.Remove(CK.SECURITY_USERS);
                return userCreated;
            }
            catch (Exception ex)
            {
                throw new DbException(ex.Message,ex);
            }
        }

        public async Task<User?> UpdateAsync(UserDto user)
        {
            try
            {
                var args = new
                {
                    user.Id,
                    user.UserName,
                    user.Pwd,
                    user.Document,
                    user.IdTypeDocument,
                    user.Name,
                    user.LastName,
                    user.IdRole,
                    user.Phone,
                    user.Email,
                    user.Img,
                    user.IdClient,
                    user.Status,
                    user.IdUserUpdated
                };
                using var conn = new SqlConnection(_dataBase);
                User? userUpdated = (await conn.QueryAsync<User>(SP.SECURITY_SP_USERS_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

                await conn.CloseAsync();
                await conn.DisposeAsync();

                _cache.Remove(CK.SECURITY_USERS);
                return userUpdated;
            }
            catch (Exception ex)
            {
                throw new DbException(ex.Message,ex);
            }
        }

        public async Task<bool> DeleteByIdAsync(long id)
        {
            try
            {
                var args = new
                {
                    Id = id
                };
                using var conn = new SqlConnection(_dataBase);
                User? user = (await conn.QueryAsync<User>(SP.SECURITY_SP_USERS_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

                await conn.CloseAsync();
                await conn.DisposeAsync();

                if (user != null)
                {
                    return false;
                }

                _cache.Remove(CK.SECURITY_USERS);
                return true;
            }
            catch (Exception ex)
            {
                throw new DbException(ex.Message,ex);
            }
        }
    }
}
