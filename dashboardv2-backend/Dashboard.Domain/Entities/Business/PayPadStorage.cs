namespace Dashboard.Domain.Entities.Business
{
    public class PayPadStorage:EntityCommon
    {
        //INFO: Esta no es una tabla de la base de datos propiamente sino que es una vista 
        public int ID_PAYPAD { get; set; }
        public string? PAYPAD { get; set; }
        public int ID_CURRENCY_DENOMINATION { get; set; }
        public int DENOMINATION_VALUE { get; set; }
        public string? IMG_DENOM { get; set; }
        public int AP_STORED { get; set; }
        public double AP_TOTAL { get; set; }
        public int DP_STORED { get; set; }
        public double DP_TOTAL { get; set; }
        public int RJ_STORED { get; set; }
        public double RJ_TOTAL {  get; set; }
        
        public int QUANTITY_STORED { get; set; }
        public double TOTAL { get; set; }
        public bool IS_DISPENSING { get; set; }
        public int MIN_DP_QUANTITY { get; set; }
    }
}
