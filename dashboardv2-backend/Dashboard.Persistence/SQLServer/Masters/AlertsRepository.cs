using Dapper;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.Entities.Masters;
using Dashboard.Domain.Interfaces.Persistence;
using Dashboard.Domain.Variables;
using Microsoft.Extensions.Configuration;
using System.Data;
using System.Data.SqlClient;
using SP = Dashboard.Domain.Variables.Procedures;

namespace Dashboard.Persistence.SQLServer
{
    public class AlertsRepository : IGenericRepository<Alert, AlertDto>
    {
        private readonly string? _dataBase;

        public AlertsRepository(IConfiguration configuration)
        {
            _dataBase = configuration.GetConnectionString(AppSettings.DB_CONNECTION);
        }

        public async Task<IEnumerable<Alert>> GetAllAsync()
        {
            using var conn = new SqlConnection(_dataBase);
            IEnumerable<Alert> alert = await conn.QueryAsync<Alert>(SP.MASTERS_SP_ALERTS_GETALL, null, commandType: CommandType.StoredProcedure);

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return alert;
        }

        public async Task<Alert?> GetByIdAsync(int id)
        {
            return (await GetAllAsync()).Where(x => x.ID == id).FirstOrDefault();
        }



        public async Task<Alert?> CreateAsync(AlertDto newAlerts)
        {
            var args = new
            {
                newAlerts.Description,
                newAlerts.IdUserCreated
            };
            using var conn = new SqlConnection(_dataBase);
            Alert? alertCreated = (await conn.QueryAsync<Alert>(SP.MASTERS_SP_ALERTS_CREATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return alertCreated;
        }

        public async Task<Alert?> UpdateAsync(AlertDto alert)
        {
            var args = new
            {
                alert.Id,
                alert.Description,
                alert.IdUserUpdated
            };
            using var conn = new SqlConnection(_dataBase);
            Alert? alertUpdated = (await conn.QueryAsync<Alert>(SP.MASTERS_SP_ALERTS_UPDATE, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();
            return alertUpdated;
        }

        public async Task<bool> DeleteByIdAsync(int id)
        {
            var args = new
            {
                Id = id
            };
            using var conn = new SqlConnection(_dataBase);
            Alert? alert = (await conn.QueryAsync<Alert>(SP.MASTERS_SP_ALERTS_DELETEBYID, args, commandType: CommandType.StoredProcedure)).FirstOrDefault();

            await conn.CloseAsync();
            await conn.DisposeAsync();

            if (alert != null)
            {
                return false;
            }
            return true;
        }

       
    }
}
