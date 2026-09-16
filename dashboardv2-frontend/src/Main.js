import "./index.css";
import React from "react";
import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Users from "./pages/users/Users";
import Transactions from "./pages/dashboard/transactions/Transaction";
import Clients from "./pages/clients/Clients";
import { Route, Routes, BrowserRouter as Router } from "react-router-dom";
import Home from "./pages/Home";
import Error401 from "./pages/errors/Error401";
import Error404 from "./pages/errors/Error404";
import Roles from "./pages/roles/Roles";
import RoutesPage from "./pages/routes/Routes";
import Currency from "./pages/masters/Currency";
import TypeDocument from "./pages/masters/TypeDocument";
import Region from "./pages/masters/Region";
import Offices from "./pages/offices/Offices";
import PayPad from "./pages/paypad/PayPad";
import CurrencyDenomination from "./pages/masters/CurrencyDenomination";
import Alerts from "./pages/alerts/Alerts";
import { useSelector } from "react-redux";
import Reports from "./pages/dashboard/reports/Reports";

const Main = () => {
  const state = useSelector((state) => state.login);
  const [routes, setRoutes] = useState([]);
  const [sidebarIsOpen, setSidebarStatus] = useState(true);
  
  useEffect(() => {
    processRoutes();
  }, [state]);

  const processRoutes = () => {
    const routesDtos = [...state.routesLogged];
    const nodeDictionary = {};
    let _routes = [];

    // Se crea un diccionario con los objetos de la lista ya procesados pero sin hijos
    routesDtos.forEach((routeDto) => {
      const route = {
        id: routeDto.id,
        title: routeDto.title,
        path: routeDto.route,
        icon: routeDto.icon,
        subs: [],
      };
      if (!nodeDictionary[routeDto.id]) {
        nodeDictionary[routeDto.id] = route;
      }
    });
    // Se averigua si cada objeto tiene un hijo dentro de la lista original
    routesDtos.forEach((routeDto) => {
      const currentNode = nodeDictionary[routeDto.id];
      // Si no tiene padres se ingresa a la lista
      if (routeDto.idFather !== null && routeDto.idFather !== 0) {
        const parentNode = nodeDictionary[routeDto.idFather];
        if (parentNode) parentNode.subs.push(currentNode);
      } else {
        _routes.push(currentNode);
      }
    });
    // Se repasa la lista resultado actualizando los nodos
    _routes = _routes.map((route) => {
      return nodeDictionary[route.id];
    });

    setRoutes([..._routes]);
  };

  return (
    <div className="Main">
      <Router>
        <Navbar userLogged={state.userLogged}
          toggleSidebar = {() => setSidebarStatus(s => !s)}
        />
        <div className="d-flex h-100 overflow-auto">
          <Sidebar routesList={routes}
            className={sidebarIsOpen? "sidebar-show": "sidebar-hidden"}
          />
          <div className="content h-100 w-100 overflow-auto">
            <Routes>
              <Route path="/" exact={true} Component={Home} />
              <Route path="/Admin/Users" exact={true} Component={Users} />
              <Route path="/Admin/Roles" exact={true} Component={Roles} />
              <Route path="/Admin/Routes" exact={true} Component={RoutesPage} />
              <Route path="/Admin/Costumers" exact={true} Component={Clients} />
              <Route path="/Admin/Offices" exact={true} Component={Offices} />
              <Route path="/Admin/PayPad" exact={true} Component={PayPad} />
              <Route path="/Admin/Alerts" exact={true} Component={Alerts} />
              <Route
                path="/Admin/Masters/Currencies"
                exact={true}
                Component={Currency}
              />
              <Route
                path="/Admin/Masters/TypeDoc"
                exact={true}
                Component={TypeDocument}
              />
              <Route
                path="/Admin/Masters/Regions"
                exact={true}
                Component={Region}
              />
              <Route
                path="/Admin/Masters/Denominations"
                exact={true}
                Component={CurrencyDenomination}
              />
              <Route
                path="/Transactions"
                exact={true}
                Component={Transactions}
              />
              <Route
                path="/Reports"
                exact={true}
                Component={Reports}
              />
              <Route path="/Unauthorized" exact={true} Component={Error401} />
              <Route path="*" exact={true} Component={Error404} />
            </Routes>
          </div>
        </div>
      </Router>
    </div>
  );
};

export default Main;
