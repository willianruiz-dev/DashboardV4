import React, { useEffect, useState } from "react";
import paypadService from "../../../../services/paypadService";
import { errorCodes, handleHttpError } from "../../../../errorHandling/errorHandler";
import PropTypes from "prop-types";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import { usePayPadTonnageForm } from "./usePayPadTonnageForm";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import BasicStringBuilder from "../../../../components/BasicPrimeTemplates/BasicStringBuilder";
import BasicContainerBuilder from "../../../../components/BasicPrimeTemplates/BasicContainerBuilder";
import { Toolbar } from "primereact/toolbar";
import { TitleVerticalAlignPage } from "../../../../components/TitlePage";

const PayPadTonnageForm = ({ paypad, saveClickFunc }) => {
  const permissions = useSelector((state) => state.login.permitsLogged);
  const [paypadStorage, setPaypadStorage] = useState([]);
  const {apTable, dpTable, totalReject, totalAP, totalDP, buildTable} = usePayPadTonnageForm();

  const moneyFormater = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  useEffect(() => {
    if (paypad !== undefined && paypad.id !== undefined && paypad.id !== 0) {
      paypadService
        .getStorageByPaypad(paypad.id)
        .then(({ response }) => {
          setPaypadStorage([...response]);
        })
        .catch(async ({ response }) => {
          setPaypadStorage([]);
          const [errCode, errMsg] = await handleHttpError(response);
          if (errCode !== errorCodes.notFound) {
            Swal.fire({
              text: errMsg,
              icon: "error",
            });
          }
        });
    }
  }, [paypad]);

  useEffect(() => {
    buildTable([...paypadStorage]);
  }, [paypadStorage]);


  const handleSave = () => {
    let _total = 0;
    let _totalAp = 0;
    let _totalDp = 0;
    let _totalReject = 0;
    paypadStorage.forEach((ps) => {
      _totalAp += ps.apTotal;
      _totalDp += ps.dpTotal;
      _totalReject += ps.rjTotal;
      _total += ps.total;
    });

    const tonnageObj = {
      idPayPad: paypad.id,
      totalAp: _totalAp,
      totalDp: _totalDp,
      totalRj: _totalReject,
      total: _total,
    };
    saveClickFunc(tonnageObj);
  };

  return (
    <div className="p-1">
      <TitleVerticalAlignPage title={"Almacenamiento: " + paypad.username} icon={"fa-solid fa-scale-unbalanced"}></TitleVerticalAlignPage>
      <div className="d-flex justify-content-between">
        <h2
          className="mt-1 mb-1 text-left"
          style={{ fontSize: "1rem", fontWeight: "bold" }}
        >
          Total Almacenado: {`${moneyFormater.format(totalAP + totalDP + totalReject)}`}
        </h2>
        <div className="modal-footer" style={{ border: "none" }}>
          { permissions.filter(p => p.name === "WriteTonnagesAndLoads").length > 0 ?
            <button type="button" className="btn btn-outline-success" onClick={handleSave}>
              Arquear
            </button>:""
          }
        </div>
      </div>
      <div className="container-fluid mt-2 p-3 bg-dark rounded-4" style={{ maxHeight: "30rem", overflowY: "auto"}}>
        <Toolbar start={(
          <h2
            className="text-center"
            style={{ fontSize: "1rem", fontWeight: "bold" }}
          >
            Aceptadores
          </h2>
        )} style={{justifyContent: "center"}}></Toolbar>
        {apTable.length > 0 ? (
          <>
            <DataTable selectionMode="single" value={apTable}>
              <Column header="Denominación" body={BasicContainerBuilder("Denominación")}></Column>
              <Column header="Cantidad en Aceptadores" body={BasicContainerBuilder("Cantidad en Aceptadores")}></Column>
              <Column body={BasicStringBuilder("Valor en Aceptadores")} header="Valor en Aceptadores" ></Column>
            </DataTable>
          </>
        ) : (
          <p>No hay ninguna cantidad en los aceptadores</p>
        )}
        <div className="">
          <p  style={{ fontSize: "1rem", fontWeight: "bold", textAlign: "end"  }}>
            Total: {moneyFormater.format(totalAP)}
          </p>
        </div>
      </div>
      <div className="container-fluid mt-3 p-2 bg-dark rounded-4" style={{maxHeight: "30rem", overflowY: "auto"}}>
        <Toolbar start={(
          <h2
            className="text-center"
            style={{ fontSize: "1rem", fontWeight: "bold" }}
          >
            Dispensadores
          </h2>
        )} style={{justifyContent: "center"}}></Toolbar>
        {dpTable.length > 0 ? (
          <>
            <DataTable selectionMode="single" value={dpTable}
              tableStyle={{padding: "0px"}}>
              <Column header="Denominación" body={BasicContainerBuilder("Denominación")}></Column>
              <Column header="Cantidad en Dispensadores" body={BasicContainerBuilder("Cantidad en Dispensadores")}></Column>
              <Column body={BasicStringBuilder("Valor en Dispensadores")} header="Valor en Dispensadores" ></Column>
            </DataTable>
          </>
        ) : (
          <p>No hay ninguna cantidad en los dispensadores</p>
        )}
        <div className="">
          <p  style={{ fontSize: "1rem", fontWeight: "bold", textAlign: "end" }}>
            Total: {moneyFormater.format(totalDP)}
          </p>
        </div>
      </div>
      <h2
        className="mt-3"
        style={{ fontSize: "1.1rem", fontWeight: "bold" }}
      >
        Baúl de rechazo
      </h2>
      <div className="ms-1">
        <p  style={{ fontSize: "0.9rem", fontWeight: "bold" }}>
          Total: {moneyFormater.format(totalReject)}
        </p>
      </div>
    </div>
  );
};

PayPadTonnageForm.propTypes = {
  paypad: PropTypes.object,
  saveClickFunc: PropTypes.func,
};

export default PayPadTonnageForm;
