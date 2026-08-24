// src/lib/governance/fetch-eligible-pools.ts
import {getAptosClient} from "~/lib/aptos/client";
import {executeIndexerQuery} from "~/lib/governance/indexer-client";
import type {EligiblePool} from "~/lib/governance/types";

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

interface StakingPoolVoterResult {
  current_staking_pool_voter: Array<{staking_pool_address: string}>;
}

interface DelegatedVoterResult {
  current_delegated_voter: Array<{delegation_pool_address: string}>;
}

async function findEligibleStakePools(
  voterAddress: string,
  proposalId: string,
): Promise<EligiblePool[]> {
  const aptos = getAptosClient();
  const {current_staking_pool_voter} =
    await executeIndexerQuery<StakingPoolVoterResult>(
      STAKING_POOL_VOTER_QUERY,
      {voter: voterAddress},
    );

  return Promise.all(
    current_staking_pool_voter.map(async (row) => {
      const poolAddress = row.staking_pool_address;

      const [remainingPowerResult, hasVotedResult] = await Promise.all([
        aptos.view<[string]>({
          payload: {
            function: "0x1::aptos_governance::get_remaining_voting_power",
            typeArguments: [],
            functionArguments: [poolAddress, proposalId],
          },
        }),
        aptos.view<[boolean]>({
          payload: {
            function: "0x1::aptos_governance::has_entirely_voted",
            typeArguments: [],
            functionArguments: [poolAddress, proposalId],
          },
        }),
      ]);

      return {
        poolAddress,
        poolKind: "stake_pool" as const,
        remainingVotingPower: BigInt(remainingPowerResult[0]),
        hasEntirelyVoted: hasVotedResult[0],
      };
    }),
  );
}

async function findEligibleDelegationPools(
  voterAddress: string,
  proposalId: string,
): Promise<EligiblePool[]> {
  const aptos = getAptosClient();
  const {current_delegated_voter} =
    await executeIndexerQuery<DelegatedVoterResult>(DELEGATED_VOTER_QUERY, {
      voter: voterAddress,
    });

  return Promise.all(
    current_delegated_voter.map(async (row) => {
      const poolAddress = row.delegation_pool_address;

      const [remainingPowerResult, totalPowerResult] = await Promise.all([
        aptos.view<[string]>({
          payload: {
            function:
              "0x1::delegation_pool::calculate_and_update_remaining_voting_power",
            typeArguments: [],
            functionArguments: [poolAddress, voterAddress, proposalId],
          },
        }),
        aptos.view<[string]>({
          payload: {
            function:
              "0x1::delegation_pool::calculate_and_update_voter_total_voting_power",
            typeArguments: [],
            functionArguments: [poolAddress, voterAddress],
          },
        }),
      ]);

      const remainingVotingPower = BigInt(remainingPowerResult[0]);
      const totalVotingPower = BigInt(totalPowerResult[0]);

      // Exact derivation (not a guess): if this voter ever had power through
      // this pool and now has none left, they've used it all on this
      // proposal. If they never had any, the UI should show a generic
      // "no voting power available" rather than claim a specific cause.
      const hasEntirelyVoted =
        totalVotingPower > 0n && remainingVotingPower === 0n;

      return {
        poolAddress,
        poolKind: "delegation_pool" as const,
        remainingVotingPower,
        hasEntirelyVoted,
      };
    }),
  );
}

/**
 * Finds every pool (traditional stake pool with delegated voter, and/or
 * delegation pool) that `voterAddress` can currently vote through on
 * `proposalId`, with fullnode-verified remaining power and voted status
 * for each — per design spec §6.4, indexer data alone is never treated
 * as authoritative for voting eligibility.
 */
export async function findEligiblePools(
  voterAddress: string,
  proposalId: string,
): Promise<EligiblePool[]> {
  const [stakePools, delegationPools] = await Promise.all([
    findEligibleStakePools(voterAddress, proposalId),
    findEligibleDelegationPools(voterAddress, proposalId),
  ]);

  return [...stakePools, ...delegationPools];
}
