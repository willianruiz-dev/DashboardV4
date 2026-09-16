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
  return axios.get("/api/Role", config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getById = (id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/Role/" + id, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const create = (role) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.post("/api/Role/", role, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const update = (role) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.put("/api/Role/", role, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const deleteR = (id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.delete("/api/Role/" + id, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

export default { getAll, getById, create, update, deleteR };
