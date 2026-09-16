import "../../pages.css";
import {React} from "react";
import PropTypes from "prop-types";
import { Dropdown } from "primereact/dropdown";

  
const selectedCountryTemplate = (option, props) => {
  if (option) {
    return (
      <div className="flex align-items-center">
        <div>{option}</div>
      </div>
    );
  }
  return <span>{props.placeholder}</span>;
};

selectedCountryTemplate.propTypes = {
  placeholder: PropTypes.any
};

const SelectProduct = ({ products, selectedProduct, handleProductChange}) => {

  return (
    <div className="py-3 d-flex justify-content-center aling-items-center paypad">
      <b className="p-1 m-2" style={{ fontSize: "1.1rem" }}>
        Pay+
      </b>
      <Dropdown
        value={selectedProduct}
        onChange={(e) => handleProductChange(e.value)}
        options={products}
        valueTemplate={selectedCountryTemplate}
        placeholder="Seleccione un producto"
        filter
      ></Dropdown>
    </div>
  );
};
SelectProduct.propTypes = {
  products: PropTypes.array,
  selectedProduct: PropTypes.string,
  handleProductChange: PropTypes.func,
};

export default SelectProduct;