import "../../pages.css";
import { React } from "react";
import PropTypes from "prop-types";

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

export default StateLabel;
