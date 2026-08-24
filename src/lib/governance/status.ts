import type { ProposalStatus } from "~/lib/governance/types";

export interface VotingClosedInput {
  yesVotes: bigint;
  noVotes: bigint;
  earlyResolutionVoteThreshold: bigint | null;
  expirationSecs: bigint;
  nowSecs: bigint;
}

/**
 * Mirrors aptos_framework::voting::is_voting_closed: true once either
 * the early-resolution threshold is reached by yes or no votes, or the
 * voting period has ended.
 */
export function isVotingClosed(input: VotingClosedInput): boolean {
  const canResolveEarly =
    input.earlyResolutionVoteThreshold !== null &&
    (input.yesVotes >= input.earlyResolutionVoteThreshold ||
      input.noVotes >= input.earlyResolutionVoteThreshold);
  const votingPeriodOver = input.nowSecs >= input.expirationSecs;
  return canResolveEarly || votingPeriodOver;
}

export interface ProposalStatusInput extends VotingClosedInput {
  isResolved: boolean;
  minVoteThreshold: bigint;
}

/**
 * Derives the UI-facing ProposalStatus from on-chain facts. Mirrors
 * aptos_framework::voting::get_proposal_state (PENDING/SUCCEEDED/FAILED)
 * with is_resolved layered on top as the "executed" terminal state.
 * There is no on-chain "not started" or "expired" state to derive.
 */
export function deriveProposalStatus(
  input: ProposalStatusInput,
): ProposalStatus {
  if (input.isResolved) {
    return "executed";
  }
  if (!isVotingClosed(input)) {
    return "active";
  }
  const succeeded =
    input.yesVotes > input.noVotes &&
    input.yesVotes + input.noVotes >= input.minVoteThreshold;
  return succeeded ? "passed" : "failed";
}