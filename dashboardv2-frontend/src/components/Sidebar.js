import React, { useState } from "react";
import "./components.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import PropTypes from "prop-types";
import { NavLink } from "react-router-dom";

const discardList = ["/Admin/Offices"];

function isDiscarded(routeObj) {
  const isRouteDicarded =
    discardList.filter((path) => routeObj.path === path).length > 0;
  return isRouteDicarded;
}

const Sidebar = ({ routesList, className }) => {
  const itemsList = routesList;

  const renderRoutesList = (routes) => {
    return routes.map((route) => {
      return <SubmenuItem key={route.id} routeObj={route} />;
    });
  };

  return (
    <div className={"sidebar bg-dark " + className} style={{ fontSize: "0.85rem" }}>
      {/* <h6 className="m-1 p-3 text-white-50">Navegación</h6> */}
      <ul>{renderRoutesList(itemsList)}</ul>
    </div>
  );
};

Sidebar.propTypes = {
  routesList: PropTypes.array,
  className: PropTypes.string,
};

const SidebarItem = ({ itemObj }) => {
  const navLinkStyle =
    "text-light rounded py-2 w-100 d-inline-block px-3 ripple";
  return (
    <NavLink
      to={itemObj.path}
      exact={"true"}
      className={(navData) =>
        navData.isActive ? navLinkStyle + " active" : navLinkStyle
      }
    >
      <FontAwesomeIcon icon={itemObj.icon} className="me-2" />
      <span>{itemObj.title}</span>
    </NavLink>
  );
};

SidebarItem.propTypes = {
  itemObj: PropTypes.object,
};

const SubmenuItem = ({ routeObj }) => {
  if (isDiscarded(routeObj)) return <></>;

  const [isActive, setIsActive] = useState(false);
  const handleClick = () => {
    setIsActive((prevIsActive) => !prevIsActive);
  };
  return (
    <li>
      {routeObj.subs.length > 0 ? (
        <>
          <div
            className={
              "text-light rounded py-2 w-100 d-inline-block px-3 ripple"
            }
            onClick={handleClick}
          >
            <FontAwesomeIcon icon={routeObj.icon} className="me-2" />
            <span>{routeObj.title}</span>
            <FontAwesomeIcon icon="fa-solid fa-angle-down" className="ms-2" />
          </div>
          {isActive ? (
            <ul className="ul-interno">
              {routeObj.subs.map((_routeObj) => {
                return <SubmenuItem key={_routeObj.id} routeObj={_routeObj} />;
              })}
            </ul>
          ) : (
            ""
          )}
        </>
      ) : (
        <SidebarItem itemObj={routeObj} />
      )}
    </li>
  );
};

SubmenuItem.propTypes = {
  routeObj: PropTypes.object,
};

export default Sidebar;
