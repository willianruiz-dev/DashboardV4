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
  return axios.get("/api/Client", config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getById = (id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/Client/" + id, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const create = (client) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.post("/api/Client", client, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const update = (client) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.put("/api/Client", client, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const deleteC = (id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.delete("/api/Client/" + id, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

export default { getAll, getById, create, update, deleteC };
