using AutoMapper;
using Dashboard.Domain;
using Dashboard.Domain.DTOs;
using Dashboard.Domain.DTOs.Business;
using Dashboard.Domain.Interfaces.Application;
using Dashboard.Domain.Interfaces.Persistence;
using Microsoft.Extensions.Configuration;

namespace Dashboard.Application.BL
{
    public class TransactionBL : ITransactionBL 
    { 
    
        private readonly IMapper _mapper;
        private readonly ITransactionRepository _transactionRepository;
        private readonly IMastersBL<CurrencyDenominationDto> _masterCurrencyDenominations;
        private readonly IConfiguration _configuration;

        public TransactionBL(IMapper mapper, ITransactionRepository routeRepository, IConfiguration configuration, IMastersBL<CurrencyDenominationDto> masterCurrencyDenominations)
        {
            _mapper = mapper;
            _transactionRepository = routeRepository;
            _configuration = configuration;
            _masterCurrencyDenominations = masterCurrencyDenominations;
        }
        public async Task<TransactionDto?> GetByIdAsync(int id)
        {
            var transaction =  _mapper.Map<TransactionDto>(await _transactionRepository.GetByIdAsync(id));
            return transaction;
        }

        public async Task<List<TransactionDto>?> GetAllAsync()
        {
            var transactions =  _mapper.Map<List<TransactionDto>>(await _transactionRepository.GetAllAsync());
            return transactions;

        }

        public async Task<List<TransactionDto>?> GetByPaypadAsync(int idPayPad)
        {
            var transactions = _mapper.Map<List<TransactionDto>>(await _transactionRepository.GetByPaypadAsync(idPayPad));
            return transactions;

        }

        public async Task<List<TransactionDto>?> GetByPaypadAndDateAsync(int idPayPad,DateTime from, DateTime to)
        {
            var transactions = _mapper.Map<List<TransactionDto>>(await _transactionRepository.GetByPaypadAndDateAsync(idPayPad, from, to));
            return transactions;

        }

        public async Task<TransactionDto?> CreateAsync(TransactionDto newTransaction)
        {
            var transactionToCreate = newTransaction;
            TrimTextFields(ref transactionToCreate);
            return _mapper.Map<TransactionDto>(await _transactionRepository.CreateAsync(transactionToCreate));
        }

        public async Task<TransactionDto?> UpdateAsync(TransactionDto transaction)
        {
            
            TransactionDto? transactionToUpdate = _mapper.Map <TransactionDto> (await _transactionRepository.GetByIdAsync(transaction.Id));
            if ( transactionToUpdate == null) throw new Exception("La transacción no existe o el id es incorrecto");
            TrimTextFields(ref transaction);
            return _mapper.Map<TransactionDto>(await _transactionRepository.UpdateAsync(transaction));
        }

        public async Task<TransactionRatingDto?> CreateRatingAsync(int idTransaction, int rating)
        {
            return _mapper.Map<TransactionRatingDto>(await _transactionRepository.CreateRatingAsync(idTransaction, rating));
        }

        public async Task<TransactionRatingDto?> GetRatingAsync(int idTransaction)
        {
            var trxRatings = _mapper.Map<List<TransactionRatingDto>>(await _transactionRepository.GetAllRatingsAsync());
            return trxRatings.Find(x => x.IdTransaction == idTransaction);

        }

        private void TrimTextFields(ref TransactionDto transaction)
        {
            if (!string.IsNullOrEmpty(transaction.Document)) transaction.Document = transaction.Document.Trim();
            if (!string.IsNullOrEmpty(transaction.Reference)) transaction.Reference = transaction.Reference.Trim();
            if (!string.IsNullOrEmpty(transaction.Product)) transaction.Product = transaction.Product.Trim();
            if (!string.IsNullOrEmpty(transaction.Description)) transaction.Description = transaction.Description.Trim();
        }

        //===================================================================

        public async Task<IEnumerable<TransactionPayPadDto>> GetByPaypadAsync(int idPayPad, DateTime startDate, DateTime endDate)
        {
            var transactions = await _transactionRepository.GetTransactionsByPayPadAsync(idPayPad, startDate, endDate);
            return transactions;
        }

        // Transaction Details 
        public async Task<List<TransactionDetailDto>?> GetAllDetailsAsync()
        {
            var details =  _mapper.Map<List<TransactionDetailDto>>(await _transactionRepository.GetAllDetailsAsync());
            return details;
        }

        public async Task<TransactionDetailDto?> GetDetailByIdAsync(int id)
        {
            var details = (await GetAllDetailsAsync());
            if (details == null) return null;
            return details.FirstOrDefault(x => x.Id == id);
        }

        public async Task<List<TransactionDetailDto>?> GetDetailsByIdTranAsync(int idTransaction)
        {
            var details = _mapper.Map<List<TransactionDetailDto>>(await _transactionRepository.GetDetailsByIdTranAsync(idTransaction));
            return details;
        }

        public async Task<List<TransactionDetailDto>?> CreateDetailAsync(TransactionDetailDto newTransactionDetail)
        {
            var denominations = await _masterCurrencyDenominations.GetAllAsync();
            if (denominations == null) throw new Exception("No se encontraron denominaciones.");
            newTransactionDetail.IdCurrencyDenomination = denominations.Where(d => d.Value == newTransactionDetail.CurrencyDenomination).First().Id;

            
            var resultList = new List<TransactionDetailDto>();
            for (int i = 0; i < newTransactionDetail.Quantity; i++)
            {
               resultList.Add( _mapper.Map<TransactionDetailDto>(await _transactionRepository.CreateDetailAsync(newTransactionDetail)));
            }
            return resultList;
        }

        public async Task<TransactionDetailDto?> UpdateDetailAsync(TransactionDetailDto transactionDetail)
        {
            var detailToUpdate = await GetByIdAsync(transactionDetail.Id);
            if (detailToUpdate == null) throw new Exception("No se encontro detalle de la transacción, no se pudo actulizar");
            return _mapper.Map<TransactionDetailDto>(await _transactionRepository.CreateDetailAsync(transactionDetail));
        }
    }
}
