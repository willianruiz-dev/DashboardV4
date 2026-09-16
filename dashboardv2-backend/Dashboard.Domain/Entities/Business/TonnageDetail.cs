namespace Dashboard.Domain.Entities.Business
{
    public class TonnageDetail:EntityCommon
    {
        public int ID_TONNAGE { get; set; }
        public int ID_CURRENCY_DENOMINATION { get; set; }
        public int DENOMINATION_VALUE { get; set; }
        public int QUANTITY_AP { get; set; }
        public int QUANTITY_DP { get; set; }
        public int QUANTITY_RJ { get; set; }
        public int QUANTITY_TOTAL { get; set; }
    }
}
