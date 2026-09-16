import { TableCrud } from "../../components/TableCrud";
import routeService from "../../services/routeService";
import "../pages.css";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Swal from "sweetalert2";
import withAuthorization from "../withAuthorization";
import PropTypes from "prop-types";
import { errorCodes, handleHttpError } from "../../errorHandling/errorHandler";

const IconInput = ({ iconInit, btnClick }) => {
  const [inputValue, setInputValue] = useState(iconInit);
  const handlerInputChange = ({ target }) => {
    setInputValue(target.value);
  };
  const handleButtonClick = () => btnClick(inputValue);
  return (
    <div className="d-flex flex-row justify-content-center">
      <input
        className="form-control me-1"
        style={{ maxWidth: "250px", fontSize: "1.2em" }}
        onChange={handlerInputChange}
        defaultValue={inputValue}
      />
      <button
        className="btn btn-success"
        style={{ fontSize: "1.2em" }}
        onClick={handleButtonClick}
      >
        <FontAwesomeIcon icon="fa-solid fa-play" />
      </button>
    </div>
  );
};

IconInput.propTypes = {
  iconInit: PropTypes.string,
  btnClick: PropTypes.func,
};

const RoutesPage = () => {
  const [routes, setRoutes] = useState(null);
  const [routesTable, setRoutesTable] = useState([]);
  //Al renderizar el componente se refrescan los usuarios
  useEffect(() => {
    refresh();
  }, []);

  //Despues de cada actualizacion de la lista de usuarios se vuelve a construir la tabla
  useEffect(() => {
    buildTable(routes);
  }, [routes]);

  const refresh = () => {
    routeService
      .getAll()
      .then(({ response }) => {
        setRoutes([...response]);
      })
      .catch(async ({ response }) => {
        const [errCode, errMsg] = await handleHttpError(response);
        if (errCode !== errorCodes.notFound) {
          Swal.fire({
            text: errMsg,
            icon: "error",
          });
          return;
        }
        setRoutes([]);
      });
  };

  const buildTable = (newRoutes) => {
    if (!newRoutes) return;
    let table = [];
    newRoutes.forEach((item) => {
      const tableItem = {
        id: item.id,
        "Titulo Ruta": item.title,
        Ruta: item.route,
        Padre: item.idFather
          ? newRoutes.filter((ru) => ru.id === item.idFather)[0].route
          : "",
        Icono: (
          <IconInput
            iconInit={item.icon}
            btnClick={(value) => {
              updateRoute({ ...item, icon: value });
            }}
          />
        ),
      };
      table = table.concat(tableItem);
    });
    setRoutesTable([...table]);
  };

  //Solo se pueden cambiar los iconos
  const updateRoute = (routeToUpdate) => {
    routeService
      .update(routeToUpdate)
      .then(() => {
        refresh();
        Swal.fire({
          text: "Ruta actualizada con exito",
          icon: "success",
        }).then(() => {
          window.location.reload();
        });
      })
      .catch(async ({ response }) => {
        refresh();
        const [, errMsg] = await handleHttpError(response);
        Swal.fire({
          text: errMsg,
          icon: "error",
        });
      });
  };

  const renderList = () => {
    return (
      <>{routesTable.length > 0 ? <TableCrud data={routesTable} /> : ""}</>
    );
  };

  return (
    <div className="container-fluid pt-2 w-100 h-100 overflow-auto">
      <div className="row m-3 bg-dark rounded-4">
        <div className="col mt-2 pt-2">
          <h2 className="mb-2 mx-3 text-light">Rutas</h2>
          {renderList()}
        </div>
      </div>
    </div>
  );
};

export default withAuthorization(["/Admin/Routes"], RoutesPage);
