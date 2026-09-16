import React, { useState } from "react";
import PropTypes from "prop-types";
import "./CheckBtn2.css";

const CheckBtn2 = ({ initialValue, setCheckBool, ...props }) => {
  const [checkState, setCheckState] = useState(initialValue);

  const handleCheckChange = () => {
    setCheckState(!checkState);
    setCheckBool(!checkState);
  };

  return (
    <label className="check2">
      <input
        id={props.id}
        defaultChecked={checkState}
        onChange={handleCheckChange}
        type="checkbox"
      />
      <div className="checkmark2"></div>
    </label>
  );
};

CheckBtn2.propTypes = {
  initialValue: PropTypes.bool.isRequired,
  setCheckBool: PropTypes.func.isRequired,
  id: PropTypes.string,
};
export default CheckBtn2;
