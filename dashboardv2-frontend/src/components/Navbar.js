import React from "react";
import "./components.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dropdown } from "react-bootstrap";
import { PropTypes } from "prop-types";
import userService from "../services/userService";

const Navbar = ({ userLogged, toggleSidebar }) => {
  const logOut = (event) => {
    event.preventDefault();
    userService
      .logOut()
      .then(() => {
        window.localStorage.removeItem("session");
        window.location.href = "/";
      })
      .catch(({ response }) => {
        // eslint-disable-next-line no-undef
        if (process.env.NODE_ENV === "development") {
          console.log(response);
        }
      });
  };

  const renderDropDownMenu = () => {
    return (
      <Dropdown.Menu className="dropdown-menu-personal">
        {/*<Dropdown.Item href="/">
          <FontAwesomeIcon icon="fa-solid fa-user" className="me-3" />
          Perfil
        </Dropdown.Item>
        <Dropdown.Item href="/">
          <FontAwesomeIcon icon="fa-solid fa-gear" className="me-3" />
          Configuración
        </Dropdown.Item>*/}
        <Dropdown.Item href="/" onClick={logOut}>
          <FontAwesomeIcon icon="fa-solid fa-power-off" className="me-3" />
          Cerrar sesión
        </Dropdown.Item>
      </Dropdown.Menu>
    );
  };

  return (
    <nav className="navbar2 bg-dark">
      <div className="d-flex align-items-center ms-3 img-container">
        <img
          className="rounded bg-light"
          src="/images/banner_resized.jpg"
          alt="Logo E-city"
        />
        <FontAwesomeIcon
          icon="fa-solid fa-bars"
          type="button"
          className="mx-3"
          onClick={toggleSidebar}
        />
      </div>
      <Dropdown className="d-flex">
        <Dropdown.Toggle
          id="dropdown-basic"
          style={{
            backgroundColor: "var(--bg-color)",
            border: "none",
            borderRadius: 0,
          }}
        >
          <img
            src={
              userLogged?.img !== undefined && userLogged?.img !== null
                ? `/staticfiles${userLogged.img}`
                : "/images/profile-default.png"
            }
            className="me-2"
            width="40px"
            height="40px"
            alt="Profile Picture"
            style={{ borderRadius: "20px" }}
          />
          {userLogged?.userName}
        </Dropdown.Toggle>
        {userLogged !== undefined && userLogged !== null ? (
          renderDropDownMenu()
        ) : (
          <></>
        )}
      </Dropdown>
    </nav>
  );
};

Navbar.propTypes = {
  userLogged: PropTypes.object,
  toggleSidebar: PropTypes.any
};
export default Navbar;
