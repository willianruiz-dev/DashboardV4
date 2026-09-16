import React, { useEffect } from "react";
import { useState } from "react";
import PropTypes from "prop-types";
import mastersService from "../../services/mastersService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Swal from "sweetalert2";
import { handleHttpError } from "../../errorHandling/errorHandler";
import {
  FormImg,
  FormSelect,
  FormText,
} from "../../components/FormsComponents";

const FormDenominationMaster = ({
  masterName,
  masterDto,
  idToEdit,
  createHandler,
  editHandler,
  backHandler,
}) => {
  const isEdit = idToEdit ? true : false;
  const formFieldsAuxInit = [
    { name: "currency", feedback: null, required: true },
    { name: "value", feedback: null, required: true },
    { name: "img", feedback: null, required: true },
  ];

  const [denominationForm, setDenominationForm] = useState(masterDto);
  const [formFieldsAux, setFormFieldsAux] = useState([...formFieldsAuxInit]);
  const [currencies, setCurrencies] = useState([]);
  useEffect(() => {
    mastersService
      .getAll("Currency")
      .then(({ response }) => {
        setCurrencies([...response]);
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

    if (idToEdit !== null) {
      mastersService
        .getById(masterName, idToEdit)
        .then(({ response }) => {
          setDenominationForm({ ...response });
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
    if (isValidForm()) {
      if (isEdit) editHandler(denominationForm);
      else createHandler(denominationForm);
    }
  };

  const isValidForm = () => {
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

      // Validacion de caracteres especiales
      if (element.type === "text") {
        const regex = /[!#$%^&*(){}[\]:;<>,?~='\\/]/;
        if (regex.test(element.value)) {
          element.className += " is-invalid";
          field.feedback = "No se permiten carácteres especiales en este campo";
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
      setDenominationForm((prevForm) => ({
        ...prevForm,
        [target.id]: Number(target.selectedOptions["0"].id),
        [target.name]: target.value,
      }));
      return;
    }
    setDenominationForm((prevForm) => ({
      ...prevForm,
      [target.name]: target.value,
    }));
  };

  const handleChangeInputImage = ({ target }) => {
    if (!target.files) return;
    const file = target.files[0];
    let fileIsValid = file !== null && file !== undefined;
    fileIsValid &= file.type.startsWith("image/");
    if (fileIsValid) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const arrayBuffer = event.target.result;
        const byteArray = new Uint8Array(arrayBuffer);
        setDenominationForm((prevForm) => {
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
        const element = document.getElementsByName(prevFields[2].name)[0];
        element.className += " is-invalid";
        prevFields[2].feedback = "El archivo debe ser una imagen";
        return [...prevFields];
      });
    }
  };

  return (
    <>
      <h2 className="mx-3 mt-4 fs-4">{isEdit ? "Editar rol" : "Crear rol"}</h2>
      <button className="btn btn-secondary mx-3 mt-2" onClick={backHandler}>
        <FontAwesomeIcon icon="fa-solid fa-reply" />
        <span className="ms-2">Atrás</span>
      </button>
      <form className="row mx-2 my-4" onSubmit={handleSubmit}>
        <div className="col-3">
          <FormSelect
            label="Moneda"
            value={denominationForm?.currency}
            fieldId="idCurrency"
            fieldName={formFieldsAux[0].name}
            changeFunc={handleFormChange}
            itemList={currencies}
            itemKey="description"
            feedback={formFieldsAux[0].feedback}
          />
          <FormText
            label="Valor"
            value={
              denominationForm?.value ? denominationForm.value.toString() : ""
            }
            fieldName={formFieldsAux[1].name}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[1].feedback}
          />
          <FormImg
            label="Imagen denominación"
            fieldName={formFieldsAux[2].name}
            changeFunc={handleChangeInputImage}
            feedback={formFieldsAux[2].feedback}
          />
        </div>
        <div className="row mx-2 my-4">
          <button type="submit" className="btn btn-primary col-2 mx-2 px-1">
            {isEdit ? "Editar Denominación" : "Crear Denominación"}
          </button>
        </div>
      </form>
    </>
  );
};

FormDenominationMaster.propTypes = {
  masterName: PropTypes.string.isRequired,
  masterDto: PropTypes.object.isRequired,
  idToEdit: PropTypes.number,
  createHandler: PropTypes.func,
  editHandler: PropTypes.func,
  backHandler: PropTypes.func,
};

export default FormDenominationMaster;
