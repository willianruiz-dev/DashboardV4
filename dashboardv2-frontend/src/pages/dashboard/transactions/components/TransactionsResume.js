import "../../../pages.css";
import React from "react";
// import { TableCrud } from "../../../components/TableCrud";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Card } from "primereact/card";
import PropTypes from "prop-types";

const ALLOWED_STATES = ["Aprobada", "Aprobada Error Devuelta", "Cancelada"];
const ALLOWED_TYPEPAYMENTS = ["Efectivo", "Tarjeta"];

const TransactionCardResume = (props) => {
  return (
    <Card style={{maxWidth: "25rem"}}>
      <div className="row">
        <div className="col-4">
          <FontAwesomeIcon icon={props.icon} className="ms-2" style={{height: "3rem", minHeight: "3rem"}}/>
        </div>
        <div className="col-8" style={{alignSelf: "center", textAlign: "end", fontSize: "0.8rem"}}>
          <h4 className="m-0">
            {props.value}
          </h4>
          <h4 className="m-0">
            {props.message}
          </h4>
        </div>
      </div>
    </Card>
  );
};
	
TransactionCardResume.propTypes = {
  icon: PropTypes.string,
  value: PropTypes.number,
  message: PropTypes.string,
};
  
const TransactionsResume = ({transactionsResume}) => {

  const filteredResumeByState = transactionsResume?.states.filter((st) => ALLOWED_STATES.includes(st.label));
  const filteredResumeByTypePayment = transactionsResume?.typePayment.filter((tp) => ALLOWED_TYPEPAYMENTS.includes(tp.label));
  const rel = {};
  filteredResumeByState?.concat(filteredResumeByTypePayment).forEach(res => {
    rel[res.label] = {nTransaction: res.amountTransactions, totalIncome: res.totalAmount()};
  });

  const moneyFormater = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return (
    <>
      {Object.keys(rel).length > 0?
        <>
          <div className="row">

            <div className="col-xl-3 mt-3" style={{textAlign: "-webkit-center"}}>
              <TransactionCardResume icon={"fa-solid fa-square-check"} value={(rel["Aprobada"]?.nTransaction || 0) + (rel["Aprobada Error Devuelta"]?.nTransaction || 0 )} message={"Transacciones aprobadas"}></TransactionCardResume>
            </div>
            <div className="col-xl-3 mt-3" style={{textAlign: "-webkit-center"}}>
              <TransactionCardResume icon={"fa-solid fa-ban"} value={rel["Cancelada"]?.nTransaction || 0} message={"Transacciones rechazadas"}></TransactionCardResume>
            </div>
            <div className="col-xl-3 mt-3" style={{textAlign: "-webkit-center"}}>
              <TransactionCardResume icon={"fa-solid fa-money-bill"} value={moneyFormater.format(rel["Efectivo"]?.totalIncome || 0)} message={"Total recaudado en Efectivo"}></TransactionCardResume>
            </div>
            <div className="col-xl-3 mt-3" style={{textAlign: "-webkit-center"}}>
              <TransactionCardResume icon={"fa-solid fa-credit-card"} value={moneyFormater.format(rel["Tarjeta"]?.totalIncome || 0)} message={"Total recaudado por tarjeta"}></TransactionCardResume>
            </div>
          </div>
          <div className="row mt-3">
            <div className="col" style={{textAlign: "-webkit-center"}}>
              <TransactionCardResume icon={"fa-solid fa-dollar-sign"} value={moneyFormater.format(rel["Aprobada"]?.totalIncome || 0)} message={"Total recaudado"}></TransactionCardResume>
            </div>
          </div>
        </>
        :
        ""}
    </>
  );
};

TransactionsResume.propTypes = {
  transactionsResume: PropTypes.object,
};

export {TransactionsResume};