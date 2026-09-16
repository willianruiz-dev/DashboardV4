import axios from "axios";
import { pki, util } from "node-forge";

const GENERAL_HEADERS = {
  // eslint-disable-next-line no-undef
  DashboardKeyId: process.env.REACT_APP_DKEYID,
};

const encryptPwd = (pwd) => {
  //NOTA: Remember to save any public key to environment without headers/footers and each line separated by _
  // eslint-disable-next-line no-undef
  const publicKeyArray = process.env.REACT_APP_PUBKEY.split("_");
  let publicKeyPem = "-----BEGIN PUBLIC KEY-----\n";
  publicKeyArray.forEach((line) => {
    publicKeyPem += line + "\n";
  });
  publicKeyPem += "-----END PUBLIC KEY-----";

  const publicKey = pki.publicKeyFromPem(publicKeyPem);

  // Encriptar los datos
  const encryptedData = publicKey.encrypt(pwd, "RSA-OAEP");
  return util.encode64(encryptedData);
};

const getAll = () => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/PayPad", config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getById = (id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/PayPad/" + id, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getStorageByPaypad = (idPayPad) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .get("/api/PayPad/GetStorage/" + idPayPad, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

const insertStorages = (storageList) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios
    .post("/api/PayPad/CreateStorage", storageList, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

const create = (paypad) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  paypad.pwd = encryptPwd(paypad.pwd);
  return axios.post("/api/PayPad", paypad, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const createConfiguration = (paypadConfiguration) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.post("/api/PayPad/CreateConfiguration", paypadConfiguration, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const updateConfiguration = (paypadConfiguration) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.put("/api/PayPad/UpdateConfiguration", paypadConfiguration, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getConfigurationByPaypadId = (id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/PayPad/GetConfiguration/" + id, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const update = (paypad) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.put("/api/PayPad", paypad, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const deleteP = (id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.delete("/api/PayPad/" + id, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const changePwd = (changePwdData) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  changePwdData.oldPwd = encryptPwd(changePwdData.oldPwd);
  changePwdData.newPwd = encryptPwd(changePwdData.newPwd);
  return axios
    .put("/api/PayPad/ChangePwd", changePwdData, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

export default {
  getAll,
  getById,
  getStorageByPaypad,
  insertStorages,
  create,
  update,
  deleteP,
  changePwd,
  createConfiguration,
  updateConfiguration,
  getConfigurationByPaypadId
};
