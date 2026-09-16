/* eslint-disable no-undef */
import Swal from "sweetalert2";
import userService from "../services/userService";

//TODO: incluir error de lectura-escritura base de datos
export const errorCodes = {
  notAllowed: "0",
  notFound: "1",
  roleNotFound: "2",
  userLoggedNotExists: "3",
  tokenExpired: "4",
  onlyPaypadAllowed: "7",
  serverError: "99",
  uncaughtError: "100",
  noErrorCode: "101",
};

export async function handleHttpError(responseError) {
  if (responseError?.data === undefined) {
    if (process.env.NODE_ENV === "development") console.log(responseError);
    return;
  }
  const httpResponse = responseError.data;
  if (httpResponse.statusCode >= 500) {
    return await handleServerError(httpResponse);
  }

  if (httpResponse.statusCode >= 400) {
    return await handleClientError(httpResponse);
  }

  if (process.env.NODE_ENV === "development") {
    console.log(responseError);
  }
  return [errorCodes.uncaughtError, responseError];
}

async function handleServerError(httpResponse) {
  if (process.env.NODE_ENV === "development") {
    console.log(httpResponse);
  }
  return [errorCodes.serverError, httpResponse.message];
}

async function handleClientError(httpResponse) {
  if (process.env.NODE_ENV === "development") {
    console.log(httpResponse);
  }
  if (!httpResponse.message)
    return [
      errCode.uncaughtError,
      "Error con repsuesta no satisfactoria del servidor",
    ];

  let responseMsg = httpResponse.message;
  if (httpResponse.message.indexOf(":") === -1) {
    responseMsg = `${errorCodes.noErrorCode}:${httpResponse.message}`;
  }

  const [errCode, errMsg] = responseMsg.split(":");
  if (
    errCode === errorCodes.userLoggedNotExists ||
    errCode === errorCodes.tokenExpired
  ) {
    await Swal.fire({
      text: "Su sessión ha expirado",
      icon: "error",
      allowOutsideClick: false,
    }).finally(await logOut);
  }

  return [errCode, errMsg];
}

async function logOut() {
  console.log("entra a log out");
  await userService
    .logOut()
    .then(() => {
      window.localStorage.removeItem("session");
      window.location.href = "/";
    })
    .catch(({ response }) => {
      if (process.env.NODE_ENV === "development") {
        console.log(response);
      }
    });
}
