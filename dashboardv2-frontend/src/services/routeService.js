import axios from "axios";

const GENERAL_HEADERS = {
  // eslint-disable-next-line no-undef
  DashboardKeyId: process.env.REACT_APP_DKEYID,
};

const getLogged = () => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/Route/Logged", config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getAll = () => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/Route", config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const update = (route) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.put("/api/Route", route, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

export default { getLogged, getAll, update };
