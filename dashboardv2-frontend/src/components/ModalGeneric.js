import React from "react";
import PropTypes from "prop-types";

const ModalGeneric = (props) => {
  return (
    <div
      className="modal fade"
      id={props.id}
      data-bs-keyboard="false"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg rounded">
        <div className="modal-content bg-dark">
          <div className="modal-body">{props.elem}</div>
        </div>
      </div>
    </div>
  );
};

ModalGeneric.propTypes = {
  id: PropTypes.string,
  saveClickFunc: PropTypes.func,
  elem: PropTypes.element,
};

export default ModalGeneric;
