import { React, useState, useEffect, useMemo } from "react";
import IconBtn from "../../../../components/UI/Edit_DeleteBtn/IconBtn";
import StateLabel from "../StateLabel";
import TransactionDetailView from "../../transactions/components/TransactionDetail";
import transactionService from "../../../../services/transactionService";
import { errorCodes, handleHttpError } from "../../../../errorHandling/errorHandler";
import Swal from "sweetalert2";
import { Modal } from "bootstrap";
import paypadService from "../../../../services/paypadService";


const useTransaction = (dateRange = null, selectedPaypad = null) => {
  const [transactions, setTransactions] = useState([]);
  const [transactionsTable, setTransactionsTable] = useState([]);
  const [modalElement, setModalElement] = useState(null);
  
  const [initialTransactions, setInitialTransactions] = useState([]);
  const element = useMemo(() => document.getElementById("transactionModal"));

  const moneyFormater = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const buildTable = (newTransactions) => {
    if (!newTransactions) return;
    let table = [];
    newTransactions.forEach((item) => {
      const tableItem = {
        id: item.id,
        ID: item.id,
        Trámite: item.typeTransaction,
        "Referencia cliente": item.reference,
        Documento: item.document,
        Fecha:
          item.dateCreated.split("T")[0] +
          " " +
          item.dateCreated.split("T")[1].substring(0, 8),
        Total: moneyFormater.format(item.totalAmount),
        "Total sin redondear": moneyFormater.format(item.realAmount),
        Ingresado: moneyFormater.format(item.incomeAmount),
        Devuelto: moneyFormater.format(item.returnAmount),
        "Medio de pago": item.typePayment,
        Estado: <StateLabel value={item.stateTransaction} />,
      };
      if(element !== null) {
        tableItem["Accion"] = (
          <IconBtn
            clickFunc={() => {
              const itemCopy = {...item};
              setModalElement(
                <TransactionDetailView
                  transaction={itemCopy}
                />
              );
            }}
            icon="fa-solid fa-glasses"
            tooltipText="Ver más"
          />
        );
      }
      table = table.concat(tableItem);
    });
    setTransactionsTable([...table]);
  };

  const getTransactionsOnePaypad = (internalSelectedPaypad, concatTransactions = false) => {
    transactionService.getByIdPaypadAndDate({
      id: internalSelectedPaypad.id,
      from: dateRange.from,
      to: dateRange.to,
    }).then(({ response }) => {
      if(concatTransactions) setTransactions((state) => {
        setInitialTransactions(state.concat([...response]));
        return state.concat([...response]);});
      else setTransactions([...response]);
    }).catch(async ({ response }) => {
      let [errCode, errMsg] = await handleHttpError(response);
      if (errCode === errorCodes.notFound) {
        if(concatTransactions) return;
        errMsg = "No se encontró ninguna transacción";
        Swal.fire({
          text: errMsg,
          icon: "warning",
        });
        setTransactions([]);
        return;
      }
      Swal.fire({
        text: errMsg,
        icon: "error",
      });
      setTransactions([]);
    });
  };

  const refresh = async () => {
    if (dateRange === null || selectedPaypad === null) return;
    if(selectedPaypad.id == "all"){
      let paypads = await paypadService.getAll()
        .then(({ response }) => {
          return [...response];
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
          return [];
        });
      paypads.forEach(pp => getTransactionsOnePaypad(pp, true));
      return;
    }
    getTransactionsOnePaypad(selectedPaypad);
  };

  useEffect(() => {
    if (modalElement !== null && element !== null) {
      const modal = new Modal(element, {
        backdrop: "static",
      });
      modal.show();
    }
  }, [modalElement]);

  useEffect(() => {
    buildTable(transactions);
  }, [transactions]);

  return {transactions, transactionsTable, modalElement, setTransactions, refresh, initialTransactions};
};

export default useTransaction;