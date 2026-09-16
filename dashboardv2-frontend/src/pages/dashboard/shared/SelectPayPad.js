import "../../pages.css";
import {React} from "react";
import { Dropdown } from "primereact/dropdown";
import PropTypes from "prop-types";

const SelectPayPad = ({ paypads, paypadSelected, handleChangePaypad}) => {

  return (
    <div className="py-3 d-flex justify-content-center aling-items-center paypad">
      <b className="p-1 m-2" style={{ fontSize: "1.1rem" }}>
        Pay+
      </b>
      <Dropdown
        value={paypadSelected}
        onChange={(e) => handleChangePaypad(e.value)}
        options={paypads}
        optionLabel="username"
        placeholder="Escoge un Pay+" 
        filter
        id="paypadSelect"
      ></Dropdown>
    </div>
  );
};
SelectPayPad.propTypes = {
  paypads: PropTypes.array,
  paypadSelected: PropTypes.object,
  handleChangePaypad: PropTypes.func,
  showAllPayPads: PropTypes.bool,
};

export default SelectPayPad;