using AutoMapper;
using Dashboard.Domain;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Enumerables;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Interfaces.Persistence;
using Microsoft.Extensions.Configuration;

namespace Dashboard.Application.BL
{
    public class PayPadBL : IPayPadBL
    {

        private readonly IMapper _mapper;
        private readonly IPayPadRepository _paypadRepository;
        private readonly IPayPadValidation _paypadValidation;
        private readonly IConfiguration _configuration;
        private readonly IClientBL _clientBL;
        private readonly ISubscriptionBL _subscriptionBL;
        private readonly EmailService _emailService;

        public PayPadBL(IMapper mapper, IPayPadRepository routeRepository, IConfiguration configuration, 
            IPayPadValidation paypadValidation, IClientBL clientBL, EmailService emailService, ISubscriptionBL subscriptionBL)
        {
            _mapper = mapper;
            _paypadRepository = routeRepository;
            _configuration = configuration;
            _paypadValidation = paypadValidation;
            _clientBL = clientBL;
            _emailService = emailService;
            _subscriptionBL = subscriptionBL;
        }
        public async Task<PayPadDto?> GetByIdAsync(int id)
        {
            var paypad = _mapper.Map<PayPadDto>(await _paypadRepository.GetByIdAsync(id));
            return paypad;
        }

        public async Task<List<PayPadDto>?> GetByUserAsync(UserDto user)
        {
            if (user.IdClient == null) throw new Exception("El usuario no cuenta con un cliente asociado, por lo tanto no tiene corresponsales.");
            var clientLinkedUser = await _clientBL.GetByIdAsync(user.IdClient ?? 0);
            if (clientLinkedUser == null) throw new Exception("El usuario no cuenta con un cliente asociado, por lo tanto no tiene corresponsales.");
            var idsOffices = clientLinkedUser.Offices.Select(o => o.Id).ToList();
            if (idsOffices == null) throw new Exception("El cliente asociado no cuenta con sucursales, por lo tanto no tiene corresponsales.");
            var paypads = await GetAllAsync();
            if (paypads == null) throw new Exception("No existen corresponsales creados.");
            paypads = paypads.Where(p => idsOffices.Contains(p.IdOffice)).ToList();
            return paypads;
        }

        public async Task<List<PayPadDto>?> GetAllAsync()
        {
            var paypads = _mapper.Map<List<PayPadDto>>(await _paypadRepository.GetAllAsync());
            return paypads;

        }

        public async Task<PayPadDto?> GetByUsernameAsync(string username)
        {
            var paypad = _mapper.Map<PayPadDto>((await _paypadRepository.GetAllAsync()).Where(p => p.USERNAME == username).FirstOrDefault());

            return paypad;
        }

        public async Task<List<PayPadStorageDto>> GetStorageByIdPaypadAsync(int idPaypad)
        {
            var storages = _mapper.Map<List<PayPadStorageDto>>(await _paypadRepository.GetStorageByIdPaypadAsync(idPaypad));
            return storages;
        }

        public async Task<List<PayPadStorageDto>> CreateStorageAsync(List<PayPadStorageDto> storages)
        {
            var result = new List<PayPadStorageDto>();
            foreach (var storage in storages)
            {
                var _storage = _mapper.Map<PayPadStorageDto>(await _paypadRepository.CreateStorageAsync(storage));
                result.Add(_storage);
            }
            return result;
        }
        public async Task<PayPadDto?> CreateAsync(PayPadDto newPaypad, int idUserCreator)
        {
            var paypadToCreate = newPaypad;
            //Validacion de que si se proporcionó contraseña y se encripta
            if (string.IsNullOrEmpty(paypadToCreate.Pwd)) throw new Exception("No se proporcionó contraseña de Paypad");
            paypadToCreate.Pwd = paypadToCreate.Pwd.GenerarHash(_configuration);

            _paypadValidation.ValidatePaypad(ref paypadToCreate);
            _paypadValidation.ValidateNewPwd(newPaypad.Pwd);
            paypadToCreate.IdUserCreated = idUserCreator;
            return _mapper.Map<PayPadDto>(await _paypadRepository.CreateAsync(paypadToCreate));
        }

        public async Task<PayPadDto?> UpdateAsync(PayPadDto paypad, bool changePwd = false)
        {

            PayPadDto? paypadToUpdate = _mapper.Map<PayPadDto>(await _paypadRepository.GetByIdAsync(paypad.Id));
            if (paypadToUpdate == null) throw new Exception("El paypad no existe o el id es incorrecto");

            _paypadValidation.ValidatePaypadUpdate(ref paypad);
            if (!changePwd) paypad.Pwd = null; // Si no es cambio de contraseña se manda la contraseña como null

            return _mapper.Map<PayPadDto>(await _paypadRepository.UpdateAsync(paypad));
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            if (id <= 0) throw new Exception("No se proporcionó un id para eliminar el recurso");

            return await _paypadRepository.DeleteByIdAsync(id);
        }

        public async Task<string?> GetPaypadPasswordAsync(string username)
        {
            var paypad = await this.GetByUsernameAsync(username);
            if (paypad == null) throw new Exception("No se encontró paypad");

            return await _paypadRepository.GetPaypadPasswordAsync(Convert.ToInt32(paypad.Id));
        }



