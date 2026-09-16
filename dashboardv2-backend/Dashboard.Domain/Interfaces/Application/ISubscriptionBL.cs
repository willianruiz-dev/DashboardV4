using Dashboard.Domain.DTOs;


namespace Dashboard.Domain.Interfaces.Application
{
    public interface ISubscriptionBL
    {
        Task<SubscriptionDto?> GetByIdAsync(int id);
        Task<List<SubscriptionDto>?> GetAllAsync();
        Task<List<SubscriptionDto>?> GetByIdPaypadAsync(int idPayPad);
        Task<SubscriptionDto?> CreateAsync(SubscriptionDto newEntry);
        Task<SubscriptionDto?> UpdateAsync(SubscriptionDto entry);
        Task<bool> DeleteByIdAsync(int id);
    }
}
