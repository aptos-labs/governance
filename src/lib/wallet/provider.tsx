// src/lib/wallet/provider.tsx

import {Network} from "@aptos-labs/ts-sdk";
import {AptosWalletAdapterProvider} from "@aptos-labs/wallet-adapter-react";
import {ClientOnly} from "@tanstack/react-router";
import type {ReactNode} from "react";

/**
 * AIP-62 wallet discovery runs entirely client-side (window event
 * listeners / navigator checks). ClientOnly guarantees this subtree
 * never executes during SSR — the server never touches wallet APIs,
 * per design spec §4. The fallback renders nothing extra during SSR
 * and initial hydration; children (route content) still render via
 * the fallback slot so pages aren't blank while wallet discovery boots.
 */
export function AppWalletProvider({children}: {children: ReactNode}) {
  return (
    <ClientOnly fallback={<>{children}</>}>
      <AptosWalletAdapterProvider
        autoConnect
        dappConfig={{network: Network.MAINNET}}
        onError={(error) => {
          // Non-fatal: connection/signing errors surface inline in the
          // components that triggered them (WalletConnectButton,
          // VotingPanel) — this is a last-resort console log only.
          console.error("[wallet-adapter]", error);
        }}
      >
        {children}
      </AptosWalletAdapterProvider>
    </ClientOnly>
  );
}
