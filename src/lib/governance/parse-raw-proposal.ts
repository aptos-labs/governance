import {deriveProposalStatus} from "~/lib/governance/status";
import type {
  MetadataVerificationResult,
  ProposalListItem,
  RawProposal,
} from "~/lib/governance/types";

function findMetadataEntry(raw: RawProposal, key: string): string | null {
  const entry = raw.metadata.data.find((e) => e.key === key);
  return entry ? entry.value : null;
}

/** Hex-decodes a 0x-prefixed metadata_location value into its UTF-8 URL string. */
export function decodeMetadataLocation(hexValue: string): string {
  const clean = hexValue.startsWith("0x") ? hexValue.slice(2) : hexValue;
  return Buffer.from(clean, "hex").toString("utf8");
}

export interface ParsedProposalCore {
  proposalId: string;
  proposer: string;
  isResolved: boolean;
  creationTimeSecs: bigint;
  expirationSecs: bigint;
  resolutionTimeSecs: bigint | null;
  minVoteThreshold: bigint;
  earlyResolutionVoteThreshold: bigint | null;
  yesVotes: bigint;
  noVotes: bigint;
  executionHash: string;
  /** Decoded URL, ready to fetch — NOT the raw hex. */
  metadataLocation: string | null;
  /** Left as the raw on-chain hex string (hex-of-ASCII-hex-digest) —
   *  pass this directly to fetchAndVerifyProposalMetadata, which does
   *  its own decode. Do not pre-decode this one. */
  metadataHashHex: string | null;
}

/**
 * Converts the exact on-chain wire shape (RawProposal, all-string
 * numerics, confirmed against a real mainnet proposal) into typed
 * bigints, and extracts the metadata_location / metadata_hash fields.
 * Pure — no network access — so it's fully unit-testable.
 */
export function parseRawProposalCore(
  proposalId: string,
  raw: RawProposal,
): ParsedProposalCore {
  const metadataLocationHex = findMetadataEntry(raw, "metadata_location");
  const metadataHashHex = findMetadataEntry(raw, "metadata_hash");

  return {
    proposalId,
    proposer: raw.proposer,
    isResolved: raw.is_resolved,
    creationTimeSecs: BigInt(raw.creation_time_secs),
    expirationSecs: BigInt(raw.expiration_secs),
    resolutionTimeSecs:
      raw.is_resolved && raw.resolution_time_secs !== "0"
        ? BigInt(raw.resolution_time_secs)
        : null,
    minVoteThreshold: BigInt(raw.min_vote_threshold),
    earlyResolutionVoteThreshold:
      raw.early_resolution_vote_threshold.vec.length > 0
        ? BigInt(raw.early_resolution_vote_threshold.vec[0])
        : null,
    yesVotes: BigInt(raw.yes_votes),
    noVotes: BigInt(raw.no_votes),
    executionHash: raw.execution_hash,
    metadataLocation: metadataLocationHex
      ? decodeMetadataLocation(metadataLocationHex)
      : null,
    metadataHashHex,
  };
}

/**
 * Combines the parsed core fields with a resolved metadata verification
 * result and the current time to produce the final UI-facing
 * ProposalListItem, including its derived status.
 */
export function buildProposalListItem(
  core: ParsedProposalCore,
  metadataResult: MetadataVerificationResult,
  nowSecs: bigint,
): ProposalListItem {
  return {
    proposalId: core.proposalId,
    proposer: core.proposer,
    status: deriveProposalStatus({
      isResolved: core.isResolved,
      yesVotes: core.yesVotes,
      noVotes: core.noVotes,
      minVoteThreshold: core.minVoteThreshold,
      earlyResolutionVoteThreshold: core.earlyResolutionVoteThreshold,
      expirationSecs: core.expirationSecs,
      nowSecs,
    }),
    creationTimeSecs: core.creationTimeSecs,
    expirationSecs: core.expirationSecs,
    resolutionTimeSecs: core.resolutionTimeSecs,
    minVoteThreshold: core.minVoteThreshold,
    earlyResolutionVoteThreshold: core.earlyResolutionVoteThreshold,
    yesVotes: core.yesVotes,
    noVotes: core.noVotes,
    executionHash: core.executionHash,
    metadataLocation: core.metadataLocation,
    metadataHashHex: core.metadataHashHex,
    metadataResult,
  };
}
