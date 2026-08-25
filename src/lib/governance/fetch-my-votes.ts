// src/lib/governance/fetch-my-votes.ts
import {createServerFn} from "@tanstack/react-start";
import {z} from "zod";
import {executeIndexerQuery} from "~/lib/governance/indexer-client";

const STAKING_POOL_VOTER_QUERY = `
  query StakingPoolVoter($voter: String) {
    current_staking_pool_voter(where: { voter_address: { _eq: $voter } }) {
      staking_pool_address
    }
  }
`;

const MY_VOTES_QUERY = `
  query MyVotes($poolAddresses: [String!], $proposalIds: [bigint!]) {
    proposal_votes(
      where: {
        staking_pool_address: { _in: $poolAddresses }
        proposal_id: { _in: $proposalIds }
      }
    ) {
      staking_pool_address
      proposal_id
      should_pass
      num_votes
    }
  }
`;

export interface MyVoteEntry {
  shouldPass: boolean;
  amountOctas: string;
  poolAddresses: string[];
}

export type MyVotesMap = Record<string, MyVoteEntry>;

// Exported for testing
export function aggregateVotesByProposal(
  poolAddresses: string[],
  votes: Array<{
    staking_pool_address: string;
    proposal_id: string;
    should_pass: boolean;
    num_votes: string;
  }>,
): MyVotesMap {
  const result: MyVotesMap = {};
  for (const vote of votes) {
    if (!poolAddresses.includes(vote.staking_pool_address)) continue;
    const existing = result[vote.proposal_id];
    if (existing) {
      existing.poolAddresses.push(vote.staking_pool_address);
      existing.amountOctas = (
        BigInt(existing.amountOctas) + BigInt(vote.num_votes)
      ).toString();
    } else {
      result[vote.proposal_id] = {
        shouldPass: vote.should_pass,
        amountOctas: vote.num_votes,
        poolAddresses: [vote.staking_pool_address],
      };
    }
  }
  return result;
}

const fetchMyVotesInputSchema = z.object({
  voterAddress: z.string(),
  proposalIds: z.array(z.string()),
});

export const fetchMyVotes = createServerFn({method: "GET"})
  .validator(fetchMyVotesInputSchema)
  .handler(async ({data}): Promise<MyVotesMap> => {
    try {
      // 1. Discover which pools this address controls
      const {current_staking_pool_voter} = await executeIndexerQuery<{
        current_staking_pool_voter: Array<{staking_pool_address: string}>;
      }>(STAKING_POOL_VOTER_QUERY, {voter: data.voterAddress});

      const poolAddresses = current_staking_pool_voter.map(
        (r) => r.staking_pool_address,
      );

      if (poolAddresses.length === 0 || data.proposalIds.length === 0) {
        return {};
      }

      // 2. Query proposal_votes for these pools on these proposals
      const {proposal_votes} = await executeIndexerQuery<{
        proposal_votes: Array<{
          staking_pool_address: string;
          proposal_id: string;
          should_pass: boolean;
          num_votes: string;
        }>;
      }>(MY_VOTES_QUERY, {
        poolAddresses,
        proposalIds: data.proposalIds.map(Number),
      });

      return aggregateVotesByProposal(poolAddresses, proposal_votes);
    } catch {
      // Indexer unavailable — return empty, no crash
      return {};
    }
  });
