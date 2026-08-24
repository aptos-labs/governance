// src/lib/governance/fetch-proposal-votes.ts
import { executeIndexerQuery } from "~/lib/governance/indexer-client";

export interface ProposalVoteRow {
  stakingPoolAddress: string;
  shouldPass: boolean;
  numVotes: bigint;
}

interface ProposalVotesQueryResult {
  proposal_votes: Array<{
    staking_pool_address: string;
    should_pass: boolean;
    num_votes: string;
  }>;
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
  }
`;

/** Default page size for fetchProposalVotes — exported so callers (e.g.
 *  the proposal detail route's "load more" logic in Task 13) can detect
 *  a full page without duplicating this number. */
export const PROPOSAL_VOTES_PAGE_SIZE = 25;

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
  const result = await executeIndexerQuery<ProposalVotesQueryResult>(
    PROPOSAL_VOTES_QUERY,
    { proposalId, limit, offset },
  );

  return result.proposal_votes.map((row) => ({
    stakingPoolAddress: row.staking_pool_address,
    shouldPass: row.should_pass,
    numVotes: BigInt(row.num_votes),
  }));
}