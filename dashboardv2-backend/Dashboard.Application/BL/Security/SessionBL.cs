using AutoMapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Interfaces.Persistence;
using Microsoft.Extensions.Configuration;

namespace Dashboard.Application.BL
{
    public class SessionBL : ISessionBL 
    { 
    
        private readonly IMapper _mapper;
        private readonly ISessionRepository _sessionRepository;
        private readonly IConfiguration _configuration;

        public SessionBL(IMapper mapper, ISessionRepository sessionRepository, IConfiguration configuration)
        {
            _mapper = mapper;
            _sessionRepository = sessionRepository;
            _configuration = configuration;
        }
        public async Task<SessionDto?> GetByTokenAsync( string token)
        {
            return _mapper.Map<SessionDto>(await _sessionRepository.GetByTokenAsync(token));
        }

        public async Task<List<SessionDto>?> GetByUserAsync(int idUser)
        {
            return _mapper.Map<List<SessionDto>>(await _sessionRepository.GetByUserAsync(idUser));
        }

        public async Task<SessionDto?> CreateAsync(SessionDto newSession)
        {
            return _mapper.Map<SessionDto>(await _sessionRepository.CreateAsync(newSession));
        }

        public async Task<SessionDto?> UpdateAsync(SessionDto session)
        {
            return _mapper.Map<SessionDto>(await _sessionRepository.UpdateAsync(session));
        }



        
    }
}
