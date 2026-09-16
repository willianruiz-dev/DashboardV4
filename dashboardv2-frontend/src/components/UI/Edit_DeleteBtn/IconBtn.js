import React from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./editDelete.css";
import { Button } from "primereact/button";
        
const IconBtn = ({ clickFunc, icon, tooltipText }) => {
  return (
    <>
      <Button rounded
        className="edit-btn"
        severity="success"
        onClick={clickFunc}
        tooltip={tooltipText}
        tooltipOptions={{ position: "top", mouseTrack: true, mouseTrackTop: 15, hideDelay: 50, showDelay: 100}}>
        <FontAwesomeIcon icon={icon} />
      </Button>
    </>
  );
};

IconBtn.propTypes = {
  clickFunc: PropTypes.func,
  icon: PropTypes.string.isRequired,
  tooltipText: PropTypes.string.isRequired,
  dataBsTarget: PropTypes.string,
  dataBsToggle: PropTypes.string,
};

export default IconBtn;
