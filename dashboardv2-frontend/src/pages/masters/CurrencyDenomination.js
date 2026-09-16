import { TableCrud } from "../../components/TableCrud";
import mastersService from "../../services/mastersService";
import "../pages.css";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import EditBtn from "../../components/UI/Edit_DeleteBtn/EditBtn";
import DeleteBtn from "../../components/UI/Edit_DeleteBtn/DeleteBtn";
import Swal from "sweetalert2";
import withAuthorization from "../withAuthorization";
import currencyDenominationDto from "../../Dto/mastersDto";
import { errorCodes, handleHttpError } from "../../errorHandling/errorHandler";
import FormDenominationMaster from "./FormDenominationMaster";
import { useSelector } from "react-redux";

const CurrencyDenominations = () => {
  const permissions = useSelector((state) => state.login.permitsLogged);
  const formInit = { showform: false, idToUpdate: null };
  const [denominations, setDenominations] = useState(null);
  const [denominationsTable, setDenominationsTable] = useState([]);
  const [form, setForm] = useState(formInit);
  const moneyFormater = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  //Al renderizar el componente se refrescan los usuarios
  useEffect(() => {
    refreshItems();
  }, []);

  //Despues de cada actualizacion de la lista de usuarios se vuelve a construir la tabla
  useEffect(() => {
    buildTable(denominations);
  }, [denominations]);

  const refreshItems = () => {
    mastersService
      .getAll("CurrencyDenomination")
      .then(({ response }) => {
        setDenominations([...response]);
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
        setDenominations([]);
      });
  };

  const buildTable = (newDenominations) => {
    if (!newDenominations) return;
    let table = [];
    newDenominations.forEach((item) => {
      const tableItem = {
        id: item.id,
        Moneda: item.currency,
        Denominación: (
          <img
            src={`/staticfiles${item.img}`}
            alt={`${moneyFormater.format(item.value)}`}
            height="75px"
          />
        ),
        Valor: moneyFormater.format(item.value),
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
                  confirmDelete(item.description).then((result) => {
                    if (result.isConfirmed) deleteCurrency(item.id);
                  });
                }}
              />: ""
            }
          </>
        ),
      };
      table = table.concat(tableItem);
    });
    setDenominationsTable([...table]);
  };

  const confirmDelete = (_denomination) => {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success me-1",
        cancelButton: "btn btn-danger ms-1",
      },
      buttonsStyling: false,
    });
    return swalWithBootstrapButtons.fire({
      title:
        "¿Está seguro que desea eliminar la denominación" + _denomination + "?",
      text: "Esta acción no se puede revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, Eliminar",
    });
  };

  const updateCurrency = (denominationToUpdate) => {
    denominationToUpdate.description = denominationToUpdate.descrip;
    mastersService
      .update("CurrencyDenomination", denominationToUpdate)
      .then(() => {
        setForm(formInit);
        refreshItems();
        Swal.fire({
          text: "Denominación actualizada con exito",
          icon: "success",
        });
      })
      .catch(async (err) => {
        const [, errMsg] = await handleHttpError(err.response);
        Swal.fire({
          text: errMsg,
          icon: "error",
        });
      });
  };

  const createCurrency = (denominationToCreate) => {
    denominationToCreate.description = denominationToCreate.descrip;
    mastersService
      .create("CurrencyDenomination", denominationToCreate)
      .then(() => {
        setForm(formInit);
        refreshItems();
        Swal.fire({
          text: "Denominación creada con exito",
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
      .deleteM("CurrencyDenomination", idToDelete)
      .then(() => {
        setForm(formInit);
        refreshItems();
        Swal.fire({
          text: "Denominación Eliminada",
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
        { permissions.filter((p) => p.name === "WriteMasters").length > 0 ?
          <button
            className="btn btn-success mb-5 mx-3"
            onClick={() => {
              setForm({ showform: true, idToUpdate: null });
            }}
          >
            <FontAwesomeIcon className="me-2" icon="fa-solid fa-circle-plus" />
            <span>Crear Denominación</span>
          </button>:<div className="mb-5"></div>
        }
        {denominationsTable.length > 0 ? (
          <TableCrud data={denominationsTable} />
        ) : (
          ""
        )}
      </>
    );
  };

  const renderForm = () => {
    if (denominationsTable.length <= 0) {
      return <></>;
    }

    return (
      <FormDenominationMaster
        masterName={"CurrencyDenomination"}
        masterDto={currencyDenominationDto}
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
          <h2 className="mb-2 mx-3 text-light">Denominaciones</h2>
          {form.showform ? renderForm() : renderList()}
        </div>
      </div>
    </div>
  );
};

export default withAuthorization(
  ["/Admin/Masters/Denominations"],
  CurrencyDenominations
);
