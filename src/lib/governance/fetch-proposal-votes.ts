import {executeIndexerQuery} from "~/lib/governance/indexer-client";
import {pageOffset} from "~/lib/governance/pagination";
import {votesCache} from "~/lib/governance/server-cache";

export interface ProposalVoteRow {
  stakingPoolAddress: string;
  shouldPass: boolean;
  numVotes: bigint;
}

export interface ProposalVotesPage {
  items: ProposalVoteRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface ProposalVotesQueryResult {
  proposal_votes: Array<{
    staking_pool_address: string;
    should_pass: boolean;
    num_votes: string;
  }>;
  proposal_votes_aggregate?: {
    aggregate: {count: number} | null;
  };
}

const PROPOSAL_VOTES_QUERY = `
  query ProposalVotes($proposalId: bigint, $limit: Int, $offset: Int) {
    proposal_votes(
      where: { proposal_id: { _eq: $proposalId } }
      order_by: { num_votes: desc }
      limit: $limit
      offset: $offset
    ) {
      staking_pool_address
      should_pass
      num_votes
    }
    proposal_votes_aggregate(where: { proposal_id: { _eq: $proposalId } }) {
      aggregate {
        count
      }
    }
  }
`;

/** Matches the original governance UI's votes table page size. */
export const PROPOSAL_VOTES_PAGE_SIZE = 20;

/**
 * Fetches the paginated per-pool vote breakdown for one proposal.
 * Uses only the four columns (proposal_id, staking_pool_address,
 * should_pass, num_votes) confirmed against the official governance
 * reference app's own query — see the risk note on Task 6 above about
 * this table's absence from the public indexer schema reference.
 */
export async function fetchProposalVotes(
  proposalId: string,
  limit = PROPOSAL_VOTES_PAGE_SIZE,
  offset = 0,
): Promise<ProposalVoteRow[]> {
  const page = await fetchProposalVotesPage(proposalId, {
    page: Math.floor(offset / limit),
    pageSize: limit,
  });
  return page.items;
}

export async function fetchProposalVotesPage(
  proposalId: string,
  options: {page?: number; pageSize?: number} = {},
): Promise<ProposalVotesPage> {
  const page = options.page ?? 0;
  const pageSize = options.pageSize ?? PROPOSAL_VOTES_PAGE_SIZE;
  const offset = pageOffset(page, pageSize);
  const cacheKey = `votes:${proposalId}:${pageSize}:${offset}`;

  return votesCache.getOrSet(cacheKey, async () => {
    const result = await executeIndexerQuery<ProposalVotesQueryResult>(
      PROPOSAL_VOTES_QUERY,
      {proposalId, limit: pageSize, offset},
    );

    return {
      items: result.proposal_votes.map((row) => ({
        stakingPoolAddress: row.staking_pool_address,
        shouldPass: row.should_pass,
        numVotes: BigInt(row.num_votes),
      })),
      totalCount:
        result.proposal_votes_aggregate?.aggregate?.count ??
        result.proposal_votes.length,
      page,
      pageSize,
    };
  }) as Promise<ProposalVotesPage>;
}
