using AutoMapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Interfaces.Persistence;

namespace Dashboard.Application.BL
{
    public class TonnageBL : ITonnageBL 
    { 
    
        private readonly IMapper _mapper;
        private readonly ITonnageRepository _tonnageRepository;
        public TonnageBL(IMapper mapper, ITonnageRepository tonnageRepository)
        {
            _mapper = mapper;
            _tonnageRepository = tonnageRepository;
        }

        public async Task<TonnageDto?> GetByIdAsync(int id)
        {
            var tonnage =  _mapper.Map<TonnageDto>(await _tonnageRepository.GetByIdAsync(id));
            var details = await GetDetailsByTonnageAsync(tonnage.Id);
            if (details != null)
                tonnage.Details = details;
            return tonnage;
        }

        
        public async Task<List<TonnageDto>?> GetAllAsync()
        {
            var tonnages =  _mapper.Map<List<TonnageDto>>(await _tonnageRepository.GetAllAsync());
            foreach(var tonnage in tonnages)
            {
                var details = await GetDetailsByTonnageAsync(tonnage.Id);
                if (details != null)
                    tonnage.Details = details;
            }
            return tonnages;

        }

        public async Task<List<TonnageDto>?> GetByPaypadAsync(int idTonnage)
        {
            var tonnages = _mapper.Map<List<TonnageDto>>(await _tonnageRepository.GetByPaypadAsync(idTonnage));
            foreach (var tonnage in tonnages)
            {
                var details = await GetDetailsByTonnageAsync(tonnage.Id);
                if (details != null)
                    tonnage.Details = details;
            }
            return tonnages;
        }

        public async Task<TonnageDto?> CreateAsync(TonnageDto newTonnage)
        {
            var tonnage =  _mapper.Map<TonnageDto>(await _tonnageRepository.CreateAsync(newTonnage));
            return tonnage;
        }

        public async Task<List<TonnageDetailDto>?> GetDetailsByTonnageAsync(int idTonnage)
        {
            
            var details  = _mapper.Map<List<TonnageDetailDto>>(await _tonnageRepository.GetDetailsByTonnageAsync(idTonnage));
            return details;
        }


    }
}
