import {createContext, Dispatch, useContext} from "react";
import {NetworkName, networks, defaultNetworkName} from "../../constants";

const selected_network = safeGetSelectedNetworkName();

function safeGetSelectedNetworkName(): NetworkName {
  let selected_network = localStorage.getItem("selected_network");
  if (selected_network) {
    selected_network = selected_network.toLowerCase();
    if (selected_network in networks) {
      return selected_network as NetworkName;
    }
  }
  return defaultNetworkName;
}

export type GlobalState = {
  network_name: NetworkName;
  network_value: string;
};

export const defaultGlobalState: GlobalState = {
  network_name: selected_network,
  network_value: networks[selected_network],
};

export const GlobalStateContext = createContext(defaultGlobalState);
export const DispatchStateContext = createContext<Dispatch<GlobalState>>(
  (value: GlobalState) => value,
);

export const useGlobalState = (): [GlobalState, Dispatch<GlobalState>] => [
  useContext(GlobalStateContext),
  useContext(DispatchStateContext),
];
