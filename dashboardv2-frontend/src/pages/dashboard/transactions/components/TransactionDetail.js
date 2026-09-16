import React, { useEffect, useState } from "react";
import { errorCodes, handleHttpError } from "../../../../errorHandling/errorHandler";
import PropTypes from "prop-types";
import transactionService from "../../../../services/transactionService";
import Swal from "sweetalert2";
import mastersService from "../../../../services/mastersService";
import { TableCrud } from "../../../../components/TableCrud";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const StateLabel = ({ value }) => {
  let labelClassName = "badge";
  const evaluateValue = () => {
    switch (value) {
    case "Iniciada":
      labelClassName += " text-bg-primary";
      break;
    case "Aprobada":
      labelClassName += " text-bg-success";
      break;
    case "Cancelada":
      labelClassName += " text-bg-danger";
      break;
    case "Aprobada Error Devuelta":
      labelClassName += " text-bg-warning";
      break;
    case "Cancelada Error Devuelta":
      labelClassName += " text-bg-danger";
      break;
    case "Aprovada Sin Notificar":
      labelClassName += " text-bg-warning";
      break;
    case "Error Servicio de Tercero":
      labelClassName += " text-bg-warning";
      break;
    default:
      labelClassName += " text-bg-light";
      break;
    }
  };

  evaluateValue();
  return (
    <>
      <span className={labelClassName} style={{ fontSize: "15px" }}>
        {value}
      </span>
    </>
  );
};

StateLabel.propTypes = {
  value: PropTypes.string,
};

