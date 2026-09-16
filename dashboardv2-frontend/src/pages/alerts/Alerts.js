import React from "react";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import paypadService from "../../services/paypadService";
import { errorCodes, handleHttpError } from "../../errorHandling/errorHandler";
import Swal from "sweetalert2";
import alertsService from "../../services/alertsService";
import { TableCrud } from "../../components/TableCrud";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import withAuthorization from "../withAuthorization";
import IconBtn from "../../components/UI/Edit_DeleteBtn/IconBtn";
// import {  FormText } from "../../components/FormsComponents";
import {TitlePage} from "../../components/TitlePage";
import { useSelector } from "react-redux";
import SelectPayPad from "../dashboard/shared/SelectPayPad";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
const ALERTS = [{ id: 1, description: "Alerta de excases en baúles" }];

SelectPayPad.propTypes = {
  paypads: PropTypes.array,
  paypadSelected: PropTypes.string,
  handleChangePaypad: PropTypes.func,
};

const Alerts = () => {
  const permissions = useSelector((state) => state.login.permitsLogged);
  const [paypads, setPaypads] = useState([]);
  const [selectedPaypad, setSelectedPaypad] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subsTable, setSubsTable] = useState([]);
  const [showFormSub, setShowFormSub] = useState(false);

  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    if (selectedPaypad === null || selectedPaypad === undefined) return;
    refresh();
  }, [selectedPaypad]);

  
  useEffect(() => {
    buildTable(subscriptions);
  }, [subscriptions]);

  const refresh = async () => {
    if (paypads === null || paypads.length <= 0){
      await paypadService
        .getAll()
        .then(({ response }) => {
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
    

    if (selectedPaypad === null || selectedPaypad?.id === undefined) return;
    alertsService
      .getSubsByIdPayPad(selectedPaypad.id)
      .then(({ response }) => {
        setSubscriptions([...response]);
      })
      .catch(async (err) => {
        let [errCode, errMsg] = await handleHttpError(err.response);
        if (errCode === errorCodes.notFound) {
          errMsg = "No se encontró ninguna transacción";
          Swal.fire({
            text: errMsg,
            icon: "warning",
          });
          setSubscriptions([]);
          return;
        }
        Swal.fire({
          text: errMsg,
          icon: "error",
        });
        setSubscriptions([]);
      });
  };

  const buildTable = (newSubs) => {
    if (!newSubs) return;
    let table = [];
    newSubs.forEach((item) => {
      const tableItem = {
        id: item.id,
        Alerta: ALERTS.filter((a) => a.id === item.idAlert)[0]?.description,
        Correo: item.email,
        " ":
        <>
          { permissions.filter((p) => p.name === "DelSubs").length > 0 ?
            <IconBtn
              clickFunc={() => deleteSub(item.id)}
              tooltipText="Eliminar"
              icon="fa-solid fa-times"
            />:""        
          }
        </>,
      };
      table = table.concat(tableItem);
    });
    setSubsTable([...table]);
  };

  const handleChangePaypad = ( value ) => {
    setSelectedPaypad(() => {
      const paypadSelec = paypads.filter((p) => p.username == value.username)[0];
      return { ...paypadSelec };
    });
  };

  const deleteSub = (id) => {
    alertsService
      .deleteSub(id)
      .then(() => refresh())
      .catch(async (err) => {
        const [errCode, errMsg] = await handleHttpError(err.response);
        if (errCode !== errorCodes.notFound) {
          Swal.fire({
            text: errMsg,
            icon: "error",
          });
        }
      });
  };

  const RenderList = () => {
    const [alert, setAlert] = useState("");
    const [idAlert, setIdAlert] = useState(0);
    const [email, setEmail] = useState("");
    const handleSubscription = async (event) => {
      event.preventDefault();
      setShowFormSub(false);
      const subscription = {
        idAlert: idAlert,
        alert: alert.description,
        idPayPad: selectedPaypad.id,
        paypad: selectedPaypad.username,
        email: email,
      };
      await alertsService.create(subscription).catch(async (err) => {
        await handleHttpError(err.response);
        Swal.fire({
          text: "No se pudo crear la subscripción",
          icon: "error",
        });
      });
      refresh();
    };
    const handleFormChange = ({ target }) => {
      if (target.id == "idAlert") {
        if (target.value.id == 0) return;
        setIdAlert(Number(target.value.id));
        setAlert(target.value);
        return;
      }
      setEmail(target.value);
    };

    return (
      <div className="my-5">
        <div className="row mt-2 pt-2 justify-content-end align-items-end " style={{ height: "80px" }}>
          {showFormSub && (selectedPaypad !== null && selectedPaypad.id !== undefined && selectedPaypad.id !== 0)? (
            <div className="col-12">
              <form
                className="py-3 d-flex justify-content-center aling-items-center"
                onSubmit={handleSubscription}
              >
                <Dropdown
                  value={alert}
                  onChange={handleFormChange}
                  options={ALERTS}
                  optionLabel="description"
                  placeholder="Escoge una Alerta" 
                  filter
                  id="idAlert"
                  fieldName={"Alert"}
                ></Dropdown>
                <InputText
                  value={email}
                  onChange={handleFormChange} 
                  id="idEmail"
                  style={{marginLeft: "20px"}}
                />
                {/* <FormText
                  label="Email"
                  value={email}
                  fieldName={"email"}
                  changeFunc={handleFormChange}
                  feedback={null}
                /> */}
                <button
                  className="btn btn-outline-primary"
                  style={{ height: "40px", marginLeft: "20px" }}
                  
                >
                  Subscribir
                </button>
              </form>
            </div>
          ) : (
            <></>
          )}
        </div>
        {subsTable.length > 0 ?
          <>
            <TableCrud data={subsTable} />
          </> : 
          <>
            <div className="table table-dark table-hover text-center values-no-selected mt-5">
              <div className="alert">
                <FontAwesomeIcon className="icon" icon={"fa-solid fa-envelope"} color="black"/>
                <h2 className="mt-2 mb-5 ps-3 text-light" style={{opacity: "40%"}}>{"No existen alertas creadas"}</h2>
              </div>
            </div>
          </>
        }
      </div>
    );
  };

  return (
    <div className="p-4 w-100 h-100">
      <TitlePage title={"Alertas"} icon={"fa-solid fa-solid fa-bell"}></TitlePage>
      <div className="container-fluid pt-2 bg-dark rounded-4  overflow-auto">
        <div className="row my-2 pt-2 justify-content-start">
          <div className="col-6">
            <SelectPayPad
              paypads={paypads ? paypads : []}
              paypadSelected={selectedPaypad}
              handleChangePaypad={handleChangePaypad}
            />
          </div>
          <div className="col-6" style={{borderLeft: "solid", alignSelf: "center"}}>
            { permissions.filter((p) => p.name === "WriteSubs").length > 0 ?
              <div className="py-3 d-flex justify-content-center aling-items-center">
                <b className="p-1 m-2" style={{ fontSize: "1.1rem" }}>
                  Agregar nuevas alertas
                </b>
                <button
                  className="btn btn-outline-success"
                  style={{ height: "40px", width: "40px" }}
                  onClick={() => setShowFormSub(prev => !prev)}
                >
                  {showFormSub ? <FontAwesomeIcon icon="fa-solid fa-caret-right" /> :<FontAwesomeIcon icon="fa-solid fa-plus" />}
                </button>
              </div>
              :""
            }
          </div>
        </div>
        <RenderList />
      </div>
    </div>
  );
};

export default withAuthorization(["/Admin/Alerts"], Alerts);
