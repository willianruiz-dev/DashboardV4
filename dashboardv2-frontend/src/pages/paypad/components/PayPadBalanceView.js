import React, { useEffect, useState } from "react";
import { handleHttpError } from "../../../errorHandling/errorHandler";
import { TableCrudWithAdditionalInfo } from "../../../components/TableCrud";
import PropTypes from "prop-types";
import loadService from "../../../services/loadService";
import tonnageService from "../../../services/tonnageService";
import IconBtn from "../../../components/UI/Edit_DeleteBtn/IconBtn";
import { TitleVerticalAlignPage } from "../../../components/TitlePage";

const PayPadBalanceView = ({ paypad }) => {
  const [paypadTonnages, setPaypadTonnages] = useState([]);
  const [paypadLoads, setPaypadLoads] = useState([]);
  const [tonnagesTable, setTonnagesTable] = useState([]);
  const [loadsTable, setLoadsTable] = useState([]);
  const moneyFormater = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  useEffect(() => {
    if (paypad !== undefined && paypad.id !== undefined && paypad.id !== 0) {
      tonnageService
        .getByIdPaypad(paypad.id)
        .then(({ response }) => {
          setPaypadTonnages([...response]);
        })
        .catch(async ({ response }) => {
          setPaypadTonnages([]);
          await handleHttpError(response);
        });

      loadService
        .getByIdPaypad(paypad.id)
        .then(({ response }) => {
          setPaypadLoads([...response]);
        })
        .catch(async ({ response }) => {
          setPaypadLoads([]);
          await handleHttpError(response);
        });
    }
  }, [paypad]);

  useEffect(() => {
    buildTableT([...paypadTonnages]);
  }, [paypadTonnages]);

  useEffect(() => {
    buildTableL([...paypadLoads]);
  }, [paypadLoads]);

  const buildTableT = (tonnages) => {
    if (!tonnages) return;
    let _tonnagesTable = [];
    tonnages.forEach((item) => {
      const tableItem = {
        id: item.id,
        ID: item.id,
        "Valor total aceptadores": moneyFormater.format(item.totalAp),
        "Valor total dispensadores": moneyFormater.format(item.totalDp),
        "Valor total baúl rechazo": moneyFormater.format(item.totalRj),
        "Valor Total": moneyFormater.format(item.total),
        "Fecha": 
          item.dateCreated.split("T")[0] +
          " " +
          item.dateCreated.split("T")[1].substring(0, 8),
        " ": (
          <IconBtn
            clickFunc={() => {}}
            icon="fa-solid fa-eye"
            tooltipText="Ver detalles"
          />
        ),
        additionalInfo: (
          <div className="container" key={"addInfoT_" + item.id}>
            <div className="row">
              {item.details.map((detail) => {
                return (
                  <div
                    className="col-4 mb-2 text-start"
                    key={"detailT_" + detail.id}
                  >
                    <h6 className="mb-1" style={{ fontSize: "0.85rem" }}>
                      <b>{moneyFormater.format(detail.denominationValue)}</b>
                    </h6>
                    <p className="mb-0">
                      <b>Aceptadores:</b> {detail.quantityAp} unidades
                    </p>
                    <p className="mb-0">
                      <b>Dispensadores:</b> {detail.quantityDp} unidades
                    </p>
                    <p className="mb-0">
                      <b>Baúl rechazo:</b> {detail.quantityRj} unidades
                    </p>
                    <p className="mb-0">
                      <b>Total:</b> {detail.quantityTotal} unidades
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ),
      };
      _tonnagesTable = _tonnagesTable.concat(tableItem);
    });
    setTonnagesTable([..._tonnagesTable]);
  };

  const buildTableL = (loads) => {
    if (!loads) return;
    let _loadsTable = [];
    loads.forEach((item) => {
      const tableItem = {
        id: item.id,
        ID: item.id,
        "Valor total cargado": moneyFormater.format(item.totalLoaded),
        "Fecha":
          item.dateCreated.split("T")[0] +
          " " +
          item.dateCreated.split("T")[1].substring(0, 8),
        " ": (
          <IconBtn
            clickFunc={() => {}}
            icon="fa-solid fa-eye"
            tooltipText="Ver detalles"
          />
        ),
        additionalInfo: (
          <div className="container" key={"addInfoL_" + item.id}>
            <h5>Cantidades Cargadas</h5>
            <div className="row">
              {item.details.map((detail) => {
                return (
                  <div className="col-3" key={"detailL_" + detail.id}>
                    <p className="m-1 p-1">
                      <b>{moneyFormater.format(detail.denominationValue)}:</b>{" "}
                      {detail.quantity} unidades
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ),
      };
      _loadsTable = _loadsTable.concat(tableItem);
    });
    setLoadsTable([..._loadsTable]);
  };

  return (
    <div className="p-3">
      <TitleVerticalAlignPage title={"Cargues y Arqueos: " + paypad.username} icon={"fa-solid fa-glasses"}></TitleVerticalAlignPage>
      <div className="container-fluid bg-dark rounded-4">
        <div className="row">
          <div className="col-6" style={{borderRight: "solid"}}>
            <h2
              className="mb-2 mt-1 text-center"
              style={{ fontSize: "1.1rem", fontWeight: "bold" }}
            >
              Arqueos
            </h2>
            <div className="px-1 overflow-auto" style={{ height: "40rem" }}>
              {tonnagesTable.length > 0 ? (
                <TableCrudWithAdditionalInfo key={"tonnagesTable"}
                  data={tonnagesTable}
                  isEnumarated={false}
                />
              ) : (
                <p>No hay ningún arqueo aún</p>
              )}
            </div>
          </div>
          <div className="col-6" style={{borderLeft: "solid"}}>
            <h2
              className="mb-2 mt-1 text-center"
              style={{ fontSize: "1.1rem", fontWeight: "bold" }}
            >
              Cargue
            </h2>
            <div className="px-1 overflow-auto" style={{ height: "40rem" }}>
              {loadsTable.length > 0 ? (
                <TableCrudWithAdditionalInfo key={"loadsTable"} data={loadsTable} isEnumarated={false} />
              ) : (
                <p>No hay ningún cargue aún</p>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* <div className="my-2"></div> */}

    </div>
  );
};

PayPadBalanceView.propTypes = {
  paypad: PropTypes.object,
};

export default PayPadBalanceView;
