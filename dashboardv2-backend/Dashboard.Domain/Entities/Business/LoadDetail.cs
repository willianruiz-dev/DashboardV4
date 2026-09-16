

namespace Dashboard.Domain.Entities.Business
{
    public class LoadDetail : EntityCommon
    {
        public int ID_LOAD { get; set; }
        public int ID_CURRENCY_DENOMINATION { get; set; }
        public int DENOMINATION_VALUE { get; set; }
        public int QUANTITY { get; set; }

    }
}
