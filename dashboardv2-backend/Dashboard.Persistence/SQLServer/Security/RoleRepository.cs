using Dapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Security;
using Dashboard.Domain.Interfaces.Persistence;
using Dashboard.Domain.Variables;
using Microsoft.Extensions.Configuration;
using System.Data;
using System.Data.SqlClient;
using SP = Dashboard.Domain.Variables.Procedures;
using CK = Dashboard.Domain.Variables.CacheKeys;
using Microsoft.Extensions.Caching.Memory;

namespace Dashboard.Persistence.SQLServer.Security
{
    public class RoleRepository : IRoleRepository
    {
        private readonly string? _dataBase;
        private readonly IMemoryCache _cache;

        //TODO: try catch de errores de base de datos en todos los repositorios
        public RoleRepository(IConfiguration configuration, IMemoryCache cache)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
            _cache = cache;
        }

        public async Task<IEnumerable<Role>> GetAllAsync()
        {
            if (_cache.TryGetValue(CK.SECURITY_ROLES, out IEnumerable<Role>? cacheResult))
            {
                if (cacheResult != null) return cacheResult;
            }

            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Role> roles = await conn.QueryAsync<Role>(SP.SECURITY_SP_ROLES_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            };

            _cache.Set(CK.SECURITY_ROLES, roles, cacheEntryOptions);
            return roles;
        }

