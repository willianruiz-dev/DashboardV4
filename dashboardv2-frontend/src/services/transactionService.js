import axios from "axios";

const GENERAL_HEADERS = {
  // eslint-disable-next-line no-undef
  DashboardKeyId: process.env.REACT_APP_DKEYID,
};

/*
const getAll = () => {
  const token = window.localStorage.getItem('session');
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: 'Bearer ' + token },
  };
  return axios.get('/api/Transaction', config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};
*/

const getByIdPaypadAndDate = (dateRangeDto) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .post("/api/Transaction/GetByDate", dateRangeDto, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

const getDetailsByIdTransaction = (idTransaction) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .get("/api/Transaction/"+idTransaction+"/Details", config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

const getExcelReport = (excelTransactionDto) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token},
    responseType: "blob"
  };
  return axios
    .post("/api/Transaction/ExcelDoc", excelTransactionDto, config).then(response => {
      const href = window.URL.createObjectURL(response.data);

      const anchorElement = document.createElement("a");

      anchorElement.href = href;
      anchorElement.download = excelTransactionDto.fileName;

      document.body.appendChild(anchorElement);
      anchorElement.click();

      document.body.removeChild(anchorElement);
      window.URL.revokeObjectURL(href);
    });
};

const downloadVideo = (transactionInfoDto) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token},
    responseType: "blob"
  };
  const formatedPath = "/api/Transaction/Video?idTransaction=" + transactionInfoDto.idTransaction + "&idPaypad=" + transactionInfoDto.idPaypad;
  return axios
    .get(formatedPath, config).then(response => {
      const href = window.URL.createObjectURL(response.data);

      const anchorElement = document.createElement("a");

      anchorElement.href = href;
      anchorElement.download = "transaccion_" + transactionInfoDto.idTransaction + ".mp4";

      document.body.appendChild(anchorElement);
      anchorElement.click();

      document.body.removeChild(anchorElement);
      window.URL.revokeObjectURL(href);
    });
};


export default { getByIdPaypadAndDate, getDetailsByIdTransaction, getExcelReport, downloadVideo };
