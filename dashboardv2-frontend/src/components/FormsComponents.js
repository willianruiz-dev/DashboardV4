import React from "react";
import PropTypes from "prop-types";
import CheckBtn from "./UI/CheckBtn/CheckBtn";

export const FormText = ({ isDisabled = false, ...props }) => {
  return (
    <div className="mb-2 me-2">
      <label className="form-label" htmlFor={"id" + props.fieldName}>
        {props.label}
      </label>
      <input
        defaultValue={props.value ? props.value : ""}
        id={"id" + props.fieldName}
        name={props.fieldName}
        type="text"
        className="form-control"
        onChange={props.changeFunc}
        disabled={isDisabled}
      ></input>
      {props.feedback !== null ? (
        <div className="invalid-feedback"> {props.feedback}</div>
      ) : (
        ""
      )}
    </div>
  );
};

FormText.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  fieldName: PropTypes.string.isRequired,
  changeFunc: PropTypes.func.isRequired,
  feedback: PropTypes.string,
  isDisabled: PropTypes.bool,
};

export const FormPwd = ({ isDisabled = false, ...props }) => {
  return (
    <div className="mb-2 me-2">
      <label className="form-label" htmlFor={"id" + props.fieldName}>
        {props.label}
      </label>
      <input
        id={"id" + props.fieldName}
        name={props.fieldName}
        className="form-control"
        type="password"
        onChange={props.changeFunc}
        disabled={isDisabled}
      ></input>
      {props.feedback !== null ? (
        <div className="invalid-feedback"> {props.feedback}</div>
      ) : (
        ""
      )}
    </div>
  );
};

FormPwd.propTypes = {
  label: PropTypes.string.isRequired,
  fieldName: PropTypes.string.isRequired,
  changeFunc: PropTypes.func.isRequired,
  feedback: PropTypes.string,
  isDisabled: PropTypes.bool,
};

export const FormStatus = (props) => {
  return (
    <div className="mb-2">
      <label className="form-label">{props.label}</label>
      <CheckBtn initialValue={props.value} setCheckBool={props.checkFunc} />
    </div>
  );
};

FormStatus.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.bool.isRequired,
  checkFunc: PropTypes.func,
};

export const FormImg = ({ isDisabled = false, ...props }) => {
  return (
    <div className="mb-2" htmlFor={"id" + props.fieldName}>
      <label className="form-label">{props.label}</label>
      <input
        name={props.fieldName}
        id={"id" + props.fieldName}
        className="form-control"
        type="file"
        accept="image/*"
        onChange={props.changeFunc}
        disabled={isDisabled}
      />
      {props.feedback !== null ? (
        <div className="invalid-feedback"> {props.feedback}</div>
      ) : (
        ""
      )}
    </div>
  );
};

FormImg.propTypes = {
  label: PropTypes.string.isRequired,
  fieldName: PropTypes.string.isRequired,
  changeFunc: PropTypes.func.isRequired,
  feedback: PropTypes.string,
  isDisabled: PropTypes.bool,
};

export const FormSelect = ({ isDisabled = false, ...props }) => {
  return (
    <div className="mb-2 me-2">
      <label className="form-label" htmlFor={props.fieldId}>
        {props.label}
      </label>
      <select
        value={props.value ? props.value : ""}
        id={props.fieldId}
        name={props.fieldName}
        className="form-select"
        onChange={props.changeFunc}
        disabled={isDisabled}
      >
        <option id="-1">Seleccione una opción</option>
        {props.itemList.map((item) => {
          return (
            <option id={item.id} key={item.id}>
              {item[props.itemKey]}
            </option>
          );
        })}
      </select>
      {props.feedback !== null ? (
        <div className="invalid-feedback"> {props.feedback}</div>
      ) : (
        ""
      )}
    </div>
  );
};

FormSelect.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  fieldId: PropTypes.string.isRequired,
  fieldName: PropTypes.string.isRequired,
  changeFunc: PropTypes.func.isRequired,
  itemList: PropTypes.array.isRequired,
  itemKey: PropTypes.string.isRequired,
  feedback: PropTypes.string,
  isDisabled: PropTypes.bool,
};
