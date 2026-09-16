import "../pages.css";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import withAuthorization from "../withAuthorization";
import FormPayPad from "./components/FormPayPad";
// import ModalGeneric from "../../components/ModalGeneric";
// import { Modal } from "bootstrap";
import PaypadCards from "./components/PayPadCards";
import {TitlePage} from "../../components/TitlePage";
import { usePaypadFunctionalities } from "./hooks/usePaypadFunctionalities";
import useModelFormat from "./hooks/useModelFormat";
import { usePreConfig } from "./hooks/usePreConfig";
import { Dialog } from "primereact/dialog";

const PayPad = () => {
  const [actualMain, setMainView] = useState({ showform: false, idToUpdate: null });
  const {refresh, paypads, offices} = usePreConfig();
  const {paypadInfoFormated, modalElement, buildModel, permissions} = useModelFormat();
  const functionalities = usePaypadFunctionalities(refresh, setMainView);
  const [dialogProperties, setDialogProperties] = useState({visible: false, width: "50vw"});

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (paypads !== null && offices !== null) buildModel(paypads, offices, functionalities, setMainView);
  }, [paypads, offices]);

  useEffect(() => {
    if(modalElement){
      setDialogProperties({visible: true, width: modalElement.type.name === "PayPadBalanceView"?"90vw":"60vw"});
    }
    else{
      setDialogProperties({visible: false, width: "50vw"});
    }
  }, [modalElement]);


  const renderList = () => {
    return (
      <>
        {paypadInfoFormated.length > 0 ? <PaypadCards data={paypadInfoFormated} /> : ""}
      </>
    );
  };

  const renderForm = () => {
    return (
      <FormPayPad
        createHandler={functionalities.createPaypad}
        editHandler={functionalities.updatePaypad}
        backHandler={functionalities.back}
        idToEdit={actualMain.idToUpdate}
      />
    );
  };

  return (
    <>
      <Dialog maximizable position="top" visible={dialogProperties.visible} breakpoints={{"960px": "75vw", "640px": "100vw"}} style={{ width: dialogProperties.width }} onHide={() => setDialogProperties(false)}>
        {modalElement}
      </Dialog>
      <div className="p-4 w-100 h-100">
        <TitlePage title={"Pay+"} icon={"fa-solid fa-hand-holding-dollar"}></TitlePage>
        {permissions.filter((p) => p.name === "WritePayPads").length > 0 ? (
          <button
            className="btn btn-outline-success mx-3"
            onClick={() => {
              setMainView({ showform: true, idToUpdate: null });
            }}
          >
            <FontAwesomeIcon
              className="me-2"
              icon="fa-solid fa-money-check-dollar"
            />
            <span>Crear Pay+</span>
          </button>
        ) : (
          <div className="mb-5"></div>
        )}
        <div className="row rounded-4">
          <div className="col mt-2 pt-2">
            {actualMain.showform ? renderForm() : renderList()}
          </div>
        </div>
      </div>
    </>
  );
};

export default withAuthorization(["/Admin/PayPad"], PayPad);
