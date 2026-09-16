import React from "react";

const BasicStringBuilder = (field) => {
  const BasicStringTemplate = (rowData) => {
    return <div style={{textAlign: "center"}}>{rowData[field]}</div>;
  };
  return BasicStringTemplate;
};

export default BasicStringBuilder;