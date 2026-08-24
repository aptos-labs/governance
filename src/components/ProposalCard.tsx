// src/components/ProposalCard.tsx
import {Link} from "@tanstack/react-router";
import {MyVoteBadge} from "~/components/MyVoteBadge";
import {StatusBadge} from "~/components/StatusBadge";
import {VoteBar} from "~/components/VoteBar";
import {formatDurationCompact} from "~/lib/governance/format";
import type {ProposalListItem} from "~/lib/governance/types";

function describeTiming(proposal: ProposalListItem, nowSecs: bigint): string {
  switch (proposal.status) {
    case "active":
      return `ends in ${formatDurationCompact(proposal.expirationSecs - nowSecs)}`;
    case "executed":
      return proposal.resolutionTimeSecs
        ? `executed ${formatDurationCompact(nowSecs - proposal.resolutionTimeSecs)} ago`
        : "executed";
    case "passed":
      return "passed — awaiting execution";
    case "failed":
      return `voting ended ${formatDurationCompact(nowSecs - proposal.expirationSecs)} ago`;
  }
}

export function ProposalCard({
  proposal,
  nowSecs,
  myVote,
}: {
  proposal: ProposalListItem;
  nowSecs: bigint;
  myVote?: {shouldPass: boolean};
}) {
  const title = proposal.metadataResult.verified
    ? proposal.metadataResult.metadata.title
    : `Proposal #${proposal.proposalId}`;

  return (
    <Link
      to="/proposal/$proposalId"
      params={{proposalId: proposal.proposalId}}
      className="block rounded-xl border border-[var(--color-border-light)] bg-[var(--color-paper)] p-5 hover:border-[var(--color-border)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <StatusBadge status={proposal.status} />
            {myVote && <MyVoteBadge shouldPass={myVote.shouldPass} />}
            <span className="font-mono text-sm text-[var(--color-text-primary)] opacity-50">
              #{proposal.proposalId}
            </span>
          </div>
          <div className="truncate text-base font-semibold">{title}</div>
          <div className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            {describeTiming(proposal, nowSecs)}
            {!proposal.metadataResult.verified && (
              <span className="ml-2 font-semibold text-[var(--color-error)]">
                Metadata unverified
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <VoteBar
          yesVotes={proposal.yesVotes}
          noVotes={proposal.noVotes}
          minVoteThreshold={proposal.minVoteThreshold}
        />
      </div>
    </Link>
  );
}
