import axios from "axios";

const GENERAL_HEADERS = {
  // eslint-disable-next-line no-undef
  DashboardKeyId: process.env.REACT_APP_DKEYID,
};



const getAll = () => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/Permission", config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getById = (idPermission) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/Permission/" + idPermission, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

export default { getAll, getById };