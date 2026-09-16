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

const getByIdPaypad = (idPaypad) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .get("/api/Tonnage/GetByPaypad/" + idPaypad, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

const getDetailsByIdTonnage = (idTonnage) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/Tonnage/" + idTonnage, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const create = (tonnageObj) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.post("/api/Tonnage", tonnageObj, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

export default { getByIdPaypad, getDetailsByIdTonnage, create };
