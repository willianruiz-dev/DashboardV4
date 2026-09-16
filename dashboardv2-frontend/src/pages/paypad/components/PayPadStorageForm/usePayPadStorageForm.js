import { React, useState } from "react";
import CheckBtn2 from "../../../../components/UI/ChekBtn2/CheckBtn2";
import { InputText } from "primereact/inputtext";
import mastersService from "../../../../services/mastersService";
import { errorCodes, handleHttpError } from "../../../../errorHandling/errorHandler";
import paypadService from "../../../../services/paypadService";
import Swal from "sweetalert2";

const usePayPadStorageForm = () => {
  const [denominations, setDenominations] = useState([]);
  const [paypadStorage, setPaypadStorage] = useState([]);
  const [denomModel, setDenomModel] = useState([]);
  const moneyFormater = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  
  const refresh = async (paypad) => {
    if (paypad !== undefined && paypad.id !== undefined && paypad.id !== 0) {
      await paypadService
        .getStorageByPaypad(paypad.id)
        .then(({ response }) => {
          setPaypadStorage([...response]);
        })
        .catch(async ({ response }) => {
          setPaypadStorage([]);
          setDenomModel([]);
          const [errCode, errMsg] = await handleHttpError(response);
          if (errCode !== errorCodes.notFound) {
            Swal.fire({
              text: errMsg,
              icon: "error",
            });
          }
        });

      await mastersService
        .getAll("CurrencyDenomination")
        .then(({ response }) => {
          setDenominations([...response.filter((x) => x.idCurrency === paypad.idCurrency)]);
        })
        .catch(async ({ response }) => {
          await handleHttpError(response);
        });
    }
  };

  const buildModel = (storage) => {
    if (!storage) return;
    let _denomModel = [];
    storage.forEach((item) => {
      const paypadStorageItem = paypadStorage.filter(
        (x) => x.idCurrencyDenomination == item.id
      )[0];
      const minDpValue = paypadStorageItem?.minDpQuantity;
      const tableItem = {
        id: item.id,
        Denominación: (
          <div className="d-flex justify-content-center">
            <img
              src={`/staticfiles${item.img}`}
              alt={`${moneyFormater.format(item.value)}`}
              height="40px"
            />
          </div>
        ),
        Valor: moneyFormater.format(item.value),
        Dispensación: (
          <div className="d-flex justify-content-center">
            <CheckBtn2
              key={"checkDP_" + item.id}
              id={"checkDP_" + item.id}
              initialValue={
                paypadStorage.filter(
                  (x) => x.idCurrencyDenomination == item.id && x.isDispensing
                ).length > 0
                  ? true
                  : false
              }
              setCheckBool={() => {}}
            />
          </div>
        ),
        "Cantidad Mínima de operación": (
          <>
            <div className="d-flex flex-row justify-content-center">
              <InputText
                id={"minimumInput_" + item.id}
                type="number"
                className="me-1"
                style={{ maxWidth: "100px", fontSize: "1.2em" }}
                defaultValue={minDpValue ? minDpValue : 0}
              />
            </div>
          </>
        ),
      };
      _denomModel = _denomModel.concat(tableItem);
    });

    setDenomModel([..._denomModel]);
  };

  return {denominations, denomModel, paypadStorage, refresh, buildModel, setDenomModel};
};

export {usePayPadStorageForm};