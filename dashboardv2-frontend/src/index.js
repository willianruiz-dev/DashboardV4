import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { Provider } from "react-redux";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import "bootstrap/js/dist/modal";
import {store} from "./app/store";
import axios from "axios";
import "primereact/resources/themes/bootstrap4-dark-blue/theme.css";


// eslint-disable-next-line no-undef
axios.defaults.baseURL = process.env.REACT_APP_BASEADD;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
