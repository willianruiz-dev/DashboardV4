import React, { useEffect } from "react";
import { useState } from "react";
import PropTypes from "prop-types";
import clientDto from "../../Dto/clientDto";
import clientService from "../../services/clientService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Swal from "sweetalert2";
import mastersService from "../../services/mastersService";
import {
  FormText,
  FormSelect,
  FormImg,
} from "../../components/FormsComponents";
import { errorCodes, handleHttpError } from "../../errorHandling/errorHandler";



const FormClients = ({ idToEdit, createHandler, editHandler, backHandler }) => {
  const isEdit = idToEdit ? true : false;
  const formFieldsAuxInit = [
    { name: "name", feedback: null, required: true },
    { name: "nit", feedback: null, required: true },
    { name: "email", feedback: null, required: true },
    { name: "phone", feedback: null, required: false },
    { name: "region", feedback: null, required: true },
    { name: "img", feedback: null, required: false },
  ];
  let clients = [];
  const [regions, setRegions] = useState([]);
  const [clientForm, setClientForm] = useState(clientDto);
  const [formFieldsAux, setFormFieldsAux] = useState([...formFieldsAuxInit]);
  useEffect(() => {
    clientService
      .getAll()
      .then(({ response }) => {
        clients = [...response];
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

    

    mastersService
      .getAll("Region")
      .then(({ response }) => {
        setRegions([...response]);
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

    if (idToEdit !== null) {
      clientService
        .getById(idToEdit)
        .then(({ response }) => {
          setClientForm({ ...response });
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

  const handleChangeInputImage = ({ target }) => {
    if (!target.files) return;
    const file = target.files[0];
    let fileIsValid = file !== null && file !== undefined;
    fileIsValid = file.type.startsWith("image/");
    if (fileIsValid) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target.result;
        const byteArray = new Uint8Array(arrayBuffer);
        setClientForm((prevForm) => {
          return {
            ...prevForm,
            logoImgList: Array.from(byteArray),
            imgExt: file.name.split(".")[1],
          };
        });
      };
      reader.readAsArrayBuffer(file);
    } else {
      setFormFieldsAux((prevFields) => {
        const element = document.getElementsByName(prevFields[5].name)[0];
        element.className += " is-invalid";
        prevFields[5].feedback = "El archivo debe ser una imagen";
        return [...prevFields];
      });
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isValidClient()) {
      if (isEdit) editHandler(clientForm);
      else createHandler(clientForm);
    }
  };

  const handleFormChange = ({ target }) => {
    if (target.localName == "select") {
      if (target.selectedIndex == 0) return;
      setClientForm((prevForm) => ({
        ...prevForm,
        [target.id]: Number(target.selectedOptions["0"].id),
        [target.name]: target.value,
      }));
      return;
    }
    setClientForm((prevForm) => ({
      ...prevForm,
      [target.name]: target.value,
    }));
  };

  const isValidClient = () => {
    let result = true;
    const formFieldsCopy = [...formFieldsAux];
    formFieldsCopy.forEach((field) => {
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
      if (field.name === "phone" && element.value !== "") {
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

      //Validacion de objetos repetidos
      if (field.name === "name") {
        if (clients.filter((u) => u.userName === element.value).length > 0) {
          element.className += " is-invalid";
          field.feedback = "Ya existe un cliente con este nombre";
          result = false;
        }
      }
    });

    setFormFieldsAux([...formFieldsCopy]);
    return result;
  };

  return (
    <>
      <h2 className="mx-3 mt-4 fs-4">
        {isEdit ? "Editar Cliente" : "Crear Cliente"}
      </h2>
      <button className="btn btn-secondary mx-3 mt-2" onClick={backHandler}>
        <FontAwesomeIcon icon="fa-solid fa-reply" />
        <span className="ms-2">Atrás</span>
      </button>
      <form className="row mx-2 my-4" onSubmit={handleSubmit}>
        <div className="col-3">
          <FormText
            label="Nombre de cliente"
            value={clientForm?.name}
            fieldName={formFieldsAux[0].name}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[0].feedback}
          />
          <FormText
            label="Nit"
            value={clientForm?.nit}
            fieldName={formFieldsAux[1].name}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[2].feedback}
          />
          <FormText
            label="Correo electrónico"
            value={clientForm?.email}
            fieldName={formFieldsAux[2].name}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[2].feedback}
          />
          <FormText
            label="Teléfono"
            value={clientForm?.phone}
            fieldName={formFieldsAux[3].name}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[3].feedback}
          />
        </div>
        <div className="col-1"></div>
        <div className="col-3">
          <FormSelect
            label="Región"
            value={clientForm?.region}
            fieldId="idRegion"
            fieldName={formFieldsAux[4].name}
            changeFunc={handleFormChange}
            itemList={regions}
            itemKey="name"
            feedback={formFieldsAux[4].feedback}
          />
          <FormImg
            label="Logo cliente"
            fieldName={formFieldsAux[5].name}
            changeFunc={handleChangeInputImage}
            feedback={formFieldsAux[5].feedback}
          />
        </div>
        <div className="col-1"></div>

        <div className="row mx-2 my-4">
          <button type="submit" className="btn btn-primary col-2 mx-2 px-1">
            {isEdit ? "Editar Cliente" : "Crear Cliente"}
          </button>
        </div>
      </form>
    </>
  );
};

FormClients.propTypes = {
  idToEdit: PropTypes.number,
  createHandler: PropTypes.func,
  editHandler: PropTypes.func,
  backHandler: PropTypes.func,
};

export default FormClients;
