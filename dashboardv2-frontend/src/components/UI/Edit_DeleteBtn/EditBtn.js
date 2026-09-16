import React from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./editDelete.css";
import { Button } from "primereact/button";

const EditBtn = ({ clickFunc }) => {
  return (
    <>
      <Button rounded
        className="edit-btn"
        severity="success"
        onClick={clickFunc}
        tooltip={"Editar"}
        tooltipOptions={{ position: "top", mouseTrack: true, mouseTrackTop: 15, hideDelay: 50, showDelay: 100}}>
        <FontAwesomeIcon icon={"fa-solid fa-pen"} />
      </Button>
    </>
  );
};

EditBtn.propTypes = {
  clickFunc: PropTypes.func,
};

export default EditBtn;
