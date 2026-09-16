using AutoMapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Interfaces.Persistence;
using Microsoft.Extensions.Configuration;

namespace Dashboard.Application.BL
{
    public class RouteBL : IRouteBL 
    { 
    
        private readonly IMapper _mapper;
        private readonly IRouteRepository _routeRepository;
        private readonly IConfiguration _configuration;

        public RouteBL(IMapper mapper, IRouteRepository routeRepository, IConfiguration configuration)
        {
            _mapper = mapper;
            _routeRepository = routeRepository;
            _configuration = configuration;
        }
        public async Task<RouteDto?> GetByIdAsync(int id)
        {
            return _mapper.Map<RouteDto>(await _routeRepository.GetByIdAsync(id));
        }

        public async Task<List<RouteDto>?> GetAllAsync()
        {
            return _mapper.Map<List<RouteDto>>(await _routeRepository.GetAllAsync());
        }

        public async Task<RouteDto?> CreateAsync(RouteDto newRoute, int idUserCreator)
        {
            var routeToCreate = newRoute;
            if (string.IsNullOrEmpty(routeToCreate.Title)) throw new Exception("La ruta que desea crear no cuenta con titulo");
            if (string.IsNullOrEmpty(routeToCreate.Route)) throw new Exception("No se permite crear una ruta vacia");
            if (routeToCreate.IdFather == 0) routeToCreate.IdFather = null;
            routeToCreate.IdUserCreated = idUserCreator;
            return _mapper.Map<RouteDto>(await _routeRepository.CreateAsync(routeToCreate));
        }

        public async Task<RouteDto?> UpdateAsync(RouteDto route)
        {
            
            RouteDto? routeToUpdate = _mapper.Map <RouteDto> (await _routeRepository.GetByIdAsync(route.Id));

            if ( routeToUpdate == null) throw new Exception("La ruta no existe, no es posible modificarla, debe crear el ruta");
            if (route.IdFather == 0) route.IdFather = null;

            return _mapper.Map<RouteDto>(await _routeRepository.UpdateAsync(route));
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            if (id <= 0) throw new Exception("No se proporcionó un id para eliminar el recurso");
            
            return await _routeRepository.DeleteByIdAsync(id);
        }


        
    }
}
