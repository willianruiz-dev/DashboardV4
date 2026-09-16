import "../pages.css";
import userService from "../../services/userService";
import { React, useState } from "react";
import PropTypes from "prop-types";
import Loader from "../../components/Loader";

const LoginForm = ({ handlerToken }) => {
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [errMessage, setErrMessage] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    setErrMessage("");
    if (!validForm()) return;
    setLoading(true);
    userService
      .login({ userName, password })
      .then((data) => {
        handlerToken(data.response);
        setLoading(false);
      })
      .catch(({ response }) => {
        setErrMessage(response.data.message);
        setLoading(false);
      });
  };

  const validForm = () => {
    let result = true;
    const elementUsername = document.getElementById("user");
    const regex = /[!#$%^&*(){}[\]:;<>,?~='\\/]/;
    if (regex.test(elementUsername.value)) {
      result = false;
      setErrMessage("No se permiten carácteres especiales");
    }
    return result;
  };
  return (
    <div className="Login">
      <div className="login-box">
        <form className="form-box" onSubmit={handleSubmit}>
          <h1>Iniciar Sesión</h1>
          <div className="inputGroup">
            <input
              id="user"
              type="text"
              required
              autoComplete="off"
              onChange={({ target }) => setUserName(target.value)}
            />
            <label htmlFor="user">Username</label>
          </div>
          <div className="inputGroup">
            <input
              id="pass"
              type="password"
              required
              autoComplete="off"
              onChange={({ target }) => setPassword(target.value)}
            />
            <label htmlFor="user">Password</label>
          </div>
          {errMessage === "" ? (
            ""
          ) : (
            <p className="error-message">{errMessage}</p>
          )}
          {loading ? (
            <Loader />
          ) : (
            <button className="animated-button">
              <span>Ingresar</span>
              <span></span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

LoginForm.propTypes = {
  handlerToken: PropTypes.func.isRequired,
};

export default LoginForm;
