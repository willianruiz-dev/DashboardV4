using Amazon.Runtime;
using AutoMapper;
using Dashboard.Domain;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Business;
using Dashboard.Domain.Enumerables;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Interfaces.Persistence;
using Microsoft.Extensions.Configuration;
using MongoDB.Bson.IO;
using Newtonsoft.Json.Linq;
using System.Text.Json;

namespace Dashboard.Application.BL
{
    public class LoadBL : ILoadBL 
    { 
    
        private readonly IMapper _mapper;
        private readonly ILoadRepository _loadRepository;
        public LoadBL(IMapper mapper, ILoadRepository loadRepository)
        {
            _mapper = mapper;
            _loadRepository = loadRepository;
        }

        public async Task<LoadDto?> GetByIdAsync(int id)
        {
            var load =  _mapper.Map<LoadDto>(await _loadRepository.GetByIdAsync(id));
            var details = await GetDetailsByLoadAsync(load.Id);
            if (details != null)
                load.Details = details;
            return load;
        }

        
        public async Task<List<LoadDto>?> GetAllAsync()
        {
            var loads =  _mapper.Map<List<LoadDto>>(await _loadRepository.GetAllAsync());
            foreach(var load in loads)
            {
                var details = await GetDetailsByLoadAsync(load.Id);
                if (details != null)
                    load.Details = details;
            }
            return loads;

        }

        public async Task<List<LoadDto>?> GetByPaypadAsync(int idLoad)
        {
            var loads = _mapper.Map<List<LoadDto>>(await _loadRepository.GetByPaypadAsync(idLoad));
            foreach (var load in loads)
            {
                var details = await GetDetailsByLoadAsync(load.Id);
                if (details != null)
                    load.Details = details;
            }
            return loads;
        }

        public async Task<LoadDto?> CreateAsync(LoadDto newLoad)
        {
            var load =  _mapper.Map<LoadDto>(await _loadRepository.CreateAsync(newLoad));
            load.Details = newLoad.Details;


            var details = await CreateDetails(load);
            load.Details = details;
            return load;
        }

        public async Task<List<LoadDetailDto>?> GetDetailsByLoadAsync(int idLoad)
        {
            
            var details  = _mapper.Map<List<LoadDetailDto>>(await _loadRepository.GetDetailsByLoadAsync(idLoad));
            return details;
        }

        public async Task<List<LoadDetailDto>> CreateDetails(LoadDto load)
        {
            var result = new List<LoadDetailDto>();
            var detailsList = load.Details;
            try
            {
                foreach (var detail in detailsList)
                {
                    detail.IdLoad = load.Id;
                    detail.IdUserCreated = load.IdUserCreated;
                    var detailCreated = _mapper.Map<LoadDetailDto>(await _loadRepository.CreateDetailAsync(detail));
                    if (detailCreated == null) throw new Exception("Un detalle falló en su creación");
                    result.Add(detailCreated);
                }
                return result;

            }
            catch (Exception ex)
            {
                
                await _loadRepository.DeleteLoadAsync(load.IdPayPad, load.Id);

                await EventLogger.Save(ETypeLog.Error,$"Error: {ex.Message}", result);
                if (ex.Message.Contains("No se encuentra resgistrada esta denominación para el pay+"))
                {
                    throw new Exception("Ocurrio un error en la creación del cargue, alguna de las denominaciones no se encuentra registrada para dispensación por favor registre las denominaciones");
                }
                throw new Exception("Ocurrio un error inesperado en la creación de detalles del cargue. Por favor intente de nuevo");
            }
        }


    }
}
