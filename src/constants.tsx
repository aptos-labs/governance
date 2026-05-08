/**
 * Network
 * RPC/GraphQL URLs are resolved by SDK and useGraphqlClient from network name; no URL map needed.
 */
const NETWORK_NAMES = ["mainnet", "testnet", "devnet", "local"] as const;
export type NetworkName = (typeof NETWORK_NAMES)[number];
export const defaultNetworkName: NetworkName = "mainnet";

/** Ordered list of supported network ids for dropdowns and validation. */
export {NETWORK_NAMES};

/**
 * Feature
 */
export const features = {
  prod: "Production Mode",
  dev: "Development Mode",
};

export type FeatureName = keyof typeof features;

// Remove trailing slashes
for (const key of Object.keys(features)) {
  const featureName = key as FeatureName;
  if (features[featureName].endsWith("/")) {
    features[featureName] = features[featureName].slice(0, -1);
  }
}

export const defaultFeatureName: FeatureName = "prod" as const;

if (!(defaultFeatureName in features)) {
  throw `defaultFeatureName '${defaultFeatureName}' not in Features!`;
}

export const defaultFeature = features[defaultFeatureName];

/**
 * Wallet
 */
export const installWalletUrl =
  "https://chrome.google.com/webstore/detail/petra-aptos-wallet/ejjladinnckdgjemekebdpeokbikhfci";

export const explorerUrl = "https://explorer.aptoslabs.com";

export const defaultProposalErrorMessage = "Proposal not found";
