import {useMemo} from "react";
import {useWallet as useAdapterWallet} from "@aptos-labs/wallet-adapter-react";
import {MaybeHexString, WalletNetworks} from "./context";

function normalizeNetworkName(networkName?: string | null): WalletNetworks {
  const normalized = networkName?.toLowerCase();
  if (normalized === "mainnet") return "mainnet";
  if (normalized === "testnet") return "testnet";
  if (normalized === "devnet") return "devnet";
  if (normalized === "local") return "local";
  return "mainnet";
}

export function useWallet() {
  const {
    connected,
    account,
    network,
    wallet,
    wallets,
    connect: connectAdapterWallet,
    disconnect: disconnectAdapterWallet,
  } = useAdapterWallet();

  const isInstalled = useMemo(() => wallets.length > 0, [wallets.length]);

  const isConnected = connected;
  const accountAddress: MaybeHexString | null =
    account?.address.toString() ?? null;
  const walletNetwork: WalletNetworks = normalizeNetworkName(network?.name);

  const connect = async () => {
    const walletName = wallet?.name ?? wallets[0]?.name;
    if (!walletName) return;
    await connectAdapterWallet(walletName);
  };

  const disconnect = async () => {
    await disconnectAdapterWallet();
  };

  return {
    isInstalled,
    isConnected,
    accountAddress,
    walletNetwork,
    connect,
    disconnect,
  };
}
