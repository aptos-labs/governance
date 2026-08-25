import {Aptos, AptosConfig, Network} from "@aptos-labs/ts-sdk";
import {logResolvedApiKey, resolveApiConfig} from "~/lib/governance/api-config";

let cachedClient: Aptos | null = null;

/**
 * Returns a singleton Aptos SDK client configured for mainnet. Reads
 * APTOS_FULLNODE_URL as an optional override (confirmed AptosConfig
 * property: `fullnode`) — per design spec §9's "env vars for
 * fullnode/indexer endpoints with a sane mainnet default" requirement.
 * This override is also what Task 18's Playwright e2e test uses to
 * point at a local mock fullnode instead of real mainnet.
 * Safe to call from server functions and from client code — this
 * only wraps read/view/submit RPC calls, never private keys.
 *
 * API keys: Geomi (formerly Aptos Build / Aptos Labs Developer Portal)
 * keys are sent as `Authorization: Bearer`. A server key (`aptoslabs_…`)
 * is the right type for this SSR app. Legacy Vercel names such as
 * `VITE_APTOS_API_KEY_MAINNET` are still accepted so an existing
 * dashboard secret keeps working. Keys authenticate against Aptos Labs
 * hosted URLs — do not point fullnode/indexer at api.geomi.dev.
 */
export function getAptosClient(): Aptos {
  if (!cachedClient) {
    const config = resolveApiConfig();
    logResolvedApiKey(config);
    cachedClient = new Aptos(
      new AptosConfig({
        network: Network.MAINNET,
        fullnode: config.fullnodeUrl,
        clientConfig: config.apiKey ? {API_KEY: config.apiKey} : undefined,
      }),
    );
  }
  return cachedClient;
}

/** Resets the cached client — test-only, so each test run can point
 *  at a fresh mock server without leaking state across test files. */
export function resetAptosClientForTests(): void {
  cachedClient = null;
}

export const APTOS_GOVERNANCE_ADDRESS = "0x1";
export const GOVERNANCE_PROPOSAL_TYPE =
  "0x1::governance_proposal::GovernanceProposal" as const;
export const VOTING_FORUM_RESOURCE_TYPE =
  `0x1::voting::VotingForum<${GOVERNANCE_PROPOSAL_TYPE}>` as const;
export const VOTING_FORUM_PROPOSAL_VALUE_TYPE =
  `0x1::voting::Proposal<${GOVERNANCE_PROPOSAL_TYPE}>` as const;
