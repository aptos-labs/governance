import type {ProposalListItem} from "~/lib/governance/types";

export function proposalToJson(proposal: ProposalListItem) {
  return {
    proposalId: proposal.proposalId,
    proposer: proposal.proposer,
    status: proposal.status,
    creationTimeSecs: proposal.creationTimeSecs.toString(),
    expirationSecs: proposal.expirationSecs.toString(),
    resolutionTimeSecs: proposal.resolutionTimeSecs?.toString() ?? null,
    minVoteThreshold: proposal.minVoteThreshold.toString(),
    earlyResolutionVoteThreshold:
      proposal.earlyResolutionVoteThreshold?.toString() ?? null,
    yesVotes: proposal.yesVotes.toString(),
    noVotes: proposal.noVotes.toString(),
    executionHash: proposal.executionHash,
    metadataLocation: proposal.metadataLocation,
    metadataHashHex: proposal.metadataHashHex,
    metadataVerified: proposal.metadataResult.verified,
    metadata: proposal.metadataResult.verified
      ? proposal.metadataResult.metadata
      : null,
    metadataReason: proposal.metadataResult.verified
      ? null
      : proposal.metadataResult.reason,
  };
}
