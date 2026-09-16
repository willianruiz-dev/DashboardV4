using AutoMapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Interfaces.Persistence;
using Microsoft.Extensions.Configuration;

namespace Dashboard.Application.BL
{
    public class OfficeBL : IOfficeBL 
    { 
    
        private readonly IMapper _mapper;
        private readonly IOfficeRepository _officeRepository;
        private readonly IConfiguration _configuration;

        public OfficeBL(IMapper mapper, IOfficeRepository officeRepository, IConfiguration configuration)
        {
            _mapper = mapper;
            _officeRepository = officeRepository;
            _configuration = configuration;
        }
        public async Task<OfficeDto?> GetByIdAsync(int id)
        {
            return _mapper.Map<OfficeDto>(await _officeRepository.GetByIdAsync(id));
        }

        public async Task<List<OfficeDto>?> GetAllAsync()
        {
            return _mapper.Map<List<OfficeDto>>(await _officeRepository.GetAllAsync());
        }

        public async Task<List<OfficeDto>?> GetByClientAsync(int idClient)
        {
            return _mapper.Map<List<OfficeDto>>((await _officeRepository.GetAllAsync()).Where(x => x.ID_CLIENT == idClient));
        }

        public async Task<OfficeDto?> CreateAsync(OfficeDto newOffice, int idUserCreator)
        {
            var officeToCreate = newOffice;
            officeToCreate.IdUserCreated = idUserCreator;
            if (string.IsNullOrEmpty(officeToCreate.Name)) throw new Exception("No se proporcionó nombre de sucursal");
            if (string.IsNullOrEmpty(officeToCreate.Address)) throw new Exception("No se proporcionó dirección de sucursal");
            if (officeToCreate.IdClient <= 0) throw new Exception("No se proporcionó cliente asociado a la sucursal");
            return _mapper.Map<OfficeDto>(await _officeRepository.CreateAsync(officeToCreate));
        }

        public async Task<OfficeDto?> UpdateAsync(OfficeDto office)
        {
            // validacion de existencia
            OfficeDto? currentOfficeToUpdate = _mapper.Map <OfficeDto> (await _officeRepository.GetByIdAsync(office.Id));
            if ( currentOfficeToUpdate == null) throw new Exception("La sucursal no existe, no es posible modificarla, debe crear la sucursal");

            var officeToUpdate = office;
            if (string.IsNullOrEmpty(officeToUpdate.Name)) throw new Exception("No se proporcionó nombre de sucursal");
            if (string.IsNullOrEmpty(officeToUpdate.Address)) throw new Exception("No se proporcionó dirección de sucursal");
            if (officeToUpdate.IdClient <= 0) throw new Exception("No se proporcionó cliente asociado a la sucursal");
            return _mapper.Map<OfficeDto>(await _officeRepository.UpdateAsync(officeToUpdate));
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            if (id <= 0) throw new Exception("No se proporcionó un id para eliminar el recurso");
            
            return await _officeRepository.DeleteByIdAsync(id);
        }


        
    }
}
