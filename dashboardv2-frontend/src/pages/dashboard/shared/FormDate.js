import "../../pages.css";
import { React } from "react";
import { Calendar } from "primereact/calendar";
import PropTypes from "prop-types";

const FormDate = ({dateFrom, dateTo, setDateFrom, setDateTo}) => {
  return (
    <form
      className="d-flex flex-row"
    >
      <label
        className="py-3 pe-2 text-center"
        style={{ fontSize: "1rem" }}
      >
        Rango de fechas:
      </label>
      <div className="d-flex justify-content-center align-items-center ">
        <Calendar id="fromDate" value={dateFrom} onChange={(e) => setDateFrom(e.value)} showTime hourFormat="12" locale="es"></Calendar>
        <div className="text-center p-2" style={{ background: "#678" }}>
          A
        </div>
        <Calendar id="toDate" value={dateTo} onChange={(e) => setDateTo(e.value)} showTime hourFormat="12" locale="es"></Calendar>
      </div>

    </form>
  );
};

FormDate.propTypes = {
  setDateFrom: PropTypes.any,
  setDateTo: PropTypes.any,
  dateFrom: PropTypes.object,
  dateTo: PropTypes.object,
};

export default FormDate;
