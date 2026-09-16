import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import PropTypes from "prop-types";

const TitlePage = ({title, icon, style}) => {
  return (
    <div className="row mt-2 pt-2">
      <h2 className="mt-2 mb-5 ps-3 text-light" style={{...style, textTransform: "uppercase"}}>
        <FontAwesomeIcon icon={icon} className="ms-2" style={{marginRight: "1rem"}}/>
        {title}
      </h2>
    </div>
  );
};
TitlePage.propTypes = {
  title: PropTypes.string,
  icon: PropTypes.string,
  style: PropTypes.object,
};

const TitleVerticalAlignPage = ({title, icon}) => {
  return (
    <div className="d-flex flex-column">
      <FontAwesomeIcon icon={icon} className="ms-2" style={{height: "2rem"}}/>
      <h2 className="mt-1 ps-3 text-light" style={{textTransform: "titlecase", textAlign: "center", fontSize: "1.4rem"}}>
        {title}
      </h2>
    </div>
  );
};
TitleVerticalAlignPage.propTypes = {
  title: PropTypes.string,
  icon: PropTypes.string,
};

export {TitlePage, TitleVerticalAlignPage};