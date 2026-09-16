import React from "react";
import withAuthorization from "./withAuthorization";

const Home = () => {
  return (
    <div className="container-fluid pt-2 w-100 h-100 overflow-auto">
      <div className="row m-3 bg-dark rounded-4 p-2">
        <div className="col-12 text-center">
          <h1 className="text-white-50 fw-bold mt-3">Bienvenido</h1>
        </div>
      </div>
    </div>
  );
};

export default withAuthorization(["/"], Home);
