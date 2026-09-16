import React, { useEffect } from "react";
import { useState } from "react";
import PropTypes from "prop-types";
import roleDto from "../../Dto/rolesDto";
import roleService from "../../services/roleService";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Swal from "sweetalert2";
import routeService from "../../services/routeService";
import CheckBtn2 from "../../components/UI/ChekBtn2/CheckBtn2";
import { errorCodes, handleHttpError } from "../../errorHandling/errorHandler";
import { FormText } from "../../components/FormsComponents";
import permissionService from "../../services/permissionService";

const FormRoles = ({
  idRoleToEdit,
  createHandler,
  editHandler,
  backHandler,
}) => {
  const isEdit = idRoleToEdit ? true : false;
  const formFieldsAuxInit = [{ name: "role", feedback: null, required: true }];
  let roles = [];
  const [_routes, setRoutes] = useState(null);
  const [isRoutesReady, setIsRoutesReady] = useState(false);
  const [_permits, setPermits] = useState(null);
  const [isPermitsReady, setIsPermitsReady] = useState(false);
  const [routesForm, setRoutesForm] = useState(null);
  const [isRoutesFormReady, setIsRoutesFormReady] = useState(false);
  const [permitsForm, setPermitsForm] = useState(null);
  const [isPermitsFormReady, setIsPermitsFormReady] = useState(false);
  const [roleForm, setRoleForm] = useState(roleDto);
  const [formFieldsAux, setFormFieldsAux] = useState([...formFieldsAuxInit]);
  useEffect(() => {
    roleService
      .getAll()
      .then(({ response }) => {
        roles = [...response];
      })
      .catch(async ({ response }) => {
        const [errCode, errMsg] = await handleHttpError(response);
        if (errCode !== errorCodes.notFound) {
          Swal.fire(
            "Ocurrió un error obteniendo los datos del formulario",
            errMsg,
            "error"
          );
          return;
        }
        backHandler();
      });
    routeService
      .getAll()
      .then(({ response }) => {
        setRoutes([...response]);
      })
      .catch(async ({ response }) => {
        const [errCode, errMsg] = await handleHttpError(response);
        if (errCode !== errorCodes.notFound) {
          Swal.fire(
            "Ocurrió un error obteniendo los datos del formulario",
            errMsg,
            "error"
          );
          return;
        }
        backHandler();
      });

    permissionService
      .getAll()
      .then(({ response }) => {
        setPermits([...response]);
      })
      .catch(async ({ response }) => {
        const [errCode, errMsg] = await handleHttpError(response);
        if (errCode !== errorCodes.notFound) {
          Swal.fire(
            "Ocurrió un error obteniendo los datos del formulario",
            errMsg,
            "error"
          );
          return;
        }
        backHandler();
      });

    if (idRoleToEdit !== null) {
      roleService
        .getById(idRoleToEdit)
        .then(({ response }) => {
          const roleRoutes = response.routes;
          const rolePermissions = response.permissions;
          setRoleForm({ ...response });
          setRoutesForm([...roleRoutes]);
          setPermitsForm([...rolePermissions]);
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

  useEffect(() => {
    // Por alguna razon que desconozco routes form en alguna que otra actualización llegaba vacio
    if (routesForm !== null) setIsRoutesFormReady(true);
  }, [routesForm]);
  useEffect(() => {
    if (_routes !== null) setIsRoutesReady(true);
  }, [_routes]);

  useEffect(() => {
    // Por alguna razon que desconozco routes form en alguna que otra actualización llegaba vacio
    if (permitsForm !== null) setIsPermitsFormReady(true);
  }, [permitsForm]);
  useEffect(() => {
    if (_permits !== null) setIsPermitsReady(true);
  }, [_permits]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const routesFormBuild = [];
    _routes.forEach((r) => {
      const checkElement = document.getElementById("check_" + r.id);
      if (checkElement.checked) {
        routesFormBuild.push(r);
      }
    });

    const permitsFormBuild = [];
    _permits.forEach((p) => {
      const checkElement = document.getElementById("checkP_" + p.id);
      if (checkElement.checked) {
        permitsFormBuild.push(p);
      }
    });

    setRoleForm({ ...roleForm, routes: [...routesFormBuild] , permissions:[...permitsFormBuild]});
    if (isValidRole()) {
      if (isEdit) editHandler({ ...roleForm, routes: [...routesFormBuild], permissions:[...permitsFormBuild] });
      else createHandler({ ...roleForm, routes: [...routesFormBuild], permissions:[...permitsFormBuild] });
    }
  };

  const isValidRole = () => {
    let result = true;
    const formFieldsCopy = [...formFieldsAux];
    formFieldsCopy.forEach((field) => {
      const element = document.getElementsByName(field.name)[0];
      //Primero se reinicia el className de cada Elemento
      element.className = "form-control";

      // Validaciones de campos obligatorios
      if ((!element.value || element.value === "") && field.required) {
        element.className += " is-invalid";
        field.feedback = "Campo obligatorio";
        result = false;
      }

      // Validacion de caracteres especiales
      if (element.type === "text") {
        const regex = /[!#$%^&*(){}[\]:;<>,?~\\/]/;
        if (regex.test(element.value)) {
          element.className += " is-invalid";
          field.feedback = "No se permiten carácteres especiales en este campo";
          result = false;
        }
      }

      //Validacion de objetos repetidos
      if (field.name === "role") {
        if (roles.filter((u) => u.role === element.value).length > 0) {
          element.className += " is-invalid";
          field.feedback = "Ya existe un rol con este nombre";
          result = false;
        }
      }
    });

    setFormFieldsAux([...formFieldsCopy]);
    return result;
  };

  const handleFormChange = ({ target }) => {
    setRoleForm((prevForm) => ({
      ...prevForm,
      [target.name]: target.value,
    }));
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
          <FormText
            label="Nombre de rol"
            value={roleForm?.role}
            fieldName={formFieldsAux[0].name}
            changeFunc={handleFormChange}
            feedback={formFieldsAux[0].feedback}
          />
        </div>
        <div className="col-1"></div>
        <div className="col-3">
          {isRoutesFormReady && isRoutesReady ? (
            <div className="mb-2">
              <label className="form-label">Rutas</label>
              <div className="d-flex flex-column">
                {_routes.map((r) => {
                  const isRoleRoute =
                    routesForm.filter((ro) => ro.id === r.id).length > 0;
                  return (
                    <div key={"div_" + r.id} className="d-flex flex-row mb-2">
                      <CheckBtn2
                        key={"check_" + r.id}
                        id={"check_" + r.id}
                        initialValue={isRoleRoute ? true : false}
                        setCheckBool={() => {}}
                      />
                      <span className="ms-2" style={{ fontSize: "0.8rem" }} key={r.id}>
                        {r.route}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            ""
          )}
        </div>
        <div className="col-1"></div>
        <div className="col-3">
          {isPermitsFormReady && isPermitsReady ? (
            <div className="mb-2">
              <label className="form-label">Permisos</label>
              <div className="d-flex flex-column">
                {_permits.map((p) => {
                  const isRolePermission =
                    permitsForm.filter((per) => per.id === p.id).length > 0;
                  return (
                    <div key={"div_" + p.id} className="d-flex flex-row mb-2">
                      <CheckBtn2
                        key={"checkP_" + p.id}
                        id={"checkP_" + p.id}
                        initialValue={isRolePermission ? true : false}
                        setCheckBool={() => {}}
                      />
                      <span className="ms-4" style={{ fontSize: "0.8rem" }} key={p.id}>
                        {p.description}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            ""
          )}
        </div>
        <div className="row mx-2 my-4">
          <button type="submit" className="btn btn-primary col-2 mx-2 px-1">
            {isEdit ? "Editar rol" : "Crear rol"}
          </button>
        </div>
      </form>
    </>
  );
};

FormRoles.propTypes = {
  idRoleToEdit: PropTypes.number,
  createHandler: PropTypes.func,
  editHandler: PropTypes.func,
  backHandler: PropTypes.func,
};

export default FormRoles;
