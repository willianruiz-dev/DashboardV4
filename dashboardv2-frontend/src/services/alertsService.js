import axios from "axios";

const GENERAL_HEADERS = {
  // eslint-disable-next-line no-undef
  DashboardKeyId: process.env.REACT_APP_DKEYID,
};

const getAllSubs = () => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/Alerts/Subscription", config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getSubById = (id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .get("/api/Alerts/Subscription/" + id, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

const getSubsByIdPayPad = (idPayPad) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .get("/api/Alerts/Subscription/GetByPayPad/" + idPayPad, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

const create = (sub) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .post("/api/Alerts/Subscription", sub, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

const update = (sub) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .put("/api/Alerts/Subscription", sub, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

const deleteSub = (id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .delete("/api/Alerts/Subscription/" + id, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

export default {
  getAllSubs,
  getSubById,
  getSubsByIdPayPad,
  create,
  update,
  deleteSub,
};
