import React from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./editDelete.css";
import { Button } from "primereact/button";

const DeleteBtn = ({ clickFunc }) => {
  return (
    <>
      <Button rounded
        className="del-btn"
        severity="danger"
        onClick={clickFunc}
        tooltip={"Eliminar"}
        tooltipOptions={{ position: "top", mouseTrack: true, mouseTrackTop: 15, hideDelay: 50, showDelay: 100}}>
        <FontAwesomeIcon icon={"fa-solid fa-trash"} />
      </Button>
    </>
  );
};

DeleteBtn.propTypes = {
  clickFunc: PropTypes.func,
};

export default DeleteBtn;
