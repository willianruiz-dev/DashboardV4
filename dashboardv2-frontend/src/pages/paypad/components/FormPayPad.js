import React, { useEffect } from "react";
import {
  FormText,
  FormSelect,
  FormPwd,
  FormStatus,
} from "../../../components/FormsComponents";
import { useState } from "react";
import PropTypes from "prop-types";
import paypadDto from "../../../Dto/paypadDto";
import clientDto from "../../../Dto/clientDto";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Swal from "sweetalert2";
import paypadService from "../../../services/paypadService";
import mastersService from "../../../services/mastersService";
import clientService from "../../../services/clientService";
import officeService from "../../../services/officeService";
import { errorCodes, handleHttpError } from "../../../errorHandling/errorHandler";

const FormPayPad = ({ idToEdit, createHandler, editHandler, backHandler }) => {
  const [paypadForm, setPaypadForm] = useState(paypadDto);

  const isEdit = idToEdit ? true : false;
  const formFieldsAuxInit = [
    { name: "username", feedback: null, required: true },
    { name: "description", feedback: null, required: true },
    { name: "longitude", feedback: null, required: true },
    { name: "latitude", feedback: null, required: true },
    { name: "currency", feedback: null, required: true },
    { name: "client", feedback: null, required: true },
    { name: "office", feedback: null, required: true },
    { name: "pwd", feedback: null, required: true },
    { name: "pwdConfirm", feedback: null, required: true },
  ];
  let paypads = [];
  const [currencies, setCurrencies] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientSelected, setClientSelected] = useState(clientDto);
  const [officesByClient, setOfficesByClient] = useState([]);

  const [formFieldsAux, setFormFieldsAux] = useState([...formFieldsAuxInit]);

  const fetchData = async () => {
    await paypadService
      .getAll()
      .then(({ response }) => {
        paypads = [...response];
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

    await mastersService
      .getAll("Currency")
      .then(({ response }) => {
        setCurrencies([...response]);
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
        }
      });

    
    await clientService
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
        }
      });
    
    

    if (idToEdit !== null) {
      await paypadService
        .getById(idToEdit)
        .then(({ response }) => {
          setPaypadForm({ ...response });
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
  };
  
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (clientSelected.id != 0) {
      officeService
        .getByClient(clientSelected.id)
        .then(({ response }) => {
          setOfficesByClient([...response]);
        })
        .catch(async ({ response }) => {
          const errCode = await handleHttpError(response)[0];
          if (errCode !== "1") {
            backHandler();
          }
        });
    }
  }, [clientSelected]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isValidPayPad()) {
      if (isEdit) editHandler(paypadForm);
      else createHandler(paypadForm);
    }
  };

  const handleFormChange = ({ target }) => {
    if (target.localName == "select") {
      if (target.selectedIndex == 0) return;
      setPaypadForm((prevForm) => ({
        ...prevForm,
        [target.id]: Number(target.selectedOptions["0"].id),
        [target.name]: target.value,
      }));
      return;
    }
    setPaypadForm((prevForm) => ({
      ...prevForm,
      [target.name]: target.value,
    }));
  };

  const isValidPayPad = () => {
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
      if (element.localName === "select" && element.selectedIndex == 0) {
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
      if (field.name === "username") {
        if (paypads.filter((p) => p.username === element.value).length > 0) {
          element.className += " is-invalid";
          field.feedback = "Ya existe un pay+ con este nombre";
          result = false;
        }
      }

      //Validacion de que los campos de coordenadas sean numeros
      if (field.name === "longitude" || field.name === "latitude") {
        const num = parseFloat(element.value);
        if (!(!isNaN(num) && num.toString() === element.value)) {
          element.className += " is-invalid";
          field.feedback = "el valor debe ser un numero decimal";
          result = false;
        }
      }
    });

    setFormFieldsAux([...formFieldsCopy]);

    return result;
  };

  const handleClientSelected = ({ target }) => {
    const clientSelected = clients.filter(
      (client) => client.id === Number(target.selectedOptions["0"].id)
    )[0];
    if (clientSelected) setClientSelected({ ...clientSelected });
  };

  const handleChangePwd = async () => {
    const pwdChanged = await changePwdSweetA().then((result) => {
      if (result.isDenied || result.isDismissed) return false;
      return true;
    });

    if (pwdChanged) {
      Swal.fire({
        text: "Contraseña cambiada con exito",
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
        return await paypadService
          .changePwd({
            document: paypadForm.id.toString(),
            oldPwd: _oldPwd,
            newPwd: _newPwd,
          })
          .catch(async ({ response }) => {
            let [ ,errMsg] = await handleHttpError(response);
            if (!errMsg) errMsg = "Error desconocido";
            Swal.showValidationMessage(`${errMsg}`);
            return null;
          });
      },
      allowOutsideClick: () => false,
    });
  };

  return (
    <>
      <h2 className="mx-3 mt-4 fs-4">
        {isEdit ? "Editar Pay+" : "Crear Pay+"}
      </h2>
      <button className="btn btn-secondary mx-3 mt-2" onClick={backHandler}>
        <FontAwesomeIcon icon="fa-solid fa-reply" />
        <span className="ms-2">Atrás</span>
      </button>
      <form className="row mx-2 my-4" onSubmit={handleSubmit}>
        <div className="col-3">
          <FormText
            label="Nombre Pay+"
            fieldName={formFieldsAux[0].name}
            value={paypadForm?.username}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[0].feedback}
          />
          <FormText
            label="Descripción"
            fieldName={formFieldsAux[1].name}
            value={paypadForm?.description}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[1].feedback}
          />
          <FormText
            label="Ubicación geográfica: Longitud"
            fieldName={formFieldsAux[2].name}
            value={paypadForm?.longitude}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[2].feedback}
          />
          <FormText
            label="Ubicación geográfica: Latitud"
            fieldName={formFieldsAux[3].name}
            value={paypadForm?.latitude}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[3].feedback}
          />
        </div>
        <div className="col-1"></div>
        <div className="col-3">
          <FormStatus
            label="Activo"
            value={Boolean(paypadForm.status)}
            checkFunc={() => {
              setPaypadForm((prevForm) => {
                return { ...prevForm, status: Number(!paypadForm.status) };
              });
            }}
          />

          <FormSelect
            label="Moneda"
            fieldName={formFieldsAux[4].name}
            fieldId="idCurrency"
            value={paypadForm?.currency}
            changeFunc={handleFormChange}
            itemList={currencies}
            itemKey="description"
            feedback={formFieldsAux[4].feedback}
          />
          <FormSelect
            label="Cliente"
            fieldName={formFieldsAux[5].name}
            fieldId="idClient"
            value={clientSelected.name}
            changeFunc={handleClientSelected}
            itemList={clients}
            itemKey="name"
            feedback={formFieldsAux[5].feedback}
          />
          <FormSelect
            label="Oficina"
            fieldName={formFieldsAux[6].name}
            fieldId="idOffice"
            value={paypadForm?.office}
            changeFunc={handleFormChange}
            itemList={officesByClient}
            itemKey="name"
            feedback={formFieldsAux[6].feedback}
          />
        </div>
        <div className="col-1"></div>
        {isEdit ? (
          ""
        ) : (
          <div className="col-3">
            <FormPwd
              label="Contraseña"
              fieldName={formFieldsAux[7].name}
              changeFunc={handleFormChange}
              feedback={formFieldsAux[7].feedback}
            />
            <FormPwd
              label="Confirmar Contraseña"
              fieldName={formFieldsAux[8].name}
              changeFunc={() => {}}
              feedback={formFieldsAux[8].feedback}
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
            {isEdit ? "Editar Pay+" : "Crear Pay+"}
          </button>
        </div>
      </form>
    </>
  );
};

FormPayPad.propTypes = {
  idToEdit: PropTypes.number,
  createHandler: PropTypes.func,
  editHandler: PropTypes.func,
  backHandler: PropTypes.func,
};

export default FormPayPad;
