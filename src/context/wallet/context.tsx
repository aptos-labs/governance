import {createContext, useContext} from "react";

export type MaybeHexString = string;

export interface walletContext {
  isInstalled: boolean;
  isConnected: boolean;
  walletNetwork: WalletNetworks;
  accountAddress: MaybeHexString | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export const walletContext = createContext<walletContext | null>(null);

export const useWalletContext = () => {
  const context = useContext(walletContext) as walletContext;

  if (!context) {
    throw new Error("useWalletContext must be used within a walletContext");
  }
  return context;
};

export type WalletNetworks = "mainnet" | "testnet" | "devnet" | "local";
