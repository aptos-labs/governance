import {Link, useNavigate} from "@tanstack/react-router";
import {AddressChip} from "~/components/AddressChip";
import {MyVoteBadge} from "~/components/MyVoteBadge";
import {StatusLabel} from "~/components/StatusIcon";
import {formatTimestamp, truncateAddress} from "~/lib/governance/format";
import type {ProposalListItem} from "~/lib/governance/types";

function proposalTitle(proposal: ProposalListItem): string {
  return proposal.metadataResult.verified
    ? proposal.metadataResult.metadata.title
    : `Proposal #${proposal.proposalId}`;
}

function UnverifiedNote({reason}: {reason: string}) {
  return (
    <p
      className="mt-0.5 truncate text-xs font-semibold text-[var(--color-error)]"
      title={reason}
    >
      Metadata unverified
    </p>
  );
}

export function ProposalsTable({
  proposals,
  myVotes,
}: {
  proposals: ProposalListItem[];
  myVotes?: Record<string, {shouldPass: boolean}>;
}) {
  return (
    <>
      <div data-testid="proposals-table" className="hidden w-full xl:block">
        <table className="gov-table w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
          </colgroup>
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
      <div data-testid="proposals-mobile-list" className="space-y-3 xl:hidden">
        {proposals.map((proposal) => (
          <ProposalMobileCard
            key={proposal.proposalId}
            proposal={proposal}
            myVote={myVotes?.[proposal.proposalId]}
          />
        ))}
      </div>
    </>
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
  const title = proposalTitle(proposal);

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
      <td>
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate font-normal text-[var(--color-title)]">
            {title}
          </span>
          {myVote && (
            <span className="shrink-0">
              <MyVoteBadge shouldPass={myVote.shouldPass} />
            </span>
          )}
        </div>
        {!proposal.metadataResult.verified && (
          <UnverifiedNote reason={proposal.metadataResult.reason} />
        )}
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

function ProposalMobileCard({
  proposal,
  myVote,
}: {
  proposal: ProposalListItem;
  myVote?: {shouldPass: boolean};
}) {
  const title = proposalTitle(proposal);

  return (
    <Link
      to="/proposal/$proposalId"
      params={{proposalId: proposal.proposalId}}
      search={{votesPage: 0}}
      className="block rounded-lg bg-[var(--color-paper)] p-4"
    >
      <div className="flex items-start gap-2">
        <h3 className="min-w-0 flex-1 truncate font-normal text-[var(--color-title)]">
          {title}
        </h3>
        {myVote && (
          <span className="shrink-0">
            <MyVoteBadge shouldPass={myVote.shouldPass} />
          </span>
        )}
      </div>
      {!proposal.metadataResult.verified && (
        <UnverifiedNote reason={proposal.metadataResult.reason} />
      )}
      <div className="mt-3">
        <StatusLabel status={proposal.status} />
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <MobileField label="Proposer">
          <span className="font-mono">
            {truncateAddress(proposal.proposer)}
          </span>
        </MobileField>
        <MobileField label="Voting Start">
          {formatTimestamp(proposal.creationTimeSecs)}
        </MobileField>
        <MobileField label="Voting End">
          {formatTimestamp(proposal.expirationSecs)}
        </MobileField>
        <MobileField label="Execution">
          {formatTimestamp(proposal.resolutionTimeSecs)}
        </MobileField>
      </dl>
    </Link>
  );
}

function MobileField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
        {label}
      </dt>
      <dd className="truncate">{children}</dd>
    </div>
  );
}
