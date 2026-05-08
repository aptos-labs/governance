import {createContext, Dispatch, useContext} from "react";
import {NetworkName, NETWORK_NAMES, defaultNetworkName} from "../../constants";

const selected_network = safeGetSelectedNetworkName();

function safeGetSelectedNetworkName(): NetworkName {
  const stored = localStorage.getItem("selected_network");
  if (stored) {
    const lower = stored.toLowerCase();
    const key = NETWORK_NAMES.find((k) => k.toLowerCase() === lower);
    if (key) return key;
  }
  return defaultNetworkName;
}

export type GlobalState = {
  /** Current network id (lowercase), e.g. mainnet, testnet, devnet, local. */
  network_name: NetworkName;
};

export const defaultGlobalState: GlobalState = {
  network_name: selected_network,
};

export const GlobalStateContext = createContext(defaultGlobalState);
export const DispatchStateContext = createContext<Dispatch<GlobalState>>(
  (value: GlobalState) => value,
);

export const useGlobalState = (): [GlobalState, Dispatch<GlobalState>] => [
  useContext(GlobalStateContext),
  useContext(DispatchStateContext),
];
