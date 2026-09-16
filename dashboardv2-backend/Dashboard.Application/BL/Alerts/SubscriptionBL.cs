using AutoMapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Alerts;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Interfaces.Persistence;
using Microsoft.Extensions.Configuration;

namespace Dashboard.Application.BL
{
    public class SubscriptionBL: ISubscriptionBL
    {
        private readonly IMapper _mapper;
        private readonly IGenericRepository<Subscription,SubscriptionDto> _susbscriptionRepository;

        private readonly IConfiguration _configuration;

        public SubscriptionBL(IMapper mapper, IConfiguration configuration, 
                         IGenericRepository<Subscription, SubscriptionDto> subsRepository)
        { 
            _mapper = mapper;
            _configuration = configuration;
            _susbscriptionRepository = subsRepository;
        }
        public async Task<SubscriptionDto?> GetByIdAsync(int id)
        {
            
            var subscription = _mapper.Map<SubscriptionDto>(await _susbscriptionRepository.GetByIdAsync(id));
            return subscription;
        }

        public async Task<List<SubscriptionDto>?> GetByIdPaypadAsync(int idPayPad)
        {

            var subscriptions = (await GetAllAsync())?.Where(sub => sub.IdPayPad == idPayPad).ToList();
            
            return subscriptions;
        }

        public async Task<List<SubscriptionDto>?> GetAllAsync()
        {
            var subscriptions  = _mapper.Map<List<SubscriptionDto>>(await _susbscriptionRepository.GetAllAsync());
            
            return subscriptions;

        }

        public async Task<SubscriptionDto?> CreateAsync(SubscriptionDto newEntry)
        {
            return _mapper.Map<SubscriptionDto>(await _susbscriptionRepository.CreateAsync(newEntry));
        }

        public async Task<SubscriptionDto?> UpdateAsync(SubscriptionDto entry)
        {
            return _mapper.Map<SubscriptionDto>(await _susbscriptionRepository.UpdateAsync(entry));
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            if (id <= 0) throw new Exception("No se proporcionó un id para eliminar el recurso");
            
            return await _susbscriptionRepository.DeleteByIdAsync(id);
        }


        
    }

    
}
