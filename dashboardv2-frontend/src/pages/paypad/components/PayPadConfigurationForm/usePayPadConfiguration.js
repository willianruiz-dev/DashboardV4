import { useState } from "react";
import paypadService from "../../../../services/paypadService";
import Swal from "sweetalert2";
import { errorCodes, handleHttpError } from "../../../../errorHandling/errorHandler";

const usePayPadConfiguration = (paypad) => {
  const [paypadConfiguration, setPaypadConfiguration] = useState(null);
  const refresh = async () => {
    await paypadService
      .getConfigurationByPaypadId(paypad.id)
      .then(({ response }) => {
        setPaypadConfiguration(response);
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
            text: "No existe una configuración previa, se creará una nueva",
            icon: "warning",
          });
        }
      }); 
  };

  return {paypadConfiguration, refresh};
};

export {usePayPadConfiguration};