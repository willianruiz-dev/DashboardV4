import React, { useEffect } from "react";
import { useState } from "react";
import PropTypes from "prop-types";
import userDto from "../../Dto/usersDto";
import userService from "../../services/userService";
import mastersService from "../../services/mastersService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Swal from "sweetalert2";
import roleService from "../../services/roleService";
import { errorCodes, handleHttpError } from "../../errorHandling/errorHandler";
import {
  FormImg,
  FormPwd,
  FormSelect,
  FormStatus,
  FormText,
} from "../../components/FormsComponents";
import clientService from "../../services/clientService";

const FormUsers = ({
  idUserToEdit,
  createHandler,
  editHandler,
  backHandler,
}) => {
  const [userForm, setUserForm] = useState(userDto);
  const isEdit = idUserToEdit ? true : false;
  const formFieldsAuxInit = [
    { name: "userName", feedback: null, required: true },
    { name: "typeDocument", feedback: null, required: true },
    { name: "document", feedback: null, required: true },
    { name: "name", feedback: null, required: true },
    { name: "lastName", feedback: null, required: false },
    { name: "phone", feedback: null, required: false },
    { name: "email", feedback: null, required: true },
    { name: "role", feedback: null, required: true },
    { name: "pwd", feedback: null, required: true },
    { name: "pwdConfirm", feedback: null, required: true },
    { name: "img", feedback: null, required: false },
    { name: "client", feedback: null, required: false },
  ];
  let users = [];
  const [roles, setRoles] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [clients, setClients] = useState([]);
  const [formFieldsAux, setFormFieldsAux] = useState([...formFieldsAuxInit]);
  useEffect(() => {
    userService
      .getAll()
      .then(({ response }) => {
        users = [...response];
      })
      .catch(async ({ response }) => {
        const [, errMsg] = await handleHttpError(response);
        Swal.fire(
          "Ocurrió un error obteniendo los datos del formulario",
          errMsg,
          "error"
        );
        backHandler();
      });

    clientService
      .getAll()
      .then(({ response }) => {
        setClients([...response]);
      })
      .catch(async ({ response }) => {
        const [errCode, errMsg] = await handleHttpError(response);
        if (errCode !== errorCodes.notFound) {
          Swal.fire(
            "Ocurrió un error obteniendo los datos del formulario",
            errMsg,
            "error"
          );
          backHandler();
          return;
        }
      });

    roleService
      .getAll()
      .then(({ response }) => {
        setRoles([...response]);
      })
      .catch(async ({ response }) => {
        const [, errMsg] = await handleHttpError(response);
        Swal.fire(
          "Ocurrió un error obteniendo los datos del formulario",
          errMsg,
          "error"
        );
        backHandler();
      });

    mastersService
      .getAll("TypeDocument")
      .then(({ response }) => {
        setDocumentTypes([...response]);
      })
      .catch(async ({ response }) => {
        const [, errMsg] = await handleHttpError(response);
        Swal.fire(
          "Ocurrió un error obteniendo los datos del formulario",
          errMsg,
          "error"
        );
        backHandler();
      });

    if (idUserToEdit !== null) {
      userService
        .getById(idUserToEdit)
        .then(({ response }) => {
          setUserForm({ ...response });
        })
        .catch(async ({ response }) => {
          const [, errMsg] = await handleHttpError(response);
          Swal.fire(
            "Ocurrió un error obteniendo los datos del formulario",
            errMsg,
            "error"
          );
          backHandler();
        });
    }
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isValidUser()) {
      if (isEdit) editHandler(userForm);
      else createHandler(userForm);
    }
  };

  const handleChangePwd = async () => {
    const pwdChanged = await changePwdSweetA().then((result) => {
      if (result.isDenied || result.isDismissed) return false;
      return true;
    });

    if (pwdChanged) {
      Swal.fire({
        text: "Contraseña cambiada con éxito",
        icon: "success",
      });
    }
  };

  const changePwdSweetA = () => {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-success me-1",
        cancelButton: "btn btn-danger ms-1",
      },
      buttonsStyling: false,
    });
    return swalWithBootstrapButtons.fire({
      title: "Ingresa la nueva contraseña",
      html:
        "<div class=\"mb-2\">" +
        "<label class=\"form-label\">Contraseña Actual</label>" +
        "<input id=\"SoldPwd\" type=\"password\" class=\"form-control\">" +
        "</div>" +
        "<div class=\"mb-2\">" +
        "<label class=\"form-label\">Nueva Contraseña</label>" +
        "<input id=\"SnewPwd\" type=\"password\" class=\"form-control\">" +
        "</div>" +
        "<div class=\"mb-2\">" +
        "<label class=\"form-label\">Confirmar Contraseña</label>" +
        "<input id=\"SconfirmPwd\" type=\"password\" class=\"form-control\">" +
        "</div>",
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        const _oldPwd = document.getElementById("SoldPwd").value;
        const _newPwd = document.getElementById("SnewPwd").value;
        const _confirmNewPwd = document.getElementById("SconfirmPwd").value;

        if (_newPwd !== _confirmNewPwd) {
          Swal.showValidationMessage("Las contraseñas deben coincidir");
          return null;
        }
        const regex =
          /^(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*()-_=+[\]{}|;:'",.<>?/]).{8,}$/;
        if (!regex.test(_newPwd)) {
          Swal.showValidationMessage(
            "Las contraseña nueva debe tener al menos 8 caracteres, una mayúscula, una minúscula y un carácter especial"
          );
          return null;
        }

        return await userService
          .changePwd({
            document: userForm.document,
            oldPwd: _oldPwd,
            newPwd: _newPwd,
          })
          .catch(async ({ response }) => {
            await handleHttpError(response);
            Swal.showValidationMessage(`${response.data.message}`);
            return null;
          });
      },
      allowOutsideClick: () => false,
    });
  };

  const isValidUser = () => {
    let result = true;
    const formFieldsCopy = [...formFieldsAux];
    formFieldsCopy.forEach((field) => {
      if (isEdit && field.name.includes("pwd")) return;

      const element = document.getElementsByName(field.name)[0];
      //Primero se reinicia el className de cada Elemento
      if (element.localName === "select") element.className = "form-select";
      else element.className = "form-control";

      // Validaciones de campos obligatorios
      if ((!element.value || element.value === "") && field.required) {
        element.className += " is-invalid";
        field.feedback = "Campo obligatorio";
        result = false;
      }
      if (element.localName === "select" && element.selectedIndex == 0 && field.required) {
        element.className += " is-invalid";
        field.feedback = "Debe seleccionar una opción";
        result = false;
      }

      // Validacion de caracteres especiales
      if (element.type === "text") {
        const regex = /[!#$%^&*(){}[\]:;<>,?~='\\/]/;
        if (regex.test(element.value)) {
          element.className += " is-invalid";
          field.feedback = "No se permiten carácteres especiales en este campo";
          result = false;
        }
      }

      //Validacion de email
      if (field.name === "email") {
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!regex.test(element.value)) {
          element.className += " is-invalid";
          field.feedback = "Debe ingresar un email valido";
          result = false;
        }
      }

      //Validacion de teléfono
      if (field.name === "phone") {
        const regex = /^[0-9]+$/;
        const regexWithIndicative = /^\+[0-9]+ [0-9]+$/;
        if (
          !regex.test(element.value) &&
          !regexWithIndicative.test(element.value)
        ) {
          element.className += " is-invalid";
          field.feedback = "Debe ingresar un numero de teléfono valido";
          result = false;
        }
      }

      //Validacion de contraseña
      if (field.name === "pwd" && !isEdit) {
        const elementPwdConfirm = document.getElementsByName("pwdConfirm")[0];
        if (!(element.value === elementPwdConfirm.value)) {
          element.className += " is-invalid";
          field.feedback = "Las contraseñas no coinciden";
          result = false;
        }
        const regex =
          /^(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*()-_=+[\]{}|;:'",.<>?/]).{8,}$/;
        if (!regex.test(element.value)) {
          element.className += " is-invalid";
          field.feedback =
            "Debe ingresar una contraseña de 8 caracteres, una mayuscula, una minuscula y un caracter especial";
          result = false;
        }
      }

      //Validacion de objetos repetidos
      if (field.name === "userName") {
        if (users.filter((u) => u.userName === element.value).length > 0) {
          element.className += " is-invalid";
          field.feedback = "Ya existe un usuario con este nombre";
          result = false;
        }
      }

      if (field.name === "document") {
        if (users.filter((u) => u.document === element.value).length > 0) {
          element.className += " is-invalid";
          field.feedback = "Ya existe un usuario con este documento";
          result = false;
        }
      }
    });

    setFormFieldsAux([...formFieldsCopy]);
    return result;
  };

  const handleFormChange = ({ target }) => {
    if (target.localName == "select") {
      if (target.selectedIndex == 0) return;
      setUserForm((prevForm) => ({
        ...prevForm,
        [target.id]: Number(target.selectedOptions["0"].id),
        [target.name]: target.value,
      }));
      return;
    }
    setUserForm((prevForm) => ({
      ...prevForm,
      [target.name]: target.value,
    }));
  };

  const handleChangeInputImage = ({ target }) => {
    if (!target.files || target.files.length<=0) return;
    const file = target.files[0];
    let fileIsValid = file !== null && file !== undefined;
    fileIsValid = file.type.startsWith("image/");
    if (fileIsValid) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target.result;
        const byteArray = new Uint8Array(arrayBuffer);
        setUserForm((prevForm) => {
          return {
            ...prevForm,
            imgList: Array.from(byteArray),
            imgExt: file.name.split(".")[1],
          };
        });
      };
      reader.readAsArrayBuffer(file);
    } else {
      setFormFieldsAux((prevFields) => {
        const element = document.getElementsByName(prevFields[10].name)[0];
        element.className += " is-invalid";
        prevFields[10].feedback = "El archivo debe ser una imagen";
        return [...prevFields];
      });
    }
  };

  return (
    <>
      <h2 className="mx-3 mt-4 fs-4">
        {isEdit ? "Editar Usuario" : "Crear usuario"}
      </h2>
      <button className="btn btn-secondary mx-3 mt-2" onClick={backHandler}>
        <FontAwesomeIcon icon="fa-solid fa-reply" />
        <span className="ms-2">Atrás</span>
      </button>
      <form className="row mx-2 my-4" onSubmit={handleSubmit}>
        <div className="col-3">
          <FormText
            label="Nombre de usuario"
            value={userForm?.userName}
            fieldName={formFieldsAux[0].name}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[0].feedback}
          />
          <FormSelect
            label="Tipo de Documento"
            fieldName={formFieldsAux[1].name}
            fieldId="idTypeDocument"
            value={userForm?.typeDocument}
            changeFunc={handleFormChange}
            itemList={documentTypes}
            itemKey="typeDocument"
            feedback={formFieldsAux[1].feedback}
          />
          <FormText
            label="Documento"
            value={userForm?.document}
            fieldName={formFieldsAux[2].name}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[2].feedback}
          />
          <FormText
            label="Nombre"
            value={userForm?.name}
            fieldName={formFieldsAux[3].name}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[3].feedback}
          />
          <FormText
            label="Apellido/s"
            value={userForm?.lastName}
            fieldName={formFieldsAux[4].name}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[4].feedback}
          />
        </div>
        <div className="col-1"></div>
        <div className="col-3">
          <FormText
            label="Teléfono"
            value={userForm?.phone}
            fieldName={formFieldsAux[5].name}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[5].feedback}
          />
          <FormText
            label="Email"
            value={userForm?.email}
            fieldName={formFieldsAux[6].name}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[6].feedback}
          />
          <FormStatus
            label="Activo"
            value={Boolean(userForm.status)}
            checkFunc={() => {
              setUserForm((prevUserForm) => {
                return { ...prevUserForm, status: Number(!userForm.status) };
              });
            }}
          />
          <FormSelect
            label="Rol"
            fieldName={formFieldsAux[7].name}
            fieldId="idRole"
            value={userForm?.role}
            changeFunc={handleFormChange}
            itemList={roles}
            itemKey="role"
            feedback={formFieldsAux[7].feedback}
          />
          <FormSelect
            label="Cliente Asociado"
            value={ userForm.client}
            fieldId="idClient"
            fieldName={formFieldsAux[11].name}
            changeFunc={handleFormChange}
            itemList={clients}
            itemKey="name"
            feedback={formFieldsAux[11].feedback}
            isDisabled={false}
          />
          <FormImg
            label="Imagen de perfil"
            fieldName={formFieldsAux[10].name}
            changeFunc={handleChangeInputImage}
            feedback={formFieldsAux[10].feedback}
          />
        </div>
        <div className="col-1"></div>
        {isEdit ? (
          ""
        ) : (
          <div className="col-3">
            <FormPwd
              label="Contraseña"
              fieldName={formFieldsAux[8].name}
              changeFunc={handleFormChange}
              feedback={formFieldsAux[8].feedback}
            />
            <FormPwd
              label="Confirmar Contraseña"
              fieldName={formFieldsAux[9].name}
              changeFunc={handleFormChange}
              feedback={formFieldsAux[9].feedback}
            />
          </div>
        )}
        <div className="row mx-2 my-4">
          {isEdit ? (
            <button
              type="button"
              className="btn btn-warning col-3 mx-2 px-1"
              onClick={handleChangePwd}
            >
              Cambiar contraseña
            </button>
          ) : (
            ""
          )}
          <button type="submit" className="btn btn-primary col-2 mx-2 px-1">
            {isEdit ? "Editar Usuario" : "Crear usuario"}
          </button>
        </div>
      </form>
    </>
  );
};

FormUsers.propTypes = {
  idUserToEdit: PropTypes.number,
  createHandler: PropTypes.func,
  editHandler: PropTypes.func,
  backHandler: PropTypes.func,
};

export default FormUsers;
