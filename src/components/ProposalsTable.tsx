import {useNavigate} from "@tanstack/react-router";
import {AddressChip} from "~/components/AddressChip";
import {MyVoteBadge} from "~/components/MyVoteBadge";
import {StatusLabel} from "~/components/StatusIcon";
import {formatTimestamp} from "~/lib/governance/format";
import type {ProposalListItem} from "~/lib/governance/types";

export function ProposalsTable({
  proposals,
  myVotes,
}: {
  proposals: ProposalListItem[];
  myVotes?: Record<string, {shouldPass: boolean}>;
}) {
  return (
    <div className="w-auto overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-[var(--color-text-secondary)]">
            <th className="px-3 py-2 font-normal uppercase tracking-wide">
              Title
            </th>
            <th className="px-3 py-2 font-normal uppercase tracking-wide">
              Status
            </th>
            <th className="px-3 py-2 font-normal uppercase tracking-wide">
              Proposer
            </th>
            <th className="px-3 py-2 font-normal uppercase tracking-wide">
              Voting Start Date
            </th>
            <th className="px-3 py-2 font-normal uppercase tracking-wide">
              Voting End Date
            </th>
            <th className="px-3 py-2 text-right font-normal uppercase tracking-wide">
              Execution Date
            </th>
          </tr>
        </thead>
        <tbody>
          {proposals.map((proposal) => (
            <ProposalRow
              key={proposal.proposalId}
              proposal={proposal}
              myVote={myVotes?.[proposal.proposalId]}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProposalRow({
  proposal,
  myVote,
}: {
  proposal: ProposalListItem;
  myVote?: {shouldPass: boolean};
}) {
  const navigate = useNavigate();
  const title = proposal.metadataResult.verified
    ? proposal.metadataResult.metadata.title
    : `Proposal #${proposal.proposalId}`;

  return (
    <tr
      className="cursor-pointer border-t border-[var(--color-border-light)] bg-[var(--color-paper)] hover:bg-[var(--color-row-hover)]"
      onClick={() =>
        navigate({
          to: "/proposal/$proposalId",
          params: {proposalId: proposal.proposalId},
          search: {votesPage: 0},
        })
      }
    >
      <td className="max-w-xs px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-[var(--color-info)]">
            {title}
          </span>
          {myVote && <MyVoteBadge shouldPass={myVote.shouldPass} />}
        </div>
      </td>
      <td className="px-3 py-3">
        <StatusLabel status={proposal.status} />
      </td>
      <td className="px-3 py-3">
        <AddressChip address={proposal.proposer} />
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-[var(--color-text-secondary)]">
        {formatTimestamp(proposal.creationTimeSecs)}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-[var(--color-text-secondary)]">
        {formatTimestamp(proposal.expirationSecs)}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-right text-[var(--color-text-secondary)]">
        {formatTimestamp(proposal.resolutionTimeSecs)}
      </td>
    </tr>
  );
}
