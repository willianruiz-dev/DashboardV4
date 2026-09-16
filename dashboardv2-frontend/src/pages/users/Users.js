import { TableCrud } from "../../components/TableCrud";
import userService from "../../services/userService";
import "../pages.css";
import React, { useEffect, useState } from "react";
import CheckBtn from "../../components/UI/CheckBtn/CheckBtn";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import EditBtn from "../../components/UI/Edit_DeleteBtn/EditBtn";
import DeleteBtn from "../../components/UI/Edit_DeleteBtn/DeleteBtn";
import FormUsers from "./FormUsers";
import Swal from "sweetalert2";
import withAuthorization from "../withAuthorization";
import { errorCodes, handleHttpError } from "../../errorHandling/errorHandler";
import { useSelector } from "react-redux";

const Users = () => {
  const permissions = useSelector((state) => state.login.permitsLogged);
  const role = useSelector((state) => state.login.roleLogged);
  const formInit = { showform: false, idToUpdate: null };
  const [users, setUsers] = useState(null);
  const [usersTable, setUsersTable] = useState([]);
  const [form, setForm] = useState(formInit);
  //Al renderizar el componente se refrescan los usuarios
  useEffect(() => {
    refresh();
  }, []);

  //Despues de cada actualizacion de la lista de usuarios se vuelve a construir la tabla
  useEffect(() => {
    buildTable(users);
  }, [users]);

  const refresh = () => {
    userService
      .getAll()
      .then(({ response }) => {
        setUsers([...response]);
      })
      .catch(async ({ response }) => {
        const [errCode, errMsg] = await handleHttpError(response);
        if (
          errCode !== errorCodes.notFound &&
          errCode !== errorCodes.serverError
        ) {
          Swal.fire({
            text: errMsg,
            icon: "error",
          });
          return;
        }
        setUsers([]);
      });
  };

  const buildTable = (newUsers) => {
    if (!newUsers) return;
    let table = [];
    newUsers.forEach((item) => {
      const tableItem = {
        id: item.id,
        "": (
          <img
            src={
              item.img !== undefined && item.img !== null
                ? `/staticfiles${item.img}`
                : "/images/profile-default.png"
            }
            alt={`Imagen de perfil ${item.userName}`}
            width="40px"
            height="40px"
            style={{ borderRadius: "20px" }}
          />
        ),
        "Nombre de Usuario": item.userName,
        Documento: item.document,
        "Tipo documento": item.typeDocument,
        Nombre: item.name,
        "Apellido/s": item.lastName,
        Teléfono: item.phone,
        Email: item.email,
        Activo: (
          <CheckBtn
            key={"check_" + item.id}
            className="translate-middle"
            initialValue={Boolean(item.status)}
            setCheckBool={() => {
              item.status = Number(!item.status);
              updateUser(item);
            }}
          />
        ),
        Rol: item.role,
        " ": (
          <>
            { permissions.filter(p => p.name === "WriteUsers").length > 0 ? (
              <EditBtn
                clickFunc={() => {
                  (role.role === "root"?Promise.resolve({isConfirmed: true}):validatePwdToEdit(item.id)).then((result) => {
                    if (result.isConfirmed)
                      setForm({ showform: true, idToUpdate: item.id });
                  });
                }}
              />
            ): ("")
            }
            {" "}
            { (permissions.filter(p => p.name === "DelUsers").length > 0 && item.id !== 1 )? (
              <DeleteBtn
                clickFunc={() => {
                  confirmDelete(item.userName).then((result) => {
                    if (result.isConfirmed) deleteUser(item.id);
                  });
                }}
              />
            ):("")}
          </>
        ),
      };
      table = table.concat(tableItem);
    });
    setUsersTable([...table]);
  };

  // Ventana de confirmacion de contraseña para editar el usuario devuelve una promesa
  const validatePwdToEdit = (userId) => {
    const _userName = users.filter((u) => u.id === userId)[0].userName;
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success me-1",
        cancelButton: "btn btn-danger ms-1",
      },
      buttonsStyling: false,
    });
    return swalWithBootstrapButtons.fire({
      title: "Ingresa la contraseña del usuario",
      input: "password",
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      showLoaderOnConfirm: true,
      preConfirm: (_pwd) => {
        return userService
          .verifyPwd({ userName: _userName, password: _pwd })
          .then((data) => {
            if (!data.statusCode) {
              throw new Error("Usuario y/o Contraseña incorrectos");
            }
            return data.statusCode;
          })
          .catch(async ({ response }) => {
            if (response) await handleHttpError(response);
            Swal.showValidationMessage(`${response.data.message}`);
          });
      },
      allowOutsideClick: () => false,
    });
  };

  const confirmDelete = (_userName) => {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success me-1",
        cancelButton: "btn btn-danger ms-1",
      },
      buttonsStyling: false,
    });
    return swalWithBootstrapButtons.fire({
      title: "¿Está seguro que desea eliminar el usuario " + _userName + "?",
      text: "Esta acción no se puede revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, Eliminar",
    });
  };

  const updateUser = (userToUpdate) => {
    userService
      .update(userToUpdate)
      .then(() => {
        setForm(formInit);
        refresh();
        Swal.fire({
          text: "Usuario actualizado con éxito",
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

  const createUser = (userToCreate) => {
    userService
      .create(userToCreate)
      .then(() => {
        setForm(formInit);
        refresh();
        Swal.fire({
          text: "Usuario creado con éxito",
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

  const deleteUser = (idToDelete) => {
    userService
      .deleteU(idToDelete)
      .then(() => {
        setForm(formInit);
        refresh();
        Swal.fire({
          text: "Usuario Eliminado",
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
        { permissions.filter(p => p.name === "WriteUsers").length > 0 ?
          <button
            className="btn btn-success mb-5 mx-3"
            onClick={() => {
              setForm({ showform: true, idToUpdate: null });
            }}
          >
            <FontAwesomeIcon className="me-2" icon="fa-solid fa-user-plus" />
            <span>Crear Usuario</span>
          </button>:<div className="mb-5"></div>
        }
        {usersTable.length > 0 ? (
          <TableCrud data={usersTable} isEnumarated={false} />
        ) : (
          ""
        )}
      </>
    );
  };

  const renderForm = () => {
    if (usersTable.length <= 0) {
      return <></>;
    }

    return (
      <FormUsers
        createHandler={createUser}
        editHandler={updateUser}
        backHandler={back}
        idUserToEdit={form.idToUpdate}
      />
    );
  };
  return (
    <div className="container-fluid pt-2 w-100 h-100 overflow-auto">
      <div className="row m-3 bg-dark rounded-4">
        <div className="col mt-2 pt-2">
          <h2 className="mb-2 mx-3 text-light">Usuarios</h2>
          {form.showform ? renderForm() : renderList()}
        </div>
      </div>
    </div>
  );
};

export default withAuthorization(["/Admin/Users"], Users);
