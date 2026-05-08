import {Aptos, AptosConfig, ClientConfig, Network} from "@aptos-labs/ts-sdk";

/** Resolves API key from env by network; used for fullnode auth to avoid rate limits. */
function getApiKey(networkName: string): string | undefined {
  const normalized = networkName.toLowerCase();
  if (normalized === "mainnet")
    return import.meta.env.VITE_APTOS_API_KEY_MAINNET;
  if (normalized === "testnet")
    return import.meta.env.VITE_APTOS_API_KEY_TESTNET;
  if (normalized === "devnet") return import.meta.env.VITE_APTOS_API_KEY_DEVNET;
  return import.meta.env.VITE_APTOS_API_KEY;
}

/** Map network id (e.g. mainnet, testnet, local) to SDK Network. */
export function getNetworkFromName(networkName: string): Network {
  const normalized = networkName.toLowerCase();
  if (normalized === "mainnet") return Network.MAINNET;
  if (normalized === "testnet") return Network.TESTNET;
  if (normalized === "devnet") return Network.DEVNET;
  if (normalized === "local") return Network.LOCAL;
  return Network.CUSTOM;
}

export function getAptosClient(networkName: string): Aptos {
  const network = getNetworkFromName(networkName);
  const apiKey = getApiKey(networkName);
  const fullnodeConfig: ClientConfig | undefined = apiKey
    ? {API_KEY: apiKey}
    : undefined;

  return new Aptos(
    new AptosConfig({
      network,
      fullnodeConfig,
    }),
  );
}
