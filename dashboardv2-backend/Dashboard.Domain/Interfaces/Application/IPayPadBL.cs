using Dashboard.Domain.DTOs;


namespace Dashboard.Domain.Interfaces.Application
{
    public interface IPayPadBL
    {
        Task<PayPadDto?> GetByIdAsync(int id);
        Task<List<PayPadDto>?> GetAllAsync();
        Task<List<PayPadDto>?> GetByUserAsync(UserDto user);
        Task<List<PayPadStorageDto>> GetStorageByIdPaypadAsync(int idPaypad);
        Task<List<PayPadStorageDto>> CreateStorageAsync (List<PayPadStorageDto> storages);
        Task<string?> GetPaypadPasswordAsync(string username);
        Task<PayPadDto?> GetByUsernameAsync(string username);
        Task<PayPadDto?> CreateAsync(PayPadDto newPaypad, int idUser);
        Task<PayPadDto?> UpdateAsync(PayPadDto paypad, bool changePwd = false);
        Task<PayPadDto?> ChangePassword(PayPadDto paypad, ChangePwdDto data, int idUserUpdater);
        Task<Tuple<string,bool>> ValidatePayPadAsync(int idPayPad);
        Task<bool> DeleteByIdAsync(int id);
        Task<PayPadConfigurationDto?> CreateConfigurationAsync(PayPadConfigurationDto newPaypadConfiguration);
        Task<PayPadConfigurationDto?> UpdateConfigurationAsync(PayPadConfigurationDto paypadConfiguration);
        Task<PayPadConfigurationDto?> GetConfigurationByPaypadId(int idPaypad);
    }
}
