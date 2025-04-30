import {AptosClient} from "aptos";

/**
 * Use this function to get the config for the AptosClient. To avoid having to change
 * the code too much, we derive which network we're dealing with by looking at the
 * URL for the node API (rather than passing around a `Network`).
 */
export function getConfig(
  network_value: string,
): ConstructorParameters<typeof AptosClient>[1] {
  return {
    TOKEN: getApiKey(network_value),
  };
}

function getApiKey(network_value: string): string | undefined {
  if (network_value.includes("mainnet")) {
    return "AG-JJUCSHK3XMWV3XFNH7LZ7AMPCKYDLWW9Y";
  }
  if (network_value.includes("testnet")) {
    return "AG-KMOTRHDA8GPQHMT9NNEF5NK1ONSRV327V";
  }
  if (network_value.includes("devnet")) {
    return "AG-HR9VQNGZFUEKBCPWMH1OXC669PEXDZB3O";
  }
  return undefined;
}
