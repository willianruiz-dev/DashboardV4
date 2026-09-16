import "../pages.css";
import { TableCrud } from "../../components/TableCrud";
import officeService from "../../services/officeService";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import EditBtn from "../../components/UI/Edit_DeleteBtn/EditBtn";
import DeleteBtn from "../../components/UI/Edit_DeleteBtn/DeleteBtn";
import FormOffices from "./FormOffices";
import Swal from "sweetalert2";
import withAuthorization from "../withAuthorization";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { errorCodes, handleHttpError } from "../../errorHandling/errorHandler";
import { useSelector } from "react-redux";

const Offices = () => {
  const permissions = useSelector((state) => state.login.permitsLogged);
  const formInit = { showform: false, idToUpdate: null };
  const [offices, setOffices] = useState(null);
  const [officesTable, setOfficesTable] = useState([]);
  const [form, setForm] = useState(formInit);
  const navigate = useNavigate();
  const location = useLocation();
  if (!location.state) return <Navigate to="/Unauthorized" />;
  const idClient = location.state.idClient;

  //Al renderizar el componente se refrescan los usuarios
  useEffect(() => {
    refresh();
  }, []);

  //Despues de cada actualizacion de la lista de usuarios se vuelve a construir la tabla
  useEffect(() => {
    buildTable(offices);
  }, [offices]);

  const refresh = () => {
    officeService
      .getByClient(idClient)
      .then(({ response }) => {
        setOffices([...response]);
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
        setOffices([]);
      });
  };

  const buildTable = (newOffices) => {
    if (!newOffices) return;
    let table = [];
    newOffices.forEach((item) => {
      const tableItem = {
        id: item.id,
        Nombre: item.name,
        Dirección: item.address,
        " ": (
          <div className="container">
            { permissions.filter((p) => p.name === "WriteOffices").length > 0 ?
              <EditBtn
                clickFunc={() => {
                  setForm({ showform: true, idToUpdate: item.id });
                }}
              />:""
            }
            { permissions.filter((p) => p.name === "DelOffices").length > 0 ?
              <DeleteBtn
                clickFunc={() => {
                  confirmDelete(item.name).then((result) => {
                    if (result.isConfirmed) deleteOffice(item.id);
                  });
                }}
              />:""
            }
            
          </div>
        ),
      };
      table = table.concat(tableItem);
    });
    setOfficesTable([...table]);
  };

  const confirmDelete = (_officeName) => {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success me-1",
        cancelButton: "btn btn-danger ms-1",
      },
      buttonsStyling: false,
    });
    return swalWithBootstrapButtons.fire({
      title: "¿Está seguro que desea eliminar la sucursal " + _officeName + "?",
      text: "Esta acción no se puede revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, Eliminar",
    });
  };

  const updateOffice = (officeToUpdate) => {
    officeToUpdate.idClient = idClient;
    officeService
      .update(officeToUpdate)
      .then(() => {
        setForm(formInit);
        refresh();
        Swal.fire({
          text: "Sucursal actualizada con éxito",
          icon: "success",
        });
      })
      .catch(async ({ response }) => {
        const [, errMsg] = await handleHttpError(response);
        Swal.fire({
          text: errMsg,
          icon: "error",
        });
      });
  };

  const createOffice = (officeToCreate) => {
    officeToCreate.idClient = idClient;
    officeService
      .create(officeToCreate)
      .then(() => {
        setForm(formInit);
        refresh();
        Swal.fire({
          text: "Surcursal creada con éxito",
          icon: "success",
        });
      })
      .catch(async ({ response }) => {
        const [, errMsg] = await handleHttpError(response);
        Swal.fire({
          text: errMsg,
          icon: "error",
        });
      });
  };

  const deleteOffice = (idToDelete) => {
    officeService
      .deleteO(idToDelete)
      .then(() => {
        setForm(formInit);
        refresh();
        Swal.fire({
          text: "Sucursal Eliminada",
          icon: "success",
        });
      })
      .catch(async ({ response }) => {
        const [, errMsg] = await handleHttpError(response);
        Swal.fire({
          text: errMsg,
          icon: "error",
        });
      });
  };

  const back = () => {
    setForm({ ...formInit });
    refresh();
  };

  const backToClients = () => {
    navigate("/Admin/Costumers/");
  };

  const renderList = () => {
    return (
      <>
        { permissions.filter(p => p.name === "WriteOffices").length > 0 ?
          <button
            className="btn btn-success mb-5 mx-3"
            onClick={() => {
              setForm({ showform: true, idToUpdate: null });
            }}
          >
            <FontAwesomeIcon
              className="me-2"
              icon="fa-solid fa-person-circle-plus"
            />
            <span>Crear Sucursal</span>
          </button>:""
        }
        <button className="btn btn-success mb-5 mx-3" onClick={backToClients}>
          <FontAwesomeIcon className="me-2" icon="fa-solid fa-reply" />
          <span>Volver</span>
        </button>
        {officesTable.length > 0 ? <TableCrud data={officesTable} /> : ""}
      </>
    );
  };

  const renderForm = () => {
    return (
      <FormOffices
        createHandler={createOffice}
        editHandler={updateOffice}
        backHandler={back}
        idToEdit={form.idToUpdate}
      />
    );
  };
  return (
    <div className="container-fluid pt-2 w-100 h-100 overflow-auto">
      <div className="row m-3 bg-dark rounded-4">
        <div className="col mt-2 pt-2">
          <h2 className="mb-2 mx-3 text-light">Sucursales</h2>
          {form.showform ? renderForm() : renderList()}
        </div>
      </div>
    </div>
  );
};

export default withAuthorization(["/Admin/Offices"], Offices);
