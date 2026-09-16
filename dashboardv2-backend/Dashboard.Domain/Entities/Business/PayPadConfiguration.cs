namespace Dashboard.Domain.Entities.Business
{
    public class PayPadConfiguration: EntityCommon
    {
        public string PAYPAD { get; set; }
        public int ID_PAYPAD { get; set; }
        public bool DEBUG { get; set; }
        public bool VALIDATE_PERIPHERALS { get; set; }
        public string SCANNER_PORT { get; set; }
        public string ARDUINO_PORT { get; set; }
        public string DISPENSER_PORT { get; set; }
        public string MEI_PORT { get; set; }
        public string PRINTER_PORT { get; set; }
        public string DISPENSER_DENOMINATIONS { get; set; }
        public string EXTRA_DATA_JSON { get; set; }
    }
}
