using AutoMapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Security;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Interfaces.Persistence;
using Microsoft.Extensions.Configuration;
using System.Data;

namespace Dashboard.Application.BL
{
    public class RoleBL : IRoleBL
    {
        private readonly IMapper _mapper;
        private readonly IRoleRepository _roleRepository;
        private readonly IRouteRepository _routeRepository;
        private readonly IConfiguration _configuration;

        public RoleBL(IMapper mapper, IRoleRepository roleRepository, IConfiguration configuration, IRouteRepository routeRepository)
        {
            _mapper = mapper;
            _roleRepository = roleRepository;
            _configuration = configuration;
            _routeRepository = routeRepository;
        }
        public async Task<RoleDto?> GetByIdAsync(int id)
        {
            RoleDto role = _mapper.Map<RoleDto>(await _roleRepository.GetByIdAsync(id));
            role.Routes = _mapper.Map<List<RouteDto>>(await _roleRepository.GetRoutesByRoleAsync(role.Id));
            role.Permissions = _mapper.Map<List<PermissionDto>>(await _roleRepository.GetPermissionsByRoleAsync(role.Id));
            return role;
        }

        public async Task<List<RoleDto>?> GetAllAsync()
        {
            List<RoleDto> roles = _mapper.Map<List<RoleDto>>(await _roleRepository.GetAllAsync());
            foreach (var role in roles)
            {
                role.Routes = _mapper.Map<List<RouteDto>>(await _roleRepository.GetRoutesByRoleAsync(role.Id));
                role.Permissions = _mapper.Map<List<PermissionDto>>(await _roleRepository.GetPermissionsByRoleAsync(role.Id));
            }
            return roles;
        }

        public async Task<RoleDto?> CreateAsync(RoleDto newRole, int idUserCreator)
        {
            var roleToCreate = newRole;
            if (roleToCreate.Role == null) throw new Exception("El usuario a crear no cuenta con nombre");
            roleToCreate.IdUserCreated = idUserCreator;

            var result = _mapper.Map<RoleDto>(await _roleRepository.CreateAsync(roleToCreate));

            if (newRole.Routes.Count > 0)
            {
                foreach (var route in newRole.Routes)
                {
                    await _roleRepository.CreateRouteByRoleAsync(result.Id, route.Id);
                }
            }

            if (newRole.Permissions.Count > 0)
            {
                foreach (var permission in newRole.Permissions)
                {
                    await _roleRepository.CreatePermissionByRoleAsync(result.Id, permission.Id);
                }
            }

            return result;
        }

        public async Task<RoleDto?> UpdateAsync(RoleDto role)
        {
            
            RoleDto? roleToUpdate = _mapper.Map<RoleDto>(await _roleRepository.GetByIdAsync(role.Id));

            if (roleToUpdate == null) throw new Exception("El rol no existe, no es posible modificarlo, debe crear el rol");
            roleToUpdate.Routes = _mapper.Map<List<RouteDto>>(await _roleRepository.GetRoutesByRoleAsync(roleToUpdate.Id));
            roleToUpdate.Permissions = _mapper.Map<List<PermissionDto>>(await _roleRepository.GetPermissionsByRoleAsync(roleToUpdate.Id));
            
            await UpdateRoleRoutes(role.Routes, roleToUpdate);
            await UpdateRolePermissions(role.Permissions, roleToUpdate);

            return _mapper.Map<RoleDto>(await _roleRepository.UpdateAsync(role));
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            if (id <= 0) throw new Exception("No se proporcionó un id para eliminar el recurso");

            return await _roleRepository.DeleteByIdAsync(id);
        }

        public async Task UpdateRoleRoutes(List<RouteDto> routesToSave, RoleDto roleToUpdate)
        {
            // Primero: si se queda sin rutas estas se eliminan en la base de datos
            if (routesToSave.Count == 0 && roleToUpdate.Routes.Count > 0)
            {
                foreach (var route in roleToUpdate.Routes)
                {
                    await _roleRepository.DeleteRouteByRoleAsync(roleToUpdate.Id, route.Id);
                }
            }

            //Segundo se quitan las que ya no esten
            if (routesToSave.Count > 0 && roleToUpdate.Routes.Count > 0)
            {
                var routesToSaveIds = routesToSave.Select(r => r.Id);
                foreach (var route in roleToUpdate.Routes)
                {
                    if (!routesToSaveIds.Contains(route.Id))
                        await _roleRepository.DeleteRouteByRoleAsync(roleToUpdate.Id, route.Id);
                }
            }

            //Tercero se agregan las demás
            if (routesToSave.Count > 0)
            {
                var routesIdsOld = roleToUpdate.Routes.Select(r => r.Id);
                foreach (var route in routesToSave)
                {
                    if (!routesIdsOld.Contains(route.Id))
                        await _roleRepository.CreateRouteByRoleAsync(roleToUpdate.Id, route.Id);
                }
            }
        }

        public async Task UpdateRolePermissions(List<PermissionDto> permitsToSave, RoleDto roleToUpdate)
        {
            // Primero: si se queda sin rutas estas se eliminan en la base de datos
            if (permitsToSave.Count == 0 && roleToUpdate.Permissions.Count > 0)
            {
                foreach (var permission in roleToUpdate.Permissions)
                {
                    await _roleRepository.DeletePermissionByRoleAsync(roleToUpdate.Id, permission.Id);
                }
            }

            //Segundo se quitan las que ya no esten
            if (permitsToSave.Count > 0 && roleToUpdate.Permissions.Count > 0)
            {
                var permissionsToSaveIds = permitsToSave.Select(r => r.Id);
                foreach (var permissions in roleToUpdate.Permissions)
                {
                    if (!permissionsToSaveIds.Contains(permissions.Id))
                        await _roleRepository.DeletePermissionByRoleAsync(roleToUpdate.Id, permissions.Id);
                }
            }

            //Tercero se agregan las demás
            if (permitsToSave.Count > 0)
            {
                var permissionsIdsOld = roleToUpdate.Permissions.Select(r => r.Id);
                foreach (var permission in permitsToSave)
                {
                    if (!permissionsIdsOld.Contains(permission.Id))
                        await _roleRepository.CreatePermissionByRoleAsync(roleToUpdate.Id, permission.Id);
                }
            }
        }
    }
}
