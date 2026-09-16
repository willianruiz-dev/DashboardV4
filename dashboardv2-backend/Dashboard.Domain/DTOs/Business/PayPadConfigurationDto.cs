
namespace Dashboard.Domain.DTOs
{
    public class PayPadConfigurationDto : DtoCommon
    {
        public string? Paypad { get; set; }
        public int? IdPaypad { get; set; }
        public bool Debug { get; set; }
        public bool ValidatePeripherals { get; set; }
        public string ScannerPort { get; set; }
        public string ArduinoPort { get; set; }
        public string DispenserPort { get; set; }
        public string MeiPort { get; set; }
        public string PrinterPort { get; set; }
        public string DispenserDenominations { get; set; }
        public List<ExtraData>? ExtraDataJson { get; set; }

    }

    public class ExtraData
    {
        public string Key { get; set; }
        public string Value { get; set; }
    }
}
