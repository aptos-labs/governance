import {useWallet} from "@aptos-labs/wallet-adapter-react";
import {useQuery} from "@tanstack/react-query";
import {createFileRoute, Link, useNavigate} from "@tanstack/react-router";
import {z} from "zod";
import {AddressChip} from "~/components/AddressChip";
import {ContentRow} from "~/components/ContentRow";
import {HeroDivider} from "~/components/HeroDivider";
import {MetadataVerifiedNotice} from "~/components/MetadataVerifiedNotice";
import {MyVoteBadge} from "~/components/MyVoteBadge";
import {PaginationBar} from "~/components/PaginationBar";
import {StatusLabel} from "~/components/StatusIcon";
import {VoteBar} from "~/components/VoteBar";
import {VotingPanel} from "~/components/VotingPanel";
import {fetchMyVotes} from "~/lib/governance/fetch-my-votes";
import {getProposalDetail} from "~/lib/governance/fetch-proposal";
import {PROPOSAL_VOTES_PAGE_SIZE} from "~/lib/governance/fetch-proposal-votes";
import {
  formatDurationCompact,
  formatOctasToApt,
  formatTimestamp,
} from "~/lib/governance/format";
import {listProposalVotes} from "~/lib/governance/list-proposal-votes";
import {isNavigableHttpUrl} from "~/lib/governance/urls";

const searchSchema = z.object({
  votesPage: z.number().int().min(0).catch(0),
});

export const Route = createFileRoute("/proposal/$proposalId")({
  validateSearch: searchSchema,
  loaderDeps: ({search}) => ({votesPage: search.votesPage}),
  loader: ({params, deps}) =>
    getProposalDetail({
      data: {proposalId: params.proposalId, votesPage: deps.votesPage},
    }),
  component: ProposalDetail,
});

