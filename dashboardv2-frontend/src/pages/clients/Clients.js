import "../pages.css";
import { TableCrud } from "../../components/TableCrud";
import clientService from "../../services/clientService";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import EditBtn from "../../components/UI/Edit_DeleteBtn/EditBtn";
import DeleteBtn from "../../components/UI/Edit_DeleteBtn/DeleteBtn";
import FormClients from "./FormClients";
import Swal from "sweetalert2";
import withAuthorization from "../withAuthorization";
import IconBtn from "../../components/UI/Edit_DeleteBtn/IconBtn";
import { useNavigate } from "react-router-dom";
import { errorCodes, handleHttpError } from "../../errorHandling/errorHandler";
import { useSelector } from "react-redux";

const Clients = () => {
  const permissions = useSelector((state) => state.login.permitsLogged);
  const formInit = { showform: false, idToUpdate: null };
  const [clients, setClients] = useState(null);
  const [clientsTable, setClientsTable] = useState([]);
  const [form, setForm] = useState(formInit);
  const navigate = useNavigate();

  //Al renderizar el componente se refrescan los usuarios
  useEffect(() => {
    refresh();
  }, []);

  //Despues de cada actualizacion de la lista de usuarios se vuelve a construir la tabla
  useEffect(() => {
    buildTable(clients);
  }, [clients]);

  const refresh = () => {
    clientService
      .getAll()
      .then(({ response }) => {
        setClients([...response]);
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
        setClients([]);
      });
  };

  const goToOffices = (_idClient) => {
    navigate("/Admin/Offices", { state: { idClient: _idClient } });
  };

  const buildTable = (newClients) => {
    if (!newClients) return;
    let table = [];
    newClients.forEach((item) => {
      const tableItem = {
        id: item.id,
        Logo: (
          <img
            src={`/staticfiles${item.logoImg}`}
            alt={"Logo " + item.name}
            height="50px"
          />
        ),
        Nombre: item.name,
        Nit: item.nit,
        Correo: item.email,
        Teléfono: item.phone,
        Region: item.region,
        " ": (
          <div className="container">
            { permissions.filter((p) => p.name === "WriteClients").length > 0 ?
              <EditBtn
                clickFunc={() => {
                  setForm({ showform: true, idToUpdate: item.id });
                }}
              />:""
            }
            { permissions.filter((p) => p.name === "DelClients").length > 0 ?
              <DeleteBtn
                clickFunc={() => {
                  confirmDelete(item.name).then((result) => {
                    if (result.isConfirmed) deleteClient(item.id);
                  });
                }}
              />:""
            }
            { permissions.filter((p) => p.name === "ReadOffices").length > 0 ?
              <IconBtn
                clickFunc={() => {
                  goToOffices(item.id);
                }}
                icon="fa-solid fa-building"
                tooltipText="Sucursales"
              />:""
            }
            
          </div>
        ),
      };
      table = table.concat(tableItem);
    });
    setClientsTable([...table]);
  };

  const confirmDelete = (_clientName) => {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success me-1",
        cancelButton: "btn btn-danger ms-1",
      },
      buttonsStyling: false,
    });
    return swalWithBootstrapButtons.fire({
      title:
        "¿Está seguro que desea eliminar el cliente " +
        _clientName +
        " y sus sucursales?",
      text: "Esta acción no se puede revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, Eliminar",
    });
  };

  const updateClient = (clientToUpdate) => {
    clientService
      .update(clientToUpdate)
      .then(() => {
        setForm(formInit);
        refresh();
        Swal.fire({
          text: "Cliente actualizado con éxito",
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

  const createClient = (clientToCreate) => {
    clientService
      .create(clientToCreate)
      .then(() => {
        setForm(formInit);
        refresh();
        Swal.fire({
          text: "Cliente creado con éxito",
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

  const deleteClient = (idToDelete) => {
    clientService
      .deleteC(idToDelete)
      .then(() => {
        setForm(formInit);
        refresh();
        Swal.fire({
          text: "Cliente y sucursales Eliminadas",
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

  const renderList = () => {
    return (
      <>
        { permissions.filter((p) => p.name === "WriteClients").length > 0 ?
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
            <span>Crear Cliente</span>
          </button>:<div className="mb-5"></div>
        }
        {clientsTable.length > 0 ? <TableCrud data={clientsTable} /> : ""}
      </>
    );
  };

  const renderForm = () => {
    return (
      <FormClients
        createHandler={createClient}
        editHandler={updateClient}
        backHandler={back}
        idToEdit={form.idToUpdate}
      />
    );
  };
  return (
    <div className="container-fluid pt-2 w-100 h-100 overflow-auto">
      <div className="row m-3 bg-dark rounded-4">
        <div className="col mt-2 pt-2">
          <h2 className="mb-2 mx-3 text-light">Clientes</h2>
          {form.showform ? renderForm() : renderList()}
        </div>
      </div>
    </div>
  );
};

export default withAuthorization(["/Admin/Costumers"], Clients);
