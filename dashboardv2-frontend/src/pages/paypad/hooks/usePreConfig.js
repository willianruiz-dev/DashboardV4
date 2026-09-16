import { useState } from "react";
import paypadService from "../../../services/paypadService";
import officeService from "../../../services/officeService";
import Swal from "sweetalert2";
import { errorCodes, handleHttpError } from "../../../errorHandling/errorHandler";

const usePreConfig = () => {
  const [paypads, setPaypads] = useState(null);
  const [offices, setOffices] = useState(null);

  const refresh = async () => {
    await paypadService
      .getAll()
      .then(({ response }) => {
        setPaypads([...response]);
      })
      .catch(async ({ response }) => {
        const [errCode, errMsg] = await handleHttpError(response);
        if (errCode !== errorCodes.notFound) {
          Swal.fire({
            text: errMsg,
            icon: "error",
          });
        } else {
          Swal.fire({
            text: "Aún no cuenta con corresponsales",
            icon: "warning",
          });
        }
        setPaypads([]);
        setOffices([]);
      });

    await officeService
      .getAll()
      .then(({ response }) => {
        setOffices([...response]);
      })
      .catch(async ({ response }) => {
        await handleHttpError(response);
        const [errCode, errMsg] = await handleHttpError(response);
        if (errCode !== errorCodes.notFound) {
          Swal.fire({
            text: errMsg,
            icon: "error",
          });
        }
        setPaypads([]);
        setOffices([]);
      });
  };

  return {refresh, paypads, offices};
};

export {
  usePreConfig 
};