import {ReactNode, useReducer} from "react";
import {
  defaultGlobalState,
  DispatchStateContext,
  GlobalState,
  GlobalStateContext,
} from "./context";

function reducer(state: GlobalState, newValue: GlobalState): GlobalState {
  localStorage.setItem("selected_network", newValue.network_name.toLowerCase());
  return {...state, ...newValue};
}

export const GlobalStateProvider = ({children}: {children: ReactNode}) => {
  const [state, dispatch] = useReducer(reducer, defaultGlobalState);
  return (
    <GlobalStateContext.Provider value={state}>
      <DispatchStateContext.Provider value={dispatch}>
        {children}
      </DispatchStateContext.Provider>
    </GlobalStateContext.Provider>
  );
};
