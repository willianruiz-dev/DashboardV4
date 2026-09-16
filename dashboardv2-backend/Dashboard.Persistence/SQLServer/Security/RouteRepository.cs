using Dapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Security;
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
    public class RouteRepository : IRouteRepository
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        public RouteRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<Route>> GetAllAsync()
        {
            if (_cache.TryGetValue(CK.SECURITY_ROUTES, out IEnumerable<Route>? cacheResult))
            {
                if (cacheResult != null) return cacheResult;
            }
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Route> routes = await conn.QueryAsync<Route>(SP.SECURITY_SP_ROUTES_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            };

            _cache.Set(CK.SECURITY_ROUTES, routes, cacheEntryOptions);
            return routes;
        }

        public async Task<Route?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }



        public async Task<Route?> CreateAsync(RouteDto newRoute)
        {
            var args = new
            {
                newRoute.IdFather,
                newRoute.Title,
                newRoute.Route,
                newRoute.Icon,
                newRoute.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            Route? routeCreated = (await conn.QueryAsync<Route>(SP.SECURITY_SP_ROUTES_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.SECURITY_ROUTES);
            return routeCreated;
        }

        public async Task<Route?> UpdateAsync(RouteDto route)
        {
            var args = new
            {
                route.Id,
                route.IdFather,
                route.Title,
                route.Route,
                route.Icon,
                route.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            Route? routeUpdated = (await conn.QueryAsync<Route>(SP.SECURITY_SP_ROUTES_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.SECURITY_ROUTES);
            return routeUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            Route? route = (await conn.QueryAsync<Route>(SP.SECURITY_SP_ROUTES_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (route != null)
            {
                return false;
            }

            _cache.Remove(CK.SECURITY_ROUTES);
            return true;
        }

    }
}
