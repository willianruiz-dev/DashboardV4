import "./index.css";
import React, { useState } from "react";
import LoginForm from "./pages/login/LoginForm";
import Main from "./Main";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import userService from "./services/userService";
import Swal from "sweetalert2";
import { handleHttpError } from "./errorHandling/errorHandler";
import { useDispatch } from "react-redux";
import roleService from "./services/roleService";
import { setPermitsLogged, setRoleLogged, setRoutesLogged, setUserLogged } from "./app/loginSlice";
import { PrimeReactProvider } from "primereact/api";
import { addLocale } from "primereact/api";
        
const App = () => {
  const dispatch = useDispatch();
  const [token, setToken] = useState(window.localStorage.getItem("session"));
  addLocale("es", {
    firstDayOfWeek: 1,
    showMonthAfterYear: true,
    dayNames: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
    dayNamesShort: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
    dayNamesMin: ["D", "L", "M", "X", "J", "V", "S"],
    monthNames: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    monthNamesShort: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    today: "Hoy",
    clear: "Limpiar"
  });
  const saveSessionToken = (newToken) => {
    setToken(newToken);
    window.localStorage.setItem("session", newToken);
  };

  const setLoginData = async () => {
    let roleId = 0;
    if (token !== null && token !== "" && token !== undefined) {
      await userService
        .getLogged()
        .then(({ response }) => {
          dispatch(setUserLogged(response));
          roleId = response.idRole;
        })
        .catch(async ({ response }) => {
          await handleHttpError(response);
          Swal.fire({
            text: "Ocurrió un error obteniendo la información del usuario",
            icon: "error",
          });
        });
        
      await roleService
        .getById(roleId)
        .then(({ response }) => {
          dispatch(setRoleLogged(response));
          dispatch(setRoutesLogged(response.routes));
          dispatch(setPermitsLogged(response.permissions));
        })
        .catch(async ({ response }) => {
          await handleHttpError(response);
          Swal.fire({
            text: "Ocurrió un error obteniendo la información del usuario",
            icon: "error",
          });
        });
    }
  };

  setLoginData();
  return (
    <PrimeReactProvider>
      <div className="App">
        {token !== null && token !== "" && token !== undefined ? (
          <Main />
        ) : (
          <LoginForm handlerToken={saveSessionToken} />
        )}
      </div>
    </PrimeReactProvider>

  );
};
export default App;
library.add(fas, far);
