import {AptosWalletAdapterProvider} from "@aptos-labs/wallet-adapter-react";
import {Network} from "@aptos-labs/ts-sdk";
import {ReactNode, useMemo} from "react";
import {useGlobalState} from "../globalState";

function mapNetworkName(networkName: string): Network {
  const normalized = networkName.toLowerCase();
  if (normalized === "mainnet") return Network.MAINNET;
  if (normalized === "testnet") return Network.TESTNET;
  if (normalized === "devnet") return Network.DEVNET;
  if (normalized === "local") return Network.LOCAL;
  return Network.CUSTOM;
}

export function WalletAdapterProvider({children}: {children: ReactNode}) {
  const [state] = useGlobalState();
  const dappConfig = useMemo(
    () => ({network: mapNetworkName(state.network_name)}),
    [state.network_name],
  );

  return (
    <AptosWalletAdapterProvider autoConnect dappConfig={dappConfig}>
      {children}
    </AptosWalletAdapterProvider>
  );
}
