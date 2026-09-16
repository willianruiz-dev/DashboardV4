import { TableCrud } from "../../components/TableCrud";
import roleService from "../../services/roleService";
import "../pages.css";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import EditBtn from "../../components/UI/Edit_DeleteBtn/EditBtn";
import DeleteBtn from "../../components/UI/Edit_DeleteBtn/DeleteBtn";
import FormRoles from "./FormRoles";
import Swal from "sweetalert2";
import withAuthorization from "../withAuthorization";
import ShowList from "../../components/ShowList";
import { errorCodes, handleHttpError } from "../../errorHandling/errorHandler";
import { useSelector } from "react-redux";

const Roles = () => {
  const permissions = useSelector((state) => state.login.permitsLogged);
  const formInit = { showform: false, idToUpdate: null };
  const [roles, setRoles] = useState(null);
  const [rolesTable, setRolesTable] = useState([]);
  const [form, setForm] = useState(formInit);
  //Al renderizar el componente se refrescan los usuarios
  useEffect(() => {
    refresh();
  }, []);

  //Despues de cada actualizacion de la lista de usuarios se vuelve a construir la tabla
  useEffect(() => {
    buildTable(roles);
  }, [roles]);

  const refresh = () => {
    roleService
      .getAll()
      .then(({ response }) => {
        setRoles([...response]);
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
        setRoles([]);
      });
  };

  const buildTable = (newRoles) => {
    if (!newRoles) return;
    let table = [];
    newRoles.forEach((item) => {
      const tableItem = {
        id: item.id,
        Rol: item.role,
        Rutas: (
          <ShowList key={item.id} _list={item.routes.map((r) => r.route)} />
        ),
        Permisos: (
          <ShowList key={item.id} _list={item.permissions.map((p) => p.description)} />
        ),
        " ": (
          <>{ permissions.filter((p) => p.name === "WriteRoles").length > 0 ?
            <EditBtn
              clickFunc={() => {
                setForm({ showform: true, idToUpdate: item.id });
              }}
            />:""
          }
          {" "}
          { (permissions.filter((p) => p.name === "WriteRoles").length > 0 &&item.id !== 1) ?  (
            <DeleteBtn
              clickFunc={() => {
                confirmDelete(item.role).then((result) => {
                  if (result.isConfirmed) deleteRole(item.id);
                });
              }}
            />
          ): ""}
          </>
        ),
      };
      table = table.concat(tableItem);
    });
    setRolesTable([...table]);
  };

  // Ventana de confirmacion de contraseña para editar el usuario devuelve una promesa
  const confirmDelete = (_role) => {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success me-1",
        cancelButton: "btn btn-danger ms-1",
      },
      buttonsStyling: false,
    });
    return swalWithBootstrapButtons.fire({
      title: "¿Está seguro que desea eliminar el rol " + _role + "?",
      text: "Esta acción no se puede revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, Eliminar",
    });
  };

  const updateRole = (roleToUpdate) => {
    roleService
      .update(roleToUpdate)
      .then(() => {
        setForm(formInit);
        refresh();
        Swal.fire({
          text: "Rol actualizado con exito",
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

  const createRole = (roleToCreate) => {
    roleService
      .create(roleToCreate)
      .then(() => {
        setForm(formInit);
        refresh();
        Swal.fire({
          text: "Rol creado con exito",
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

  const deleteRole = (idToDelete) => {
    roleService
      .deleteR(idToDelete)
      .then(() => {
        setForm(formInit);
        refresh();
        Swal.fire({
          text: "Rol Eliminado",
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
      <>{ permissions.filter((p) => p.name === "WriteRoles").length > 0 ?
        <button
          className="btn btn-success mb-5 mx-3"
          onClick={() => {
            setForm({ showform: true, idToUpdate: null });
          }}
        >
          <FontAwesomeIcon className="me-2" icon="fa-solid fa-circle-plus" />
          <span>Crear Rol</span>
        </button>: <div className="mb-5"></div>
      }
      {rolesTable.length > 0 ? <TableCrud data={rolesTable} /> : ""}
      </>
    );
  };

  const renderForm = () => {
    if (rolesTable.length <= 0) {
      return <></>;
    }

    return (
      <FormRoles
        createHandler={createRole}
        editHandler={updateRole}
        backHandler={back}
        idRoleToEdit={form.idToUpdate}
      />
    );
  };
  return (
    <div className="container-fluid pt-2 w-100 h-100 overflow-auto">
      <div className="row m-3 bg-dark rounded-4">
        <div className="col mt-2 pt-2">
          <h2 className="mb-2 mx-3 text-light">Roles</h2>
          {form.showform ? renderForm() : renderList()}
        </div>
      </div>
    </div>
  );
};

export default withAuthorization(["/Admin/Roles"], Roles);
