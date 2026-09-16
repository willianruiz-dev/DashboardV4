using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Business;


namespace Dashboard.Domain.Interfaces.Persistence
{
    public interface IPayPadRepository
    {
        Task<IEnumerable<PayPad>> GetAllAsync();
        Task<PayPad?> GetByIdAsync(int id);
        Task<string?> GetPaypadPasswordAsync(int id);
        Task<IEnumerable<PayPadStorage>> GetStorageByIdPaypadAsync(int idPaypad);
        Task<PayPadStorage?> CreateStorageAsync(PayPadStorageDto storage);
        Task<PayPad?> CreateAsync(PayPadDto newPaypad);
        Task<PayPad?> UpdateAsync(PayPadDto paypad);
        Task<bool> DeleteByIdAsync(int id);
        Task<PayPadConfiguration?> CreateConfigurationAsync(PayPadConfigurationDto newConfiguration);
        Task<PayPadConfiguration?> UpdateConfigurationAsync(PayPadConfigurationDto newConfiguration);
        Task<PayPadConfiguration?> GetConfigurationByIdAsync(int id);
    }
}
