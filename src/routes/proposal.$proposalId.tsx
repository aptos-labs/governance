import {useWallet} from "@aptos-labs/wallet-adapter-react";
import {useQuery} from "@tanstack/react-query";
import {createFileRoute, Link} from "@tanstack/react-router";
import {MetadataVerifiedNotice} from "~/components/MetadataVerifiedNotice";
import {MyVoteBadge} from "~/components/MyVoteBadge";
import {StatusBadge} from "~/components/StatusBadge";
import {VoteBar} from "~/components/VoteBar";
import {VotingPanel} from "~/components/VotingPanel";
import {fetchMyVotes} from "~/lib/governance/fetch-my-votes";
import {getProposalDetail} from "~/lib/governance/fetch-proposal";
import {PROPOSAL_VOTES_PAGE_SIZE} from "~/lib/governance/fetch-proposal-votes";
import {
  formatDurationCompact,
  formatOctasToApt,
  truncateAddress,
} from "~/lib/governance/format";

export const Route = createFileRoute("/proposal/$proposalId")({
  loader: ({params}) =>
    getProposalDetail({data: {proposalId: params.proposalId}}),
  component: ProposalDetail,
});

function ProposalDetail() {
  const initialData = Route.useLoaderData();
  const {proposalId} = Route.useParams();

  const {data} = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => getProposalDetail({data: {proposalId}}),
    initialData,
    refetchInterval: 30_000,
  });

  const {proposal, votes} = data;
  const nowSecs = BigInt(Math.floor(Date.now() / 1000));
  const title = proposal.metadataResult.verified
    ? proposal.metadataResult.metadata.title
    : `Proposal #${proposal.proposalId}`;

  const {connected, account} = useWallet();

  const myVotesQuery = useQuery({
    queryKey: ["my-votes", account?.address?.toString(), proposalId],
    queryFn: () =>
      fetchMyVotes({
        data: {
          voterAddress: account!.address.toString(),
          proposalIds: [proposalId],
        },
      }),
    enabled: connected && !!account,
    staleTime: 30_000,
  });

  const myVote = myVotesQuery.data?.[proposalId];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/"
        search={{page: 0, status: "all"}}
        className="text-sm text-[var(--color-text-secondary)] underline"
      >
        ← All proposals
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <StatusBadge status={proposal.status} />
        <span className="font-mono text-sm opacity-50">
          #{proposal.proposalId}
        </span>
      </div>
      <h1 className="mt-1 font-serif text-3xl font-semibold">{title}</h1>

      <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Proposed by{" "}
        <a
          href={`https://explorer.aptoslabs.com/account/${proposal.proposer}?network=mainnet`}
          target="_blank"
          rel="noreferrer noopener"
          className="underline"
        >
          {truncateAddress(proposal.proposer)}
        </a>
        {proposal.status === "active" &&
          ` · ends in ${formatDurationCompact(proposal.expirationSecs - nowSecs)}`}
      </div>

      <section className="mt-6">
        <MetadataVerifiedNotice result={proposal.metadataResult} />
      </section>

      {myVote && (
        <section className="mt-6 rounded-xl border border-[var(--color-border-light)] p-5">
          <h2 className="font-serif text-lg font-semibold">My vote</h2>
          <div className="mt-2 flex items-center gap-2">
            <MyVoteBadge shouldPass={myVote.shouldPass} />
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {formatOctasToApt(BigInt(myVote.amountOctas), 4)} APT
            {myVote.poolAddresses.length === 1
              ? ` via ${truncateAddress(myVote.poolAddresses[0])}`
              : ` across ${myVote.poolAddresses.length} pools`}
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold">Votes</h2>
        <div className="mt-3">
          <VoteBar
            yesVotes={proposal.yesVotes}
            noVotes={proposal.noVotes}
            minVoteThreshold={proposal.minVoteThreshold}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          Minimum vote threshold:{" "}
          {formatOctasToApt(proposal.minVoteThreshold, 0)} APT
          {proposal.earlyResolutionVoteThreshold &&
            ` · Early resolution at ${formatOctasToApt(proposal.earlyResolutionVoteThreshold, 0)} APT`}
        </p>
      </section>

      <section className="mt-8 rounded-xl border border-[var(--color-border-light)] p-5">
        <VotingPanel proposalId={proposal.proposalId} />
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold">Voter breakdown</h2>
        {votes.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            No votes recorded yet, or the indexer is temporarily unavailable —
            the tally above reflects the authoritative on-chain count either
            way.
          </p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-secondary)]">
                <th className="pb-2 font-normal">Pool</th>
                <th className="pb-2 font-normal">Direction</th>
                <th className="pb-2 pr-0 text-right font-normal">
                  Voting power
                </th>
              </tr>
            </thead>
            <tbody>
              {votes.map((vote) => (
                <tr
                  key={vote.stakingPoolAddress}
                  className="border-t border-[var(--color-border-light)]"
                >
                  <td className="py-2 font-mono">
                    {truncateAddress(vote.stakingPoolAddress)}
                  </td>
                  <td className="py-2">
                    {vote.shouldPass ? "For" : "Against"}
                  </td>
                  <td className="py-2 text-right">
                    {formatOctasToApt(vote.numVotes)} APT
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {votes.length === PROPOSAL_VOTES_PAGE_SIZE && (
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Showing the first {PROPOSAL_VOTES_PAGE_SIZE} voters by power —
            pagination beyond this page is not yet implemented.
          </p>
        )}
      </section>
    </main>
  );
}
