import {Aptos, AptosConfig, Network} from "@aptos-labs/ts-sdk";

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
 */
export function getAptosClient(): Aptos {
  if (!cachedClient) {
    cachedClient = new Aptos(
      new AptosConfig({
        network: Network.MAINNET,
        fullnode: process.env.APTOS_FULLNODE_URL || undefined,
        clientConfig: process.env.APTOS_BUILD_API_KEY
          ? {API_KEY: process.env.APTOS_BUILD_API_KEY}
          : undefined,
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
