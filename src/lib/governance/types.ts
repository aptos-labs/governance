/**
 * Derived status — NOT an on-chain enum. The real framework
 * (aptos_framework::voting::get_proposal_state) only returns
 * PENDING/SUCCEEDED/FAILED, plus a separate `is_resolved` bool.
 * There is no "not yet started" or "expired" state: voting opens
 * immediately at proposal creation. This union is the UI-facing
 * lifecycle derived from those on-chain facts (see status.ts):
 *   active   -> voting still open
 *   passed   -> voting closed, succeeded, awaiting execution
 *   executed -> is_resolved === true
 *   failed   -> voting closed, did not meet threshold
 */
export type ProposalStatus = "active" | "passed" | "executed" | "failed";

/** One key/value entry in the on-chain SimpleMap<String, vector<u8>> metadata map. */
export interface RawProposalMetadataEntry {
  key: string;
  /** Hex-encoded (0x-prefixed) raw bytes. */
  value: string;
}

/**
 * Exact shape returned by:
 * POST /v1/tables/:votingForumHandle/item
 * with value_type "0x1::voting::Proposal<0x1::governance_proposal::GovernanceProposal>"
 *
 * Confirmed against a real mainnet proposal on 2026-08-20 — every
 * numeric field is a decimal string on the wire.
 */
export interface RawProposal {
  proposer: string;
  execution_content: {vec: Array<{dummy_field: boolean}>};
  metadata: {data: RawProposalMetadataEntry[]};
  creation_time_secs: string;
  execution_hash: string;
  min_vote_threshold: string;
  expiration_secs: string;
  early_resolution_vote_threshold: {vec: string[]};
  yes_votes: string;
  no_votes: string;
  is_resolved: boolean;
  resolution_time_secs: string;
}

/** Off-chain metadata JSON fetched from `metadata_location`, after hash verification. */
export interface ProposalMetadata {
  title: string;
  description: string;
  source_code_url: string;
  discussion_url: string;
}

/** Result of fetching + verifying a proposal's off-chain metadata. */
export type MetadataVerificationResult =
  | {verified: true; metadata: ProposalMetadata}
  | {verified: false; reason: string; rawText?: string};

/** Normalized proposal shape the UI actually renders. */
export interface ProposalListItem {
  proposalId: string;
  proposer: string;
  status: ProposalStatus;
  creationTimeSecs: bigint;
  expirationSecs: bigint;
  resolutionTimeSecs: bigint | null;
  minVoteThreshold: bigint;
  earlyResolutionVoteThreshold: bigint | null;
  yesVotes: bigint;
  noVotes: bigint;
  executionHash: string;
  metadataLocation: string | null;
  metadataHashHex: string | null;
  metadataResult: MetadataVerificationResult;
}

export type PoolKind = "stake_pool" | "delegation_pool";

/** A pool the connected address can vote through, with its current standing on one proposal. */
export interface EligiblePool {
  poolAddress: string;
  poolKind: PoolKind;
  /** Remaining voting power this pool can still cast on the proposal in question. */
  remainingVotingPower: bigint;
  /** True if this pool has already used all its voting power on this proposal. */
  hasEntirelyVoted: boolean;
}
