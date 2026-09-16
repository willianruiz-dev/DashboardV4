using Dashboard.Domain.DTOs;
using Dashboard.Domain.DTOs.Business;


namespace Dashboard.Domain.Interfaces.Application
{
    public interface ITransactionBL
    {
        // Transactions
        Task<TransactionDto?> GetByIdAsync(int id);
        Task<List<TransactionDto>?> GetAllAsync();
        Task<List<TransactionDto>?> GetByPaypadAsync(int idPayPad);
        Task<List<TransactionDto>?> GetByPaypadAndDateAsync(int idPayPad, DateTime from, DateTime to);
        Task<TransactionDto?> CreateAsync(TransactionDto newTransaction);
        Task<TransactionDto?> UpdateAsync(TransactionDto transaction);

        //==============

        Task<IEnumerable<TransactionPayPadDto>> GetByPaypadAsync(int idPayPad, DateTime startDate, DateTime endDate);

        //Transaction Details
        Task<List<TransactionDetailDto>?> GetAllDetailsAsync();
        Task<TransactionDetailDto> GetDetailByIdAsync(int idDetail);
        Task<List<TransactionDetailDto>?> GetDetailsByIdTranAsync(int idTransaction);
        Task<List<TransactionDetailDto>?> CreateDetailAsync(TransactionDetailDto newTransactionDetail);
        Task<TransactionDetailDto?> UpdateDetailAsync(TransactionDetailDto transactionDetail);

        Task<TransactionRatingDto?> CreateRatingAsync(int idTransaction, int rating);
        Task<TransactionRatingDto?> GetRatingAsync(int idTransaction);
    }
}