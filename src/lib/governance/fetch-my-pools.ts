// src/lib/governance/fetch-my-pools.ts
import {getAptosClient} from "~/lib/aptos/client";
import {executeIndexerQuery} from "~/lib/governance/indexer-client";
import type {PoolKind} from "~/lib/governance/types";

const STAKING_POOL_VOTER_QUERY = `
  query StakingPoolVoter($voter: String) {
    current_staking_pool_voter(where: { voter_address: { _eq: $voter } }) {
      staking_pool_address
    }
  }
`;

const DELEGATED_VOTER_QUERY = `
  query DelegatedVoter($voter: String) {
    current_delegated_voter(where: { voter: { _eq: $voter } }) {
      delegation_pool_address
    }
  }
`;

/** One column, filterable per Step 1's live confirmation — see Task 17's caveat note. */
const VOTE_HISTORY_QUERY = `
  query VoteHistoryForPool($poolAddress: String) {
    proposal_votes(
      where: { staking_pool_address: { _eq: $poolAddress } }
      order_by: { proposal_id: desc }
    ) {
      proposal_id
      should_pass
      num_votes
    }
  }
`;

export interface MyPool {
  poolAddress: string;
  poolKind: PoolKind;
  /** General current voting power — NOT scoped to any one proposal
   *  (contrast with EligiblePool.remainingVotingPower in types.ts,
   *  which is per-proposal remaining power). */
  votingPower: bigint;
}

export interface PoolVoteHistoryRow {
  proposalId: string;
  shouldPass: boolean;
  numVotes: bigint;
}

async function findMyStakePools(voterAddress: string): Promise<MyPool[]> {
  const aptos = getAptosClient();
  const {current_staking_pool_voter} = await executeIndexerQuery<{
    current_staking_pool_voter: Array<{staking_pool_address: string}>;
  }>(STAKING_POOL_VOTER_QUERY, {voter: voterAddress});

  return Promise.all(
    current_staking_pool_voter.map(async (row) => {
      const [votingPower] = await aptos.view<[string]>({
        payload: {
          function: "0x1::aptos_governance::get_voting_power",
          typeArguments: [],
          functionArguments: [row.staking_pool_address],
        },
      });
      return {
        poolAddress: row.staking_pool_address,
        poolKind: "stake_pool" as const,
        votingPower: BigInt(votingPower),
      };
    }),
  );
}

async function findMyDelegationPools(voterAddress: string): Promise<MyPool[]> {
  const aptos = getAptosClient();
  const {current_delegated_voter} = await executeIndexerQuery<{
    current_delegated_voter: Array<{delegation_pool_address: string}>;
  }>(DELEGATED_VOTER_QUERY, {voter: voterAddress});

  return Promise.all(
    current_delegated_voter.map(async (row) => {
      const [votingPower] = await aptos.view<[string]>({
        payload: {
          function:
            "0x1::delegation_pool::calculate_and_update_voter_total_voting_power",
          typeArguments: [],
          functionArguments: [row.delegation_pool_address, voterAddress],
        },
      });
      return {
        poolAddress: row.delegation_pool_address,
        poolKind: "delegation_pool" as const,
        votingPower: BigInt(votingPower),
      };
    }),
  );
}

/** Every pool `voterAddress` currently controls, with its general (not
 *  proposal-scoped) voting power — for the "My Delegation" page. */
export async function findMyPools(voterAddress: string): Promise<MyPool[]> {
  const [stakePools, delegationPools] = await Promise.all([
    findMyStakePools(voterAddress),
    findMyDelegationPools(voterAddress),
  ]);
  return [...stakePools, ...delegationPools];
}

/** Vote history for one pool, across all proposals it has voted on.
 *  Depends on the live filterability confirmed in Task 17 Step 1 —
 *  if that check failed, do not call this function; surface an empty
 *  history with an explanatory note instead (see delegation.tsx). */
export async function fetchVoteHistoryForPool(
  poolAddress: string,
): Promise<PoolVoteHistoryRow[]> {
  const {proposal_votes} = await executeIndexerQuery<{
    proposal_votes: Array<{
      proposal_id: string;
      should_pass: boolean;
      num_votes: string;
    }>;
  }>(VOTE_HISTORY_QUERY, {poolAddress});

  return proposal_votes.map((row) => ({
    proposalId: row.proposal_id,
    shouldPass: row.should_pass,
    numVotes: BigInt(row.num_votes),
  }));
}
