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
  return axios.get("/api/Office", config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getById = (id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/Office/" + id, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getByClient = (idClient) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .get("/api/Office/Client/" + idClient, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

const create = (office) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.post("/api/Office", office, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const update = (office) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.put("/api/Office", office, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const deleteO = (id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.delete("/api/Office/" + id, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

export default { getAll, getById, getByClient, create, update, deleteO };
