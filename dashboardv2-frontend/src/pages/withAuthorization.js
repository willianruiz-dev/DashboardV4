import React, { useEffect, useState } from "react";
//import { useEffect, useState } from 'react';
import { Navigate } from "react-router-dom";
import Loader from "../components/Loader";
import { useSelector } from "react-redux";

const withAuthorization = (allowedRoutes, WrappedComponent) => {
  const AuthHOC = (props) => {
    const routesLogged = useSelector((state) => state.login.routesLogged);
    const [userRoutes, setUserRoutes] = useState(null);
    const [gotRoutes, setGotRoutes] = useState(false);
    
    useEffect(()=>{
      if(routesLogged && routesLogged.length > 0){
        setUserRoutes(() => {
          return routesLogged.map((_route) => {
            return _route.route;
          });
        });
      }
    },[routesLogged]);
    
    useEffect(() => {
      if (userRoutes !== null) {
        setGotRoutes(true);
      }
    }, [userRoutes]);

    
    if (gotRoutes) {
      if (userRoutes.some((route) => allowedRoutes.includes(route))) {
        return <WrappedComponent {...props} />;
      } else {
        return <Navigate to="/Unauthorized" />;
      }
    } else {
      return (
        <div className="container-fluid text-center mt-5">
          <div className="row justify-content-center">
            <div className="col align-items-center">
              <Loader />
            </div>
          </div>
        </div>
      );
    }
  };

  return AuthHOC;
};

export default withAuthorization;
