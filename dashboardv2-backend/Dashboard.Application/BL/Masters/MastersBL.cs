using AutoMapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Interfaces.Persistence;
using Microsoft.Extensions.Configuration;

namespace Dashboard.Application.BL
{
    public class MastersBL<T, Tdto> : IMastersBL<Tdto>
    {
        private readonly IMapper _mapper;
        private readonly IGenericRepository<T,Tdto> _masterRepository;

        private readonly IConfiguration _configuration;

        public MastersBL(IMapper mapper, IConfiguration configuration, 
                         IGenericRepository<T, Tdto> masterRepository)
        { 
            _mapper = mapper;
            _configuration = configuration;
            _masterRepository = masterRepository;
        }
        public async Task<Tdto?> GetByIdAsync(int id)
        {
            
            return _mapper.Map<Tdto>(await _masterRepository.GetByIdAsync(id));
        }

        public async Task<List<Tdto>?> GetAllAsync()
        {
            return _mapper.Map<List<Tdto>>(await _masterRepository.GetAllAsync());
        }

        public async Task<Tdto?> CreateAsync(Tdto newEntry)
        {
            return _mapper.Map<Tdto>(await _masterRepository.CreateAsync(newEntry));
        }

        public async Task<Tdto?> UpdateAsync(Tdto entry)
        {
            return _mapper.Map<Tdto>(await _masterRepository.UpdateAsync(entry));
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            if (id <= 0) throw new Exception("No se proporcionó un id para eliminar el recurso");
            
            return await _masterRepository.DeleteByIdAsync(id);
        }


        
    }

    public enum EMaster
    {
        Currency,
        TypeDocument,
        Region,
        CurrencyDenomination
    }
}
