import React from "react";

const BasicContainerBuilder = (field) => {
  const BasicContainerTemplate = (rowData) => {
    return <>{rowData[field]}</>;
  };
  return BasicContainerTemplate;
};

export default BasicContainerBuilder;
