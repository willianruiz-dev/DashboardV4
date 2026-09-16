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
import currencyDto from "../../Dto/mastersDto";
import { errorCodes, handleHttpError } from "../../errorHandling/errorHandler";
import { useSelector } from "react-redux";

const Currencies = () => {
  const permissions = useSelector((state) => state.login.permitsLogged);
  const formInit = { showform: false, idToUpdate: null };
  const [currencies, setCurrencies] = useState(null);
  const [currenciesTable, setCurrenciesTable] = useState([]);
  const [form, setForm] = useState(formInit);
  //Al renderizar el componente se refrescan los usuarios
  useEffect(() => {
    refreshItems();
  }, []);

  //Despues de cada actualizacion de la lista de usuarios se vuelve a construir la tabla
  useEffect(() => {
    buildTable(currencies);
  }, [currencies]);

  const refreshItems = () => {
    mastersService
      .getAll("Currency")
      .then(({ response }) => {
        setCurrencies([...response]);
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
        setCurrencies([]);
      });
  };

  const buildTable = (newCurrencies) => {
    if (!newCurrencies) return;
    let table = [];
    newCurrencies.forEach((item) => {
      const tableItem = {
        id: item.id,
        Descripción: item.description,
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
            {permissions.filter((p) => p.name === "DelMasters").length > 0 ?
              <DeleteBtn
                clickFunc={() => {
                  confirmDelete(item.description).then((result) => {
                    if (result.isConfirmed) deleteCurrency(item.id);
                  });
                }}
              />:""
            }
          </>
        ),
      };
      table = table.concat(tableItem);
    });
    setCurrenciesTable([...table]);
  };

  // Ventana de confirmacion de contraseña para editar el usuario devuelve una promesa
  const confirmDelete = (_currency) => {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success me-1",
        cancelButton: "btn btn-danger ms-1",
      },
      buttonsStyling: false,
    });
    return swalWithBootstrapButtons.fire({
      title: "¿Está seguro que desea eliminar " + _currency + "?",
      text: "Esta acción no se puede revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, Eliminar",
    });
  };

  const updateCurrency = (currencyToUpdate) => {
    currencyToUpdate.description = currencyToUpdate.descrip;
    mastersService
      .update("Currency", currencyToUpdate)
      .then(() => {
        setForm(formInit);
        refreshItems();
        Swal.fire({
          text: "Moneda actualizada con exito",
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

  const createCurrency = (currencyToCreate) => {
    currencyToCreate.description = currencyToCreate.descrip;
    mastersService
      .create("Currency", currencyToCreate)
      .then(() => {
        setForm(formInit);
        refreshItems();
        Swal.fire({
          text: "Moneda creada con exito",
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

  const deleteCurrency = (idToDelete) => {
    mastersService
      .deleteM("Currency", idToDelete)
      .then(() => {
        setForm(formInit);
        refreshItems();
        Swal.fire({
          text: "Moneda Eliminada",
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
            <span>Crear Moneda</span>
          </button>:<div className="mb-5"></div>
        }
        {currenciesTable.length > 0 ? <TableCrud data={currenciesTable} /> : ""}
      </>
    );
  };

  const renderForm = () => {
    if (currenciesTable.length <= 0) {
      return <></>;
    }

    return (
      <FormMaster
        masterName={"Currency"}
        masterDto={currencyDto}
        createHandler={createCurrency}
        editHandler={updateCurrency}
        backHandler={back}
        idToEdit={form.idToUpdate}
      />
    );
  };
  return (
    <div className="container-fluid pt-2 w-100 h-100 overflow-auto">
      <div className="row m-3 bg-dark rounded-4">
        <div className="col mt-2 pt-2">
          <h2 className="mb-2 mx-3 text-light">Monedas</h2>
          {form.showform ? renderForm() : renderList()}
        </div>
      </div>
    </div>
  );
};

export default withAuthorization(["/Admin/Masters/Currencies"], Currencies);
