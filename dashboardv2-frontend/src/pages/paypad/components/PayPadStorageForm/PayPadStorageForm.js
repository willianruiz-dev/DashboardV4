import React, { useEffect } from "react";
import PropTypes from "prop-types";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import { usePayPadStorageForm } from "./usePayPadStorageForm";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import BasicStringBuilder from "../../../../components/BasicPrimeTemplates/BasicStringBuilder";
import BasicContainerBuilder from "../../../../components/BasicPrimeTemplates/BasicContainerBuilder";
import { TitleVerticalAlignPage } from "../../../../components/TitlePage";

const PayPadStorageForm = ({ paypad, saveClickFunc }) => {
  const permissions = useSelector((state) => state.login.permitsLogged);
  const {denominations, denomModel, paypadStorage, refresh, buildModel, setDenomModel} = usePayPadStorageForm();

  useEffect(() => {
    setTimeout(()=>{
      refresh(paypad);
    }, 400);
  }, [paypad]);

  useEffect(() => {
    buildModel([
      ...denominations,
    ]);
  }, [paypadStorage, denominations]);

  const handleSave = () => {
    const paypadStorages = [];
    let breaked = false;
    for (const denom of denominations) {
      const checkDPElement = document.getElementById("checkDP_" + denom.id);
      const minimumInput = document.getElementById("minimumInput_" + denom.id);
      if (Number(minimumInput.value) != 0 && !checkDPElement.checked){
        Swal.fire({
          text: "Recuerde seleccionar las denominaciones de operación",
          icon: "warning",
        });
        breaked = true;
        break;
      }

      const isObjectPrev =
        paypadStorage.filter(
          (x) => x.idCurrencyDenomination == denom.id && x.isDispensing
        ).length > 0;
      if (checkDPElement.checked || isObjectPrev) {
        const paypadStorage = {
          idPayPad: paypad.id,
          idCurrencyDenomination: denom.id,
          isDispensing: checkDPElement.checked,
          minDpQuantity: Number(minimumInput.value),
        };
        paypadStorages.push(paypadStorage);
      }
    }
    if (breaked) return;
    saveClickFunc(paypadStorages);
  };

  useEffect( () => () => setDenomModel([]), [] );

  return (
    <div className="">
      <TitleVerticalAlignPage title={paypad.username} icon={"fa-solid fa-dollar-sign"}></TitleVerticalAlignPage>
      <div>
        <div className="d-flex justify-content-between mt-2">
          <h2
            className="mb-2 text-left"
            style={{ fontSize: "1.2rem", fontWeight: "bold" }}
          >
            Lista de Denominaciones
          </h2>
          <div className="modal-footer" style={{ border: "none" }}>
            { permissions.filter(p => p.name === "WriteTonnagesAndLoads").length > 0 ?
              <button type="button" className="btn btn-outline-success" onClick={handleSave}>
              Guardar
              </button>:""
            }
          
          </div>
        </div>
        {denomModel.length > 0 ? (
          <DataTable selectionMode="single" value={denomModel}
            tableStyle={{minHeight: "30rem"}}>
            <Column header="Denominación" body={BasicContainerBuilder("Denominación")}></Column>
            <Column body={BasicStringBuilder("Valor")} header="Valor" ></Column>
            <Column header="Dispensación" body={BasicContainerBuilder("Dispensación")}></Column>
            <Column header="Cantidad Mínima de operación" body={BasicContainerBuilder("Cantidad Mínima de operación")}></Column>
          </DataTable>
        ) : (
          <p>No se obtuvieron denominaciones.</p>
        )}
      </div>
    </div>
  );
};

PayPadStorageForm.propTypes = {
  paypad: PropTypes.object,
  saveClickFunc: PropTypes.func,
};

export default PayPadStorageForm;
