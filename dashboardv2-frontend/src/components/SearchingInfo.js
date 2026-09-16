import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { PropTypes } from "prop-types";

function SearchingInfo({msg}) {
  return (
    <div className="table table-dark table-hover text-center values-no-selected">
      <div className="inner">
        <FontAwesomeIcon className="icon" icon={"fa-solid fa-magnifying-glass-dollar"} color="black"/>
        <h2 className="mt-2 mb-5 ps-3 text-light" style={{opacity: "40%"}}>{msg}</h2>
      </div>
    </div>);
}

SearchingInfo.propTypes = {
  msg: PropTypes.string,
};

export default SearchingInfo;
