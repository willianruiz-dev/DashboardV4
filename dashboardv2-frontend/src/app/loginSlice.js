import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  userLogged: null,
  roleLogged: null,
  routesLogged: [],
  permitsLogged: [],
};

export const loginSlice = createSlice({
  name: "login",
  initialState,
  reducers: {
    setUserLogged: (state, action) => {
      state.userLogged = action.payload;
    },
    setRoleLogged: (state, action) => {
      state.roleLogged = action.payload;
    },
    setRoutesLogged: (state, action) => {
      state.routesLogged = action.payload;
    },
    setPermitsLogged: (state, action) => {
      state.permitsLogged = action.payload;
    },
  }
});




export const { setUserLogged, setRoleLogged, setRoutesLogged, setPermitsLogged } = loginSlice.actions;
export default loginSlice.reducer;
