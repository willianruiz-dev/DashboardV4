

using Microsoft.Extensions.Configuration;
using System.Reflection;

namespace Dashboard.Application
{
    public static class ImageAdmin
    {
        private static string _env;
        private static string _staticPath;
        public static void Init(bool isProduccion, string staticPath)
        {
            if (isProduccion)
                _env = "PRODUCTION";
            else
                _env = "DEV";
            _staticPath = staticPath;

        }
        public static void SaveStaticImage(string savePathRelative, byte[] imgAsBytes)
        {
            string staticDirPath = _staticPath;

            

            string folder = Path.Combine(staticDirPath, Path.GetDirectoryName(savePathRelative));
            string filePath = Path.Combine(staticDirPath, savePathRelative);

            if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);


            _ = File.WriteAllBytesAsync(filePath, imgAsBytes);


        }
    }
}
