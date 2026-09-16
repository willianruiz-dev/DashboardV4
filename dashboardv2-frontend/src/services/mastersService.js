import axios from "axios";

const GENERAL_HEADERS = {
  // eslint-disable-next-line no-undef
  DashboardKeyId: process.env.REACT_APP_DKEYID,
};

const getAll = (masterName) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/Masters/" + masterName, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getById = (mastersName, id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .get("/api/Masters/" + mastersName + "/" + id, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

const create = (mastersName, data) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .post("/api/Masters/" + mastersName, data, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

const update = (mastersName, data) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .put("/api/Masters/" + mastersName, data, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

const deleteM = (mastersName, id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .delete("/api/Masters/" + mastersName + "/" + id, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

export default { getAll, getById, create, update, deleteM };
