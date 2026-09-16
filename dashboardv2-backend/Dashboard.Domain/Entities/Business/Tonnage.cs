namespace Dashboard.Domain.Entities.Business
{
    public class Tonnage:EntityCommon
    {
        public int ID_PAYPAD { get; set; }
        public double TOTAL_AP { get; set; }
        public double TOTAL_DP { get; set; }
        public double TOTAL_RJ {  get; set; }
        public double TOTAL { get; set; }
    }
}
