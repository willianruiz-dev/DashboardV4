using AutoMapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Business;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Interfaces.Persistence;
using Microsoft.Extensions.Configuration;
using System.Timers;

namespace Dashboard.Application.BL
{
    public class ClientBL : IClientBL 
    { 
    
        private readonly IMapper _mapper;
        private readonly IClientRepository _clientRepository;
        private readonly IClientValidation _clientValidation;
        private readonly IOfficeBL _officeBL;

        public ClientBL(IMapper mapper, IClientRepository clientRepository, IClientValidation clientValidation, IOfficeBL officeBL)
        {
            _mapper = mapper;
            _clientRepository = clientRepository;
            _clientValidation = clientValidation;
            _officeBL = officeBL;
        }
        public async Task<ClientDto?> GetByIdAsync(int id)
        {
            var client =  _mapper.Map<ClientDto>(await _clientRepository.GetByIdAsync(id));
            var offices = _mapper.Map<List<OfficeDto>>(await _officeBL.GetByClientAsync(client.Id));
            client.Offices = offices;
            return client;
        }

        public async Task<List<ClientDto>?> GetAllAsync()
        {
            var clients = _mapper.Map<List<ClientDto>>(await _clientRepository.GetAllAsync());
            foreach(var client in clients)
            {
                var offices = _mapper.Map<List<OfficeDto>>(await _officeBL.GetByClientAsync(client.Id));
                client.Offices = offices;

            }
            return clients;
        }

        public async Task<ClientDto?> CreateAsync(ClientDto newClient, int idUserCreator)
        {
            var clientToCreate = newClient;
            clientToCreate.IdUserCreated = idUserCreator;
            SaveCurrencyDenominationImg(ref clientToCreate);
            _clientValidation.ValidateClient(ref clientToCreate);
            return _mapper.Map<ClientDto>(await _clientRepository.CreateAsync(clientToCreate));
        }

        public async Task<ClientDto?> UpdateAsync(ClientDto client)
        {
            // validacion de existencia
            ClientDto? currentClientToUpdate = _mapper.Map <ClientDto> (await _clientRepository.GetByIdAsync(client.Id));
            if ( currentClientToUpdate == null) throw new Exception("El cliente no existe, no es posible modificarlo, debe crear el cliente");

            var clientToUpdate = client;
            if (clientToUpdate.LogoImgList == null || clientToUpdate.LogoImgList.Count <= 0)
            {
                clientToUpdate.LogoImg = currentClientToUpdate.LogoImg;
                clientToUpdate.ImgExt = currentClientToUpdate.ImgExt;
            }
            else
                SaveCurrencyDenominationImg(ref clientToUpdate);
           _clientValidation.ValidateClient (ref clientToUpdate);

            return _mapper.Map<ClientDto>(await _clientRepository.UpdateAsync(clientToUpdate));
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            if (id <= 0) throw new Exception("No se proporcionó un id para eliminar el recurso");
            var offices = _mapper.Map<List<OfficeDto>>(await _officeBL.GetByClientAsync(id));
            foreach(var office in offices)
            {
                bool wasDeleted = await _officeBL.DeleteByIdAsync(office.Id);
                if (!wasDeleted) throw new Exception($"La sucursal {office.Name} no se pudo borrar, el cliente no se pudo eliminar");  
            }
            return await _clientRepository.DeleteByIdAsync(id);
        }

        private void SaveCurrencyDenominationImg(ref ClientDto client)
        {
            string imgPath = @"images\clients";
            
            imgPath = Path.Combine(imgPath, $"{client.Name.Replace(" ", string.Empty)}.{client.ImgExt}");
            client.LogoImg = "/" + imgPath.Replace('\\', '/');
            ImageAdmin.SaveStaticImage(imgPath, client.LogoImgList.ToArray());
        }

    }
}
