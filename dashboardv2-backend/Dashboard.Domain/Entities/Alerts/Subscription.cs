namespace Dashboard.Domain.Entities.Alerts
{
    public class Subscription:EntityCommon
    {
        public int ID_PAYPAD { get; set; }
        public string PAYPAD { get; set; }
        public int ID_ALERT { get; set; }
        public string ALERT { get; set; }
        public string EMAIL { get; set; }
    }
}
