import React, { useState, useLayoutEffect, createContext } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = props => {
  const [login, setLogin] = useState(
    JSON.parse(localStorage.getItem("login")) || false
  );
  const loginState = [login, setLogin];

  const [interceptor, setInterceptor] = useState(false);

  useLayoutEffect(() => {
    localStorage.setItem("login", JSON.stringify(login));
    if (!login && interceptor) {
      axios.interceptors.request.eject(interceptor[0]);
      axios.interceptors.response.eject(interceptor[1]);
      setInterceptor(false);
    }
    if (login && !interceptor) {
      setInterceptor([
        axios.interceptors.request.use(
          config => {
            config.headers.Authorization = "Bearer " + login.jwt;
            return config;
          },
          function (error) {
            return Promise.reject(error);
          }
        ),
        axios.interceptors.response.use(
          response => response,
          function (error) {
            if (!axios.isCancel(error) &&
              (login.server.startsWith('/') || error.request.responseURL.startsWith(login.server)) &&
              error.response != null && error.response.status === 401
            ) {
              setLogin(false);
            }
            return Promise.reject(error);
          }
        )
      ]);
    }
  }, [login, interceptor]);

  return (
    <AuthContext.Provider value={loginState}>
      {props.children}
    </AuthContext.Provider>
  );
};
