import React, { useState } from "react";

const usePayPadTonnageForm = () => {
  const [apTable, setApTable] = useState([]);
  const [dpTable, setDpTable] = useState([]);
  const [totalReject, setTotalReject] = useState(0);
  const [totalAP, setTotalAP] = useState(0);
  const [totalDP, setTotalDP] = useState(0);

  const moneyFormater = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const buildTable = (storage) => {
    if (!storage) return;
    let _apTable = [];
    let _dpTable = [];
    let _totalAp = 0;
    let _totalDp = 0;
    let _totalReject = 0;
    storage.forEach((item) => {
      if (item.apStored > 0) {
        const tableItem = {
          id: item.id,
          Denominación: (
            <div className="d-flex justify-content-center">
              <img
                src={`/staticfiles${item.imgDenom}`}
                alt={`${moneyFormater.format(item.denominationValue)}`}
                height="40px"
              />
            </div>
          ),
          "Cantidad en Aceptadores": (
            <>
              <div className="d-flex flex-row justify-content-center">
                <fieldset disabled={true} style={{color: "white"}}>
                  <p 
                    id={"tonnageAPInput_" + item.id}
                    type="number"
                    className="me-1"
                    style={{ maxWidth: "100px", fontSize: "1.2em" }}
                  >{item.apStored}</p>
                </fieldset>
              </div>
            </>
          ),
          "Valor en Aceptadores": moneyFormater.format(item.apTotal),
        };
        _apTable = _apTable.concat(tableItem);
      }

      if (item.dpStored > 0) {
        const tableItem = {
          id: item.id,
          Denominación: (
            <div className="d-flex justify-content-center">
              <img
                src={`/staticfiles${item.imgDenom}`}
                alt={`${moneyFormater.format(item.denominationValue)}`}
                height="40px"
              />
            </div>
          ),
          "Cantidad en Dispensadores": (
            <>
              <div className="d-flex flex-row justify-content-center">
                <fieldset disabled={true}>
                  <p
                    id={"tonnageDPInput_" + item.id}
                    type="number"
                    className="me-1"
                    style={{ maxWidth: "100px", fontSize: "1.2em" }}
                  >{item.dpStored}</p>
                </fieldset>
              </div>
            </>
          ),
          "Valor en Dispensadores": moneyFormater.format(item.dpTotal),
        };
        _dpTable = _dpTable.concat(tableItem);
      }
      _totalAp += item.apTotal;
      _totalDp += item.dpTotal;
      _totalReject += item.rjTotal;
    });
    setTotalAP(_totalAp);
    setTotalDP(_totalDp);
    setTotalReject(_totalReject);
    setApTable([..._apTable]);
    setDpTable([..._dpTable]);
  };

  return {apTable, dpTable, totalReject, totalAP, totalDP, buildTable};
};

export {usePayPadTonnageForm};