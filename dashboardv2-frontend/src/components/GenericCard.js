import React from "react";
import PropTypes from "prop-types";
import "./components.css";

const GenericCard = ({ children }) => {
  return <div className="col-auto card-noboot m-2">{children}</div>;
};

GenericCard.propTypes = {
  children: PropTypes.element,
};

export default GenericCard;
