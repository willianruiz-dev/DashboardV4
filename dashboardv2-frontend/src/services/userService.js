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

const login = (credentials) => {
  const config = {
    headers: { ...GENERAL_HEADERS },
  };

  credentials.password = encryptPwd(credentials.password);
  return axios.post("/Auth/Login", credentials, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const verifyPwd = (credentials) => {
  const config = {
    headers: { ...GENERAL_HEADERS },
  };

  credentials.password = encryptPwd(credentials.password);
  return axios
    .post("/Auth/VerifyPwd", credentials, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

const logOut = () => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/Auth/Logout", config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getAll = () => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/User", config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getLogged = () => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/User/Logged", config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getByRole = (role) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/User/Role/" + role, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const getById = (id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.get("/api/User/" + id, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const update = (user) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.put("/api/User", user, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const create = (user) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  user.pwd = encryptPwd(user.pwd);
  return axios.post("/api/User", user, config).then((responseObj) => {
    const { data } = responseObj;
    return data;
  });
};

const deleteU = (id) => {
  const token = window.localStorage.getItem("session");
  const config = {
    headers: { ...GENERAL_HEADERS, Authorization: "Bearer " + token },
  };
  return axios.delete("/api/User/" + id, config).then((responseObj) => {
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
    .put("/api/User/ChangePwd", changePwdData, config)
    .then((responseObj) => {
      const { data } = responseObj;
      return data;
    });
};

export default {
  login,
  verifyPwd,
  logOut,
  getAll,
  getLogged,
  getByRole,
  getById,
  update,
  create,
  deleteU,
  changePwd,
};
