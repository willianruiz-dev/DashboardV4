import React from "react";
import PropTypes from "prop-types";

export const TableCrud = ({ data, isEnumarated = true }) => {
  return (
    <div style={{ overflow: "auto" }}>
      <table className="table table-dark table-hover text-center">
        <thead>
          <tr>
            {isEnumarated ? (
              <th className="fw-bold" scope="col">
                #
              </th>
            ) : (
              <></>
            )}
            {Object.keys(data[0]).map((atribute, i) => {
              if (atribute !== "id") {
                return (
                  <th key={"header_" + i} scope="col">
                    {atribute}
                  </th>
                );
              }
            })}
          </tr>
        </thead>

        <tbody>
          {data.map((item, i) => {
            return (
              <tr key={item.id}>
                {isEnumarated ? (
                  <th key={item.id + "_#"} scope="row">
                    {i + 1}
                  </th>
                ) : (
                  <></>
                )}
                {Object.keys(item).map((atribute, j) => {
                  if (atribute !== "id") {
                    return <th key={item.id + "_" + j}>{item[atribute]}</th>;
                  }
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

TableCrud.propTypes = {
  data: PropTypes.array,
  isEnumarated: PropTypes.bool,
};

export const TableCrudWithAdditionalInfo = ({ data, isEnumarated = true }) => {
  return (
    <div style={{ overflow: "auto" }}>
      <table className="table table-dark table-hover text-center">
        <thead>
          <tr>
            {isEnumarated ? (
              <th className="fw-bold" scope="col">
                #
              </th>
            ) : (
              <></>
            )}
            {Object.keys(data[0]).map((atribute, i) => {
              if (atribute !== "id" && atribute !== "additionalInfo") {
                return (
                  <th key={"header_" + i} scope="col">
                    {atribute}
                  </th>
                );
              }
            })}
          </tr>
        </thead>

        <tbody>
          {data.map((item, i) => {
            return (
              <React.Fragment key={"body_" + item.id}>
                <tr
                  key={item.id}
                  data-bs-toggle="collapse"
                  data-bs-target={"#AdditionalInfo_" + item.id}
                  aria-expanded="false"
                  aria-controls={"AdditionalInfo_" + item.id}
                >
                  {isEnumarated ? (
                    <th key={item.id + "_#"} scope="row">
                      {i + 1}
                    </th>
                  ) : (
                    <></>
                  )}
                  {Object.keys(item).map((atribute, j) => {
                    if (atribute !== "id" && atribute !== "additionalInfo") {
                      return <th key={item.id + "_" + j}>{item[atribute]}</th>;
                    }
                  })}
                </tr>
                <tr key={"AdditionalInfo_" + item.id} id={"AdditionalInfo_" + item.id} className="collapse">
                  <td colSpan={Object.keys(item).length}>
                    {item.additionalInfo}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

TableCrudWithAdditionalInfo.propTypes = {
  data: PropTypes.array,
  isEnumarated: PropTypes.bool,
};