        public async Task<Role?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }

        public async Task<Role?> CreateAsync(RoleDto newRole)
        {
            var args = new
            {
                newRole.Role,
                newRole.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            Role? roleCreated = (await conn.QueryAsync<Role>(SP.SECURITY_SP_ROLES_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.SECURITY_ROLES);
            return roleCreated;
        }

        public async Task<Role?> UpdateAsync(RoleDto role)
        {
            var args = new
            {
                role.Id,
                role.Role,
                role.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            Role? roleUpdated = (await conn.QueryAsync<Role>(SP.SECURITY_SP_ROLES_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.SECURITY_ROLES);
            return roleUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            Role? role = (await conn.QueryAsync<Role>(SP.SECURITY_SP_ROLES_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (role != null)
            {
                return false;
            }

            _cache.Remove(CK.SECURITY_ROLES);
            return true;
        }

        public async Task<List<Route>> GetRoutesByRoleAsync(int idRole)
        {
            List<int> routesIds;
            List<Route> routesList;

            bool isRoutesByRoleCached= _cache.TryGetValue(CK.SECURITY_ROUTES_BY_ROLE, out IEnumerable<RouteByRole>? routesByRoles);
            bool isRoutesCached = _cache.TryGetValue(CK.SECURITY_ROUTES, out IEnumerable<Route>? routes);

            if ((isRoutesByRoleCached && isRoutesCached) &&
                (routesByRoles != null && routes != null))
            {
                routesIds = routesByRoles.Where(r => r.ID_ROLE == idRole).Select(r => r.ID_ROUTE).ToList();
                routesList = routes.Where(route => routesIds.Contains(route.ID)).ToList();
                return routesList;
            }


            using var conn = new SqlConnection(_dataBase);
            routesByRoles = await conn.QueryAsync<RouteByRole>(SP.SECURITY_SP_ROUTESBYROLES_GETALL, null, commandType: CommandType.StoredProcedure);
            routes = await conn.QueryAsync<Route>(SP.SECURITY_SP_ROUTES_GETALL, null, commandType: CommandType.StoredProcedure);
            await conn.CloseAsync();
            await conn.DisposeAsync();

            routesIds = routesByRoles.Where(r => r.ID_ROLE == idRole).Select(r => r.ID_ROUTE).ToList();
            routesList = routes.Where(route => routesIds.Contains(route.ID)).ToList();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            };

            _cache.Set(CK.SECURITY_ROUTES_BY_ROLE, routesByRoles, cacheEntryOptions);
            _cache.Set(CK.SECURITY_ROUTES, routes, cacheEntryOptions);
            return routesList;
        }

        public async Task<RouteByRole?> CreateRouteByRoleAsync(int idRole, int idRoute)
        {
            var args = new
            {
                IdRole = idRole,
                IdRoute = idRoute
            };
            using var conn = new SqlConnection(_dataBase);
            RouteByRole? routesByRoles = (await conn.QueryAsync<RouteByRole>(SP.SECURITY_SP_ROUTESBYROLES_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.SECURITY_ROUTES_BY_ROLE);
            return routesByRoles;
        }

        public async Task<bool> DeleteRouteByRoleAsync(int idRole, int idRoute)
        {
            var args = new
            {
                IdRole = idRole,
                IdRoute = idRoute
            };
            using var conn = new SqlConnection(_dataBase);
            RouteByRole? role = (await conn.QueryAsync<RouteByRole>(SP.SECURITY_SP_ROUTESBYROLES_DELETE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (role != null)
            {
                return false;
            }

            _cache.Remove(CK.SECURITY_ROUTES_BY_ROLE);
            return true;
        }

        public async Task<List<Permission>> GetPermissionsByRoleAsync(int idRole)
        {
            List<int> permissionsIds;
            List<Permission> permissionsList;

            bool isPermissionsByRoleCached = _cache.TryGetValue(CK.SECURITY_PERMISSIONS_BY_ROLE, out IEnumerable<PermissionByRole>? permissionsByRoles);
            bool isPermissionsCached = _cache.TryGetValue(CK.SECURITY_PERMISSIONS, out IEnumerable<Permission>? permissions);

            if ((isPermissionsByRoleCached && isPermissionsCached) &&
                (permissionsByRoles != null && permissions != null))
            {
                permissionsIds = permissionsByRoles.Where(r => r.ID_ROLE == idRole).Select(r => r.ID_PERMISSION).ToList();
                permissionsList = permissions.Where(permission => permissionsIds.Contains(permission.ID)).ToList();
                return permissionsList;
            }

            using var conn = new SqlConnection(_dataBase);
            permissionsByRoles = await conn.QueryAsync<PermissionByRole>(SP.SECURITY_SP_PERMISSIONSBYROLES_GETALL, null, commandType: CommandType.StoredProcedure);
            permissions = await conn.QueryAsync<Permission>(SP.SECURITY_SP_PERMISSIONS_GETALL, null, commandType: CommandType.StoredProcedure);

            permissionsIds = permissionsByRoles.Where(p => p.ID_ROLE == idRole).Select(p => p.ID_PERMISSION).ToList();
            permissionsList = permissions.Where(permission => permissionsIds.Contains(permission.ID)).ToList();
            await conn.CloseAsync();
            await conn.DisposeAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            };

            _cache.Set(CK.SECURITY_PERMISSIONS_BY_ROLE, permissionsByRoles, cacheEntryOptions);
            _cache.Set(CK.SECURITY_PERMISSIONS, permissions, cacheEntryOptions);
            return permissionsList;
        }

        public async Task<PermissionByRole?> CreatePermissionByRoleAsync(int idRole, int idPermission)
        {
            var args = new
            {
                IdRole = idRole,
                IdPermission = idPermission
            };
            using var conn = new SqlConnection(_dataBase);
            PermissionByRole? permissionsByRoles = (await conn.QueryAsync<PermissionByRole>(SP.SECURITY_SP_PERMISSIONSBYROLES_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            _cache.Remove(CK.SECURITY_PERMISSIONS_BY_ROLE);
            return permissionsByRoles;
        }

        public async Task<bool> DeletePermissionByRoleAsync(int idRole, int idPermission)
        {
            var args = new
            {
                IdRole = idRole,
                IdPermission = idPermission
            };
            using var conn = new SqlConnection(_dataBase);
            PermissionByRole? role = (await conn.QueryAsync<PermissionByRole>(SP.SECURITY_SP_PERMISSIONSBYROLES_DELETE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (role != null)
            {
                return false;
            }

            _cache.Remove(CK.SECURITY_PERMISSIONS_BY_ROLE);
            return true;
        }
    }
}