        public async Task<PayPadDto?> ChangePassword(PayPadDto paypad, ChangePwdDto data, int idUserUpdater)
        {
            try
            {
                paypad.Pwd = await _paypadRepository.GetPaypadPasswordAsync(Convert.ToInt32(data.Document));
            }
            catch (FormatException)
            {
                throw new Exception("No se proporcionó id para el cambio de contraseña");
            }
            var paypadToUpdate = _paypadValidation.IsPasswordCorrect(paypad, data.OldPwd);
            if (paypadToUpdate == null) throw new Exception("La contraseña actual no coincide");
            _paypadValidation.ValidateNewPwd(data.NewPwd);

            var updatePadPadObject = new PayPadDto()
            {
                Id = paypadToUpdate.Id,
                Username = paypadToUpdate.Username,
                Pwd = data.NewPwd.GenerarHash(_configuration),
                Description = paypadToUpdate.Description,
                Longitude = paypadToUpdate.Longitude,
                Latitude = paypadToUpdate.Latitude,
                IdCurrency = paypadToUpdate.IdCurrency,
                IdOffice = paypadToUpdate.IdOffice,
                Status = paypadToUpdate.Status,
                IdUserUpdated = idUserUpdater
            };

            return await this.UpdateAsync(updatePadPadObject, changePwd: true);

        }

        public async Task<Tuple<string, bool>> ValidatePayPadAsync(int idPaypad)
        {
            var paypad = await GetByIdAsync(idPaypad);
            var storages = _mapper.Map<List<PayPadStorageDto>>(await _paypadRepository.GetStorageByIdPaypadAsync(idPaypad));
            if (storages == null || storages.Count <= 0) return new Tuple<string, bool>($"{(int)PaypadValidationDescription.NoStoragesYet}: No se han creado aún los detalles del paypad", false);

            // Primero se evalua si hay la cantidad suficiente de efectivo en los baules
            var poorDenominations = new List<string>();
            var nearPoorDenominations = new List<string>();
            foreach (var storage in storages)
            {
                if (storage.IsDispensing && storage.DpStored <= (storage.MinDpQuantity + 10))
                {
                    nearPoorDenominations.Add($"Denominación {storage.DenominationValue.ToString("C0")}: Cantidad almacenada {storage.DpStored} unidades");
                }

                if (storage.IsDispensing && storage.DpStored <= storage.MinDpQuantity)
                {
                    poorDenominations.Add($"{storage.DenominationValue.ToString("C0")}:{storage.DpStored}");
                }


            }

            if (nearPoorDenominations.Count > 0)
            {
                var subs = (await _subscriptionBL.GetByIdPaypadAsync(idPaypad))?.Where(sub => sub.IdAlert == 1).ToList();
                _ = _emailService.SendStorageAlert(subs, nearPoorDenominations);
            }

            if (poorDenominations.Count > 0)
            {
                return new Tuple<string, bool>(
                    $"{(int)PaypadValidationDescription.PoorDenominations}: Una o más denominaciones están por debajo del limite de almacenamiento: \n" + string.Join("\n", poorDenominations),
                    false
               );
            }



            return new Tuple<string, bool>("Exitoso", true);
        }
        public async Task<PayPadConfigurationDto?> CreateConfigurationAsync(PayPadConfigurationDto newPaypadConfiguration)
        {
            var paypadConfigurationToCreate = newPaypadConfiguration;
            int idPaypad = newPaypadConfiguration.IdPaypad ?? 0;
            if(idPaypad == 0) throw new Exception("El paypad no existe o el id es incorrecto");
            PayPadDto? paypadToCreateConfiguration = _mapper.Map<PayPadDto>(await _paypadRepository.GetByIdAsync(idPaypad));
            if (paypadToCreateConfiguration == null) throw new Exception("El paypad no existe o el id es incorrecto");

            _paypadValidation.ValidatePaypadConfiguration(ref paypadConfigurationToCreate);
            return _mapper.Map<PayPadConfigurationDto>(await _paypadRepository.CreateConfigurationAsync(paypadConfigurationToCreate));
        }

        public async Task<PayPadConfigurationDto?> UpdateConfigurationAsync(PayPadConfigurationDto paypadConfiguration)
        {
            var paypadConfigurationToCreate = paypadConfiguration;
            int idPaypad = paypadConfiguration.IdPaypad ?? 0;
            if (idPaypad == 0) throw new Exception("El paypad no existe o el id es incorrecto");
            PayPadConfigurationDto? paypadToUpdate = _mapper.Map<PayPadConfigurationDto>(await _paypadRepository.GetConfigurationByIdAsync(idPaypad));
            if (paypadToUpdate == null) throw new Exception("El paypad no existe o el id es incorrecto");

            _paypadValidation.ValidatePaypadConfigurationUpdate(ref paypadConfiguration);

            return _mapper.Map<PayPadConfigurationDto>(await _paypadRepository.UpdateConfigurationAsync(paypadConfiguration));
        }

        public async Task<PayPadConfigurationDto?> GetConfigurationByPaypadId(int idPaypad)
        {
            var paypadConfiguration = _mapper.Map<PayPadConfigurationDto>(await _paypadRepository.GetConfigurationByIdAsync(idPaypad));
            return paypadConfiguration;
        }
    }


}