const TransactionInfo = ({transaction}) => {
  const moneyFormater = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const [downloading, setDownload] = useState(false);

  const requestVideo = () => {
    setDownload(true);
    let dto = {
      idTransaction: transaction.id.toString(),
      idPaypad: transaction.idPayPad.toString()
    };
    transactionService.downloadVideo(dto).catch(async ({ response }) => {
      let [, errMsg] = await handleHttpError(response);
      var message = response.status == 404 ? "El vídeo no se encontró. Acceda al agilizador en específico para consultarlo." : errMsg;
      Swal.fire({
        text: message,
        icon: response.status == 404 ? "warning" : "error",
      });
      return;
    }
    ).finally(() => setDownload(false));
  };

  return (
    <div className="container">
      <div className="row">
        <div className="col-6">
          <div className="card text-bg-dark border-secondary" style={{minHeight: "380px", maxHeight: "380px", overflow: "auto"}}>
            <div className="card-body">
              <h5 className="card-title">Información Transacción {transaction.id}</h5>
              <div className="p-2">
                <strong>Pay+</strong> <br></br>
                <p className="card-text">{transaction.paypad}</p>
                <strong>Producto</strong> <br></br>
                <p className="card-text">{transaction.product}</p>
                <strong>Referencia</strong> <br></br>
                <p className="card-text">{transaction.reference}</p>
                <strong>Estado</strong> <br></br>
                <StateLabel value={transaction.stateTransaction} />
                <p className="card-text"></p> 
                <strong>Descripción</strong> <br></br>
                <p className="card-text">{transaction.description}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6">
          <div className="card text-bg-dark border-secondary" style={{minHeight: "380px", maxHeight: "380px", overflow: "auto"}}>
            <div className="card-body">
              <div className="p-2">
                <strong>Fecha</strong> <br></br>
                <p className="card-text">{
                  transaction.dateCreated.split("T")[0] +
                  " " +
                  transaction.dateCreated.split("T")[1].substring(0, 8)
                }
                </p>
                <strong>Total</strong> <br></br>
                <p className="card-text">{moneyFormater.format(transaction.totalAmount)}</p>
                <strong>Total sin redondear</strong> <br></br>
                <p className="card-text">{moneyFormater.format(transaction.realAmount)}</p>
                <strong>Total ingresado</strong> <br></br>
                <p className="card-text">{moneyFormater.format(transaction.incomeAmount)}</p>
                <strong>Total devuelto</strong> <br></br>
                <p className="card-text">{moneyFormater.format(transaction.returnAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="row mt-4 p-2">
        <button type="button" className="btn btn-outline-success" disabled={downloading} onClick={requestVideo}>
          <FontAwesomeIcon icon={"fa-solid fa-video"} className="ms-2" style={{marginRight: "1rem"}}/>
                Descargar vídeo
        </button>
      </div>
    </div>

  );
  
};

TransactionInfo.propTypes = {
  transaction: PropTypes.object,
};

const TransactionDetailView = ({transaction }) => {
  const [tranDetailsTable, setTranDetailsTable] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [denominations, setDenominations] = useState([]);
  const moneyFormater = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  
  useEffect(() => {
    if (denominations.length <= 0) {
      mastersService
        .getAll("CurrencyDenomination")
        .then(({ response }) => {
          setDenominations([...response]);
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
        });
    }
  },[]);

  

  useEffect(() => {
    const isTransactionValid = transaction !== undefined && transaction.id !== undefined && transaction.id !== 0;
    const isDenominationsValid = denominations !== undefined && denominations.length > 0; 
    if (isTransactionValid && isDenominationsValid) {
      transactionService.getDetailsByIdTransaction(transaction.id)
        .then(({ response }) => {
          buildTable([...response]);
        })
        .catch(async (err) => {
          const [errCode, errMsg] = await handleHttpError(err.response);
          if (errCode !== errorCodes.notFound) {
            Swal.fire({
              text: errMsg,
              icon: "error",
            });
          }
          setTranDetailsTable([]);
        });
    }
  }, [transaction, denominations]);

  useEffect(() => {
    setTabs([
      ...
      [
        {
          tabName: "Transacción",
          element: 
          <>
            {transaction !== undefined && transaction.id !== undefined && transaction.id !== 0  ? (
              <TransactionInfo transaction={transaction}/>
            ) : (
              <></>
            )}
          </>
        },
        {
          tabName: "Detalles",
          element:  
          <>
            {tranDetailsTable.length > 0 ? (
              <TableCrud data={tranDetailsTable} isEnumarated={false}/>
            ) : (
              <p>No hay ningún movimiento aún</p>
            )}
          </>,
        }
      ]
    ]);
  },[tranDetailsTable]);
  const buildTable = (tranDetails) => {
    if (!tranDetails) return;
    const tranDetailsOrdered = [];
    let id = 0;
    for(const detail of tranDetails){
      let detailItem = tranDetailsOrdered
        .find((t) => t.idTypeOperation === detail.idTypeOperation && 
        t.idCurrencyDenomination === detail.idCurrencyDenomination);

      if(detailItem !== undefined){
        detailItem.quantity += 1;
        continue;
      }
      
      detailItem = {
        id: id++,
        idTypeOperation: detail.idTypeOperation,
        typeOperation: detail.typeOperation,
        idCurrencyDenomination: detail.idCurrencyDenomination,
        denominationValue: denominations.find((d) => d.id === detail.idCurrencyDenomination).value,
        denominationImg: denominations.find((d) => d.id === detail.idCurrencyDenomination).img,
        quantity: 1,
      };
      
      tranDetailsOrdered.push(detailItem);
    }

    let _tranDetailsTable = [];
    tranDetailsOrdered.forEach((item) => {
      const tableItem = {
        id: item.id,
        "Tipo de operacion": item.typeOperation,
        "Denominación": <img
          src={`staticfiles${item.denominationImg}`}
          alt={`Denominación:${moneyFormater.format(item.denominationValue)}`}
          height="50px"
        />,
        "Cantidad": item.quantity,
      };
      _tranDetailsTable = _tranDetailsTable.concat(tableItem);
    });
    setTranDetailsTable([..._tranDetailsTable]);
  };

  

  return (
    <div className="p-3">
      <h1
        className="mt-2 mb-4 text-right"
        style={{ fontSize: "1.1rem", fontWeight: "bold" }}
      >
        Detalle de transacción
      </h1>

      
      <div className="overflow-auto" style={{ height: "600px" }}>
        <TabSelector tabs={tabs}></TabSelector>
      </div>

      
      <div className="mt-2 modal-footer" style={{ border: "none" }}>
        <button
          type="button"
          className="btn btn-outline-danger"
          data-bs-dismiss="modal"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

TransactionDetailView.propTypes = {
  transaction: PropTypes.object,
};

const TabSelector = ({ tabs}) => {
  
  const [activeElement, setActiveElement] = useState(null);

  useEffect(() => {
    if (tabs !== undefined && tabs.length > 0)
      setActiveElement(tabs[0].element);
  },[tabs]);

  
  return (
    <>
      {tabs === undefined || tabs.length <= 0 ? <></>:
        <div className="card text-bg-dark" style={{border: "none"}}>
          <div className="card-header">
            <ul className="nav nav-underline card-header-tabs ">
              {tabs.map((tab) => {
                return <li key={"tab_"+tab.tabName} style={{cursor: "pointer"}} className="nav-item" onClick={ () =>
                {
                  setActiveElement(tab.element);
                }
                }
                >
                  <a className={`nav-link ${activeElement === tab.element ? "active" : ""} text-bg-dark`}>{tab.tabName}</a>
                </li>;
              })}
            </ul>
          </div>
          <div className="card-body">
            {activeElement}
          </div>
        </div>
      }
    </>
  );
};

TabSelector.propTypes = {
  tabs: PropTypes.array,
};



export default TransactionDetailView;