function ProposalDetail() {
  const initialData = Route.useLoaderData();
  const {proposalId} = Route.useParams();
  const {votesPage} = Route.useSearch();
  const navigate = useNavigate({from: "/proposal/$proposalId"});

  const {data} = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => getProposalDetail({data: {proposalId, votesPage: 0}}),
    initialData,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const votesQuery = useQuery({
    queryKey: ["proposal-votes", proposalId, votesPage],
    queryFn: () => listProposalVotes({data: {proposalId, page: votesPage}}),
    initialData:
      votesPage === initialData.votes.page
        ? {
            items: initialData.votes.items.map((vote) => ({
              stakingPoolAddress: vote.stakingPoolAddress,
              shouldPass: vote.shouldPass,
              numVotes: vote.numVotes.toString(),
            })),
            totalCount: initialData.votes.totalCount,
            page: initialData.votes.page,
            pageSize: initialData.votes.pageSize,
          }
        : undefined,
    placeholderData: (previous) => previous,
    staleTime: 20_000,
  });

  const {proposal} = data;
  const votes = votesQuery.data;
  const nowSecs = BigInt(Math.floor(Date.now() / 1000));
  const title = proposal.metadataResult.verified
    ? proposal.metadataResult.metadata.title
    : `Proposal #${proposal.proposalId}`;

  const remaining =
    proposal.status === "active"
      ? formatDurationCompact(proposal.expirationSecs - nowSecs)
      : null;

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
  const sourceUrl = proposal.metadataResult.verified
    ? proposal.metadataResult.metadata.source_code_url
    : null;
  const discussionUrl = proposal.metadataResult.verified
    ? proposal.metadataResult.metadata.discussion_url
    : null;

  const hasVotes =
    (votes?.totalCount ?? 0) > 0 || (votes?.items.length ?? 0) > 0;

  return (
    <main>
      <Link
        to="/"
        search={{page: 0, status: "all"}}
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-info)] hover:underline"
      >
        ← Back
      </Link>

      <h2 className="text-3xl font-light">Proposal</h2>
      <HeroDivider />

      <div className="mt-2 grid gap-6 md:grid-cols-12">
        <div className="md:col-span-8">
          <h1 className="text-xl font-light sm:text-2xl">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusLabel status={proposal.status} />
            {proposal.resolutionTimeSecs && (
              <span className="text-sm text-[#a3a3a3]">
                {formatTimestamp(proposal.resolutionTimeSecs)}
              </span>
            )}
          </div>
        </div>
        {remaining && (
          <div className="md:col-span-4 md:text-right">
            <p className="text-sm uppercase tracking-wide text-[var(--color-text-secondary)]">
              Time remaining
            </p>
            <p className="text-3xl font-light text-[var(--color-accent)]">
              {remaining}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 border-y border-dotted border-[var(--color-border)] py-3">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm uppercase text-[#a3a3a3]">Proposer:</span>
            <AddressChip address={proposal.proposer} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#a3a3a3]">
            <span className="uppercase">Voting period:</span>
            <span>
              {formatTimestamp(proposal.creationTimeSecs)}
              {" - "}
              {formatTimestamp(proposal.expirationSecs)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-8 md:pr-6">
          <ContentRow title="Proposal Hash">
            {proposal.executionHash}
          </ContentRow>
          {proposal.metadataResult.verified ? (
            <>
              {isNavigableHttpUrl(sourceUrl) && (
                <ContentRow title="Source Code" href={sourceUrl}>
                  LINK TO SOURCE CODE
                </ContentRow>
              )}
              <ContentRow title="Description">
                <p className="whitespace-pre-wrap">
                  {proposal.metadataResult.metadata.description}
                </p>
              </ContentRow>
              {isNavigableHttpUrl(discussionUrl) && (
                <ContentRow title="Discussion" href={discussionUrl}>
                  LINK TO DISCUSSION
                </ContentRow>
              )}
            </>
          ) : (
            <MetadataVerifiedNotice result={proposal.metadataResult} />
          )}
        </div>

        <div className="md:col-span-4">
          <div className="relative">
            <div className="absolute top-2 -left-2 -z-10 h-full w-full rounded border border-gray-500" />
            <div className="space-y-6 rounded border border-gray-500 bg-[var(--color-canvas)] p-6">
              <section>
                <h3 className="mb-3 text-lg font-light">Vote</h3>
                <VotingPanel proposalId={proposal.proposalId} />
              </section>
              <div className="border-t border-dotted border-[var(--color-border)]" />
              <section>
                <h3 className="mb-3 text-lg font-light">Results</h3>
                <VoteBar
                  yesVotes={proposal.yesVotes}
                  noVotes={proposal.noVotes}
                  minVoteThreshold={proposal.minVoteThreshold}
                />
                {proposal.earlyResolutionVoteThreshold && (
                  <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                    Early resolution at{" "}
                    {formatOctasToApt(proposal.earlyResolutionVoteThreshold, 0)}{" "}
                    APT
                  </p>
                )}
              </section>
              {myVote && (
                <>
                  <div className="border-t border-dotted border-[var(--color-border)]" />
                  <section>
                    <h3 className="mb-2 text-lg font-light">Your vote</h3>
                    <MyVoteBadge shouldPass={myVote.shouldPass} />
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      {formatOctasToApt(BigInt(myVote.amountOctas), 4)} APT
                      {myVote.poolAddresses.length === 1
                        ? " via one pool"
                        : ` across ${myVote.poolAddresses.length} pools`}
                    </p>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-12 max-w-4xl">
        <h2 className="text-3xl font-light">Votes</h2>
        {!hasVotes ? (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            No votes recorded yet, or the indexer is temporarily unavailable —
            the tally above reflects the authoritative on-chain count either
            way.
          </p>
        ) : (
          <>
            <div className="mt-3 w-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-text-secondary)]">
                    <th className="px-3 py-2 font-normal uppercase tracking-wide">
                      address
                    </th>
                    <th className="px-3 py-2 font-normal uppercase tracking-wide">
                      vote
                    </th>
                    <th className="px-3 py-2 text-right font-normal uppercase tracking-wide">
                      voting power
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(votes?.items ?? []).map((vote) => (
                    <tr
                      key={vote.stakingPoolAddress}
                      className="border-t border-[var(--color-border-light)] bg-[var(--color-paper)]"
                    >
                      <td className="min-w-[200px] px-3 py-2">
                        <AddressChip address={vote.stakingPoolAddress} />
                      </td>
                      <td className="px-3 py-2">
                        {vote.shouldPass ? "FOR" : "AGAINST"}
                      </td>
                      <td
                        className="px-3 py-2 text-right"
                        title={`${formatOctasToApt(BigInt(vote.numVotes), 8)} APT`}
                      >
                        {formatOctasToApt(BigInt(vote.numVotes))} APT
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar
              page={votesPage}
              totalCount={votes?.totalCount ?? 0}
              pageSize={votes?.pageSize || PROPOSAL_VOTES_PAGE_SIZE}
              onPageChange={(nextPage) =>
                navigate({
                  params: {proposalId},
                  search: {votesPage: nextPage},
                })
              }
            />
          </>
        )}
      </section>
    </main>
  );
}
