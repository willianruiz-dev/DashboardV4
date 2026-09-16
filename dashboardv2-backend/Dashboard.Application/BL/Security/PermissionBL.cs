using AutoMapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Interfaces.Persistence;
using Microsoft.Extensions.Configuration;

namespace Dashboard.Application.BL
{
    public class PermissionBL : IPermissionBL 
    { 
    
        private readonly IMapper _mapper;
        private readonly IPermissionRepository _permissionRepository;

        public PermissionBL(IMapper mapper, IPermissionRepository permissionRepository)
        {
            _mapper = mapper;
            _permissionRepository = permissionRepository;
        }
        public async Task<PermissionDto?> GetByIdAsync(int id)
        {
            return _mapper.Map<PermissionDto>(await _permissionRepository.GetByIdAsync(id));
        }

        public async Task<List<PermissionDto>?> GetAllAsync()
        {
            return _mapper.Map<List<PermissionDto>>(await _permissionRepository.GetAllAsync());
        }
        
    }
}
