using Dashboard.Domain.DTOs;
using Dashboard.Domain.DTOs.Business;
using Dashboard.Domain.Entities.Business;


namespace Dashboard.Domain.Interfaces.Persistence
{
    public interface ITransactionRepository
    {
        // Transactions
        Task<IEnumerable<Transaction>> GetAllAsync();
        Task<Transaction?> GetByIdAsync(int id);
        Task<IEnumerable<Transaction>> GetByPaypadAsync(int idPayPad);
        Task<IEnumerable<Transaction>> GetByPaypadAndDateAsync(int idPayPad, DateTime from, DateTime to);
        Task<Transaction?> CreateAsync(TransactionDto newTransaction);
        Task<Transaction?> UpdateAsync(TransactionDto transaction);

        //==============
        
         Task<IEnumerable<TransactionPayPadDto>> GetTransactionsByPayPadAsync(int idPayPad, DateTime startDate, DateTime endDate);
           

        //Transaction Details
        Task<IEnumerable<TransactionDetail>> GetAllDetailsAsync();
        Task<IEnumerable<TransactionDetail>> GetDetailsByIdTranAsync(int idTransaction);
        Task<TransactionDetail?> CreateDetailAsync(TransactionDetailDto newTransactionDetail);
        Task<TransactionDetail?> UpdateDetailAsync(TransactionDetailDto transactionDetail);

        Task<TransactionRating?> CreateRatingAsync(int idTransaction, int rating);
        Task<IEnumerable<TransactionRating>> GetAllRatingsAsync();



    }
}
