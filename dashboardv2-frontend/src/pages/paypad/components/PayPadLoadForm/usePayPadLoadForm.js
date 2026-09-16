import { React, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import mastersService from "../../../../services/mastersService";
import { errorCodes, handleHttpError } from "../../../../errorHandling/errorHandler";
import Swal from "sweetalert2";
import { InputText } from "primereact/inputtext";
import paypadService from "../../../../services/paypadService";

const usePayPadLoadForm = (paypad) => {
  const permissions = useSelector((state) => state.login.permitsLogged);
  const [denominations, setDenominations] = useState([]);
  const [denomModel, setDenomModel] = useState([]);
  const [loadDetails, setLoadDetails] = useState([]);
  const moneyFormater = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  useEffect(() => {
    async function fetchRemoteData() {
      let response = await paypadService
        .getStorageByPaypad(paypad.id)
        .catch(async ({ response }) => {
          const [errCode, errMsg] = await handleHttpError(response);
          if (errCode !== errorCodes.notFound) {
            Swal.fire({
              text: errMsg,
              icon: "error",
            });
          }
        });

      let storageFetched = response ? [...response.response].filter(x => x.isDispensing).map(fx => fx.idCurrencyDenomination) : [];

      if(storageFetched)
        mastersService
          .getAll("CurrencyDenomination")
          .then(({ response }) => {
            if (paypad !== null && paypad.id !== undefined && paypad.id !== 0) {
              setDenominations([
                ...response.filter((x) => (x.idCurrency === paypad.idCurrency) && storageFetched.includes(x.id)),
              ]);
              return;
            }
          })
          .catch(async ({ response }) => {
            const [errCode, errMsg] = await handleHttpError(response);
            if (errCode !== errorCodes.notFound) {
              Swal.fire({
                text: errMsg,
                icon: "error",
              });
            }
          });
    }
    fetchRemoteData();
  }, []);
  
  useEffect(() => {
    setDenominations([
      ...denominations.filter((x) => x.idCurrency === paypad.idCurrency),
    ]);
  }, [paypad]);
  
  useEffect(() => {
    buildModel([...denominations]);
  }, [denominations]);

  const buildModel = (denoms) => {
    if (!denoms) return;
    let model = [];
    denoms.forEach((item) => {
      const modelItem = {
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
        "Cantidad de unidades a cargar": (
          <>
            <div className="d-flex flex-row justify-content-center">
              <InputText
                id={"loadInput_" + item.id}
                type="number"
                className="me-1"
                style={{ maxWidth: "100px", fontSize: "1.2em" }}
                onChange={({ target }) => {
                  handleChange(item, target.value);
                }}
                defaultValue={0}
              />
            </div>
          </>
        ),
      };
      model = model.concat(modelItem);
    });
    setDenomModel([...model]);
  };

  const handleChange = (denomination, _quantity) => {
    let loadDetail;
    if (_quantity === null || _quantity === undefined || _quantity === "")
      _quantity = 0;
    const loadDetailIndex = loadDetails.findIndex(
      (x) => x.idCurrencyDenomination == denomination.id
    );
    if (loadDetailIndex >= 0) {
      setLoadDetails((prevLoadDetails) => {
        prevLoadDetails[loadDetailIndex].quantity = Number(_quantity);
        return prevLoadDetails;
      });
    } else {
      loadDetail = {
        idCurrencyDenomination: denomination.id,
        denominationValue: denomination.value,
        quantity: Number(_quantity),
      };
      setLoadDetails((prevLoadDetails) => {
        prevLoadDetails.push(loadDetail);
        return prevLoadDetails;
      });
    }
  };

  return {permissions, denomModel, denominations, setLoadDetails, setDenominations, loadDetails};
};

export {usePayPadLoadForm};