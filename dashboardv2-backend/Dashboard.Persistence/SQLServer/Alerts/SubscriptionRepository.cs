using Dapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Alerts;
using Dashboard.Domain.Interfaces.Persistence;
using Dashboard.Domain.Variables;
using Microsoft.Extensions.Configuration;
using System.Data;
using System.Data.SqlClient;
using SP = Dashboard.Domain.Variables.Procedures;

namespace Dashboard.Persistence.SQLServer
{
    public class SubscriptionRepository : IGenericRepository<Subscription, SubscriptionDto>
    {
        private readonly string? _dataBase;

        public SubscriptionRepository(IConfiguration configuration)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
        }

        public async Task<IEnumerable<Subscription>> GetAllAsync()
        {
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Subscription> subscription = await conn.QueryAsync<Subscription>(SP.ALERTS_SP_SUBSCRIPTIONS_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return subscription;
        }

        public async Task<Subscription?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }



        public async Task<Subscription?> CreateAsync(SubscriptionDto newSubscription)
        {
            var args = new
            {
                newSubscription.IdPayPad,
                newSubscription.IdAlert,
                newSubscription.Email,
                newSubscription.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            Subscription? subscriptionCreated = (await conn.QueryAsync<Subscription>(SP.ALERTS_SP_SUBSCRIPTIONS_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return subscriptionCreated;
        }

        public async Task<Subscription?> UpdateAsync(SubscriptionDto subscription)
        {
            var args = new
            {
                subscription.Id,
                subscription.IdPayPad,
                subscription.IdAlert,
                subscription.Email,
                subscription.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            Subscription? subscriptionUpdated = (await conn.QueryAsync<Subscription>(SP.ALERTS_SP_SUBSCRIPTIONS_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return subscriptionUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            Subscription? subscription = (await conn.QueryAsync<Subscription>(SP.ALERTS_SP_SUBSCRIPTIONS_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (subscription != null)
            {
                return false;
            }
            return true;
        }

       
    }
}
