import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { usePayPadLoadForm } from "./usePayPadLoadForm";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import BasicContainerBuilder from "../../../../components/BasicPrimeTemplates/BasicContainerBuilder";
import { TitleVerticalAlignPage } from "../../../../components/TitlePage";

const PayPadLoadForm = ({ paypad, saveClickFunc }) => {
  const {permissions, denomModel, denominations, setLoadDetails, loadDetails} = usePayPadLoadForm(paypad);

  const handleSave = () => {
    const loadDetailsFiltered = loadDetails.filter((x) => x.quantity !== 0);
    let _totalLoad = 0;
    loadDetailsFiltered.forEach((ld) => {
      _totalLoad += ld.denominationValue * ld.quantity;
    });
    const loadObj = {
      idPayPad: paypad.id,
      totalLoaded: _totalLoad,
      details: loadDetailsFiltered,
    };

    resetInputs();
    saveClickFunc(loadObj);
  };

  const resetInputs = () => {
    setLoadDetails([]);
    denominations.forEach((denom) => {
      const inputElement = document.getElementById("loadInput_" + denom.id);
      inputElement.value = 0;
    });
  };

  useEffect( () => () => resetInputs([]), [] );

  return (
    <div className="p-3">
      <TitleVerticalAlignPage title={"Cargando: " + paypad.username} icon={"fa-solid fa-circle-dollar-to-slot"}></TitleVerticalAlignPage>
      <div className="mt-1 modal-footer" style={{ border: "none" }}>
        { permissions.filter(p => p.name === "WriteTonnagesAndLoads").length > 0 ?
          <button type="button" className="btn btn-outline-success" onClick={handleSave}>
            Guardar Cargue
          </button>:""
        }
      </div>
      <div style={{maxHeight: "40rem", overflowY: "auto"}}>
        {denomModel.length > 0 ? (
          <DataTable selectionMode="single" value={denomModel}
            tableStyle={{minHeight: "30rem"}}>
            <Column header="Denominación" body={BasicContainerBuilder("Denominación")}></Column>
            <Column header="Cantidad de unidades a cargar" body={BasicContainerBuilder("Cantidad de unidades a cargar")}></Column>
          </DataTable>
        ) : ("No existen denominaciones configuradas")}
      </div>
      
    </div>
  );
};

PayPadLoadForm.propTypes = {
  paypad: PropTypes.object,
  saveClickFunc: PropTypes.func,
};

export default PayPadLoadForm;
