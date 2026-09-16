import { useState, useEffect } from "react";
import paypadService from "../../../../services/paypadService";
import { errorCodes, handleHttpError } from "../../../../errorHandling/errorHandler";
import Swal from "sweetalert2";

const useSelectPayPad = (addAll = false) => {
  const [selectedPaypad, setSelectedPaypad] = useState(null);
  const [paypads, setPaypads] = useState([]);
  useEffect(() => {
    async function fetchData(){
      await paypadService
        .getAll()
        .then(({ response }) => {
          if(addAll)response.push({ id: "all", username: "Todos los Pay+"});
          setPaypads([...response]);
        })
        .catch(async ({ response }) => {
          const [errCode, errMsg] = await handleHttpError(response);
          if (errCode !== errorCodes.notFound) {
            Swal.fire({
              text: errMsg,
              icon: "error",
            });
            return;
          }
          setPaypads([]);
        });
    }
    if (paypads === null || paypads.length <= 0) {
      fetchData();
    }
  }, []);

  const handleChangePaypad = (value) => {
    setSelectedPaypad(() => {
      const paypadSelec = paypads.filter((p) => p.username == value.username)[0];
      return { ...paypadSelec };
    });
  };
  return {paypads, selectedPaypad, handleChangePaypad, setPaypads};
};

export default useSelectPayPad;