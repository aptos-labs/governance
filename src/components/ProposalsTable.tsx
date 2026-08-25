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
      <table className="gov-table min-w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Title</th>
            <th>Status</th>
            <th>Proposer</th>
            <th>Voting Start Date</th>
            <th>Voting End Date</th>
            <th className="text-right">Execution Date</th>
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
      onClick={() =>
        navigate({
          to: "/proposal/$proposalId",
          params: {proposalId: proposal.proposalId},
          search: {votesPage: 0},
        })
      }
    >
      <td className="max-w-[400px]">
        <div className="flex items-center gap-2">
          <span className="block max-w-[400px] truncate font-normal text-[var(--color-title)]">
            {title}
          </span>
          {myVote && <MyVoteBadge shouldPass={myVote.shouldPass} />}
        </div>
      </td>
      <td>
        <StatusLabel status={proposal.status} />
      </td>
      <td>
        <AddressChip address={proposal.proposer} />
      </td>
      <td>{formatTimestamp(proposal.creationTimeSecs)}</td>
      <td>{formatTimestamp(proposal.expirationSecs)}</td>
      <td className="text-right">
        {formatTimestamp(proposal.resolutionTimeSecs)}
      </td>
    </tr>
  );
}
