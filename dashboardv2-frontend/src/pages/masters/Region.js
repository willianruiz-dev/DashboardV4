import { TableCrud } from "../../components/TableCrud";
import mastersService from "../../services/mastersService";
import "../pages.css";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import EditBtn from "../../components/UI/Edit_DeleteBtn/EditBtn";
import DeleteBtn from "../../components/UI/Edit_DeleteBtn/DeleteBtn";
import FormMaster from "./FormMaster";
import Swal from "sweetalert2";
import withAuthorization from "../withAuthorization";
import regionDto from "../../Dto/mastersDto";
import { errorCodes, handleHttpError } from "../../errorHandling/errorHandler";
import { useSelector } from "react-redux";

const TypesDocument = () => {
  const permissions = useSelector((state) => state.login.permitsLogged);
  const formInit = { showform: false, idToUpdate: null };
  const [regions, setRegions] = useState(null);
  const [regionsTable, setRegionsTable] = useState([]);
  const [form, setForm] = useState(formInit);
  //Al renderizar el componente se refrescan los usuarios
  useEffect(() => {
    refreshItems();
  }, []);

  //Despues de cada actualizacion de la lista de usuarios se vuelve a construir la tabla
  useEffect(() => {
    buildTable(regions);
  }, [regions]);

  const refreshItems = () => {
    mastersService
      .getAll("Region")
      .then(({ response }) => {
        setRegions([...response]);
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
        setRegions([]);
      });
  };

  const buildTable = (newRegion) => {
    if (!newRegion) return;
    let table = [];
    newRegion.forEach((item) => {
      const tableItem = {
        id: item.id,
        Nombre: item.name,
        " ": (
          <>
            { permissions.filter((p) => p.name === "WriteMasters").length > 0 ?
              <EditBtn
                clickFunc={() => {
                  setForm({ showform: true, idToUpdate: item.id });
                }}
              />:""
            }
            {" "}
            { permissions.filter((p) => p.name === "DelMasters").length > 0 ?
              <DeleteBtn
                clickFunc={() => {
                  confirmDelete(item.name).then((result) => {
                    if (result.isConfirmed) deleteRegion(item.id);
                  });
                }}
              />:""
            }
          </>
        ),
      };
      table = table.concat(tableItem);
    });
    setRegionsTable([...table]);
  };

  // Ventana de confirmacion de contraseña para editar el usuario devuelve una promesa
  const confirmDelete = (_region) => {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success me-1",
        cancelButton: "btn btn-danger ms-1",
      },
      buttonsStyling: false,
    });
    return swalWithBootstrapButtons.fire({
      title: "¿Está seguro que desea eliminar " + _region + "?",
      text: "Esta acción no se puede revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, Eliminar",
    });
  };

  const updateRegion = (regionToUpdate) => {
    regionToUpdate.name = regionToUpdate.descrip;
    mastersService
      .update("Region", regionToUpdate)
      .then(() => {
        setForm(formInit);
        refreshItems();
        Swal.fire({
          text: "Region actualizada con éxito",
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

  const createRegion = (regionToCreate) => {
    regionToCreate.name = regionToCreate.descrip;
    mastersService
      .create("Region", regionToCreate)
      .then(() => {
        setForm(formInit);
        refreshItems();
        Swal.fire({
          text: "Region creada con éxito",
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

  const deleteRegion = (idToDelete) => {
    mastersService
      .deleteM("Region", idToDelete)
      .then(() => {
        setForm(formInit);
        refreshItems();
        Swal.fire({
          text: "Region Eliminada",
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
    refreshItems();
  };

  const renderList = () => {
    return (
      <>
        { permissions.filter(p => p.name === "WriteMasters").length > 0 ?
          <button
            className="btn btn-success mb-5 mx-3"
            onClick={() => {
              setForm({ showform: true, idToUpdate: null });
            }}
          >
            <FontAwesomeIcon className="me-2" icon="fa-solid fa-circle-plus" />
            <span>Crear Region</span>
          </button>: <div className="mb-5"></div>
        }
        {regionsTable.length > 0 ? <TableCrud data={regionsTable} /> : ""}
      </>
    );
  };

  const renderForm = () => {
    if (regionsTable.length <= 0) {
      return <></>;
    }

    return (
      <FormMaster
        masterName={"Region"}
        masterDto={regionDto}
        createHandler={createRegion}
        editHandler={updateRegion}
        backHandler={back}
        idToEdit={form.idToUpdate}
      />
    );
  };
  return (
    <div className="container-fluid pt-2 w-100 h-100 overflow-auto">
      <div className="row m-3 bg-dark rounded-4">
        <div className="col mt-2 pt-2">
          <h2 className="mb-2 mx-3 text-light">Regiones</h2>
          {form.showform ? renderForm() : renderList()}
        </div>
      </div>
    </div>
  );
};

export default withAuthorization(["/Admin/Masters/TypeDoc"], TypesDocument);
