// src/lib/governance/build-batch-vote-payload.ts
import type {VoteTransactionPayload} from "~/lib/governance/build-vote-payload";
import type {EligiblePool} from "~/lib/governance/types";

/**
 * GovScan's `aptos_voting_batched` helper module on mainnet. Not part
 * of the 0x1 framework — it is a third-party contract that wraps the
 * framework's own per-pool entry functions so a voter can cast through
 * every pool in ONE transaction instead of one transaction per pool.
 *
 * Verified against the deployed bytecode at this address (decompiled
 * source in aptos-labs/move-modules, mainnet/d/c/c/<address>/
 * aptos-voting-contract/sources/aptos_voting_batched.move), not just
 * against a published source listing:
 *
 *   public entry fun partial_vote(
 *     voter: &signer,
 *     proposal_id: u64,
 *     voting_power: u64,
 *     should_pass: bool,
 *     stake_pools: vector<address>,
 *     delegation_pools: vector<address>,
 *   )
 *
 * It calls 0x1::aptos_governance::partial_vote for each stake pool and
 * 0x1::delegation_pool::vote for each delegation pool, so the votes it
 * casts are exactly the ones this app would cast one at a time.
 */
export const BATCH_VOTING_CONTRACT_ADDRESS =
  "0xdcc43c54a666493b6cbfc1ecc81af0bc24e9b75c5ab3a7065c1fc9632ee8bd82";

export const BATCH_VOTE_FUNCTION_ID =
  `${BATCH_VOTING_CONTRACT_ADDRESS}::aptos_voting_batched::partial_vote` as const;

/**
 * Builds the single-transaction payload that votes `amountOctas` across
 * `pools`.
 *
 * `amountOctas` is ONE BUDGET, not a per-pool amount: the contract
 * walks the stake pools in the order given, then the delegation pools,
 * giving each `min(its remaining power, budget left)` and stopping as
 * soon as the budget reaches zero. Pool order therefore decides which
 * pools get used when the budget is smaller than the total available —
 * irrelevant for the "vote with everything" case this app uses, where
 * the budget is the full sum, but it is why the two vectors are built
 * in the caller's pool order rather than sorted or deduplicated here.
 *
 * The contract silently skips a pool whose state has changed since the
 * client read it (a stake pool whose delegated voter is no longer the
 * signer, a delegation pool without partial governance voting, or any
 * pool with no remaining power) and leaves that share of the budget
 * unspent rather than aborting — so a stale read costs an under-vote,
 * never a failed transaction.
 */
export function buildBatchVoteTransactionPayload(
  pools: EligiblePool[],
  proposalId: string,
  amountOctas: bigint,
  shouldPass: boolean,
): VoteTransactionPayload {
  if (pools.length === 0) {
    // Guarded because the contract would happily accept two empty
    // vectors: a transaction that costs gas and casts no vote at all.
    throw new Error("No pools available to vote through");
  }
  if (amountOctas <= 0n) {
    throw new Error("Voting power amount must be greater than zero");
  }

  const totalAvailable = pools.reduce(
    (sum, pool) => sum + pool.remainingVotingPower,
    0n,
  );
  if (amountOctas > totalAvailable) {
    throw new Error(
      `Requested amount ${amountOctas} exceeds total remaining voting power ${totalAvailable} across ${pools.length} pools`,
    );
  }

  const stakePools = pools
    .filter((pool) => pool.poolKind === "stake_pool")
    .map((pool) => pool.poolAddress);
  const delegationPools = pools
    .filter((pool) => pool.poolKind === "delegation_pool")
    .map((pool) => pool.poolAddress);

  return {
    data: {
      function: BATCH_VOTE_FUNCTION_ID,
      typeArguments: [],
      functionArguments: [
        proposalId,
        amountOctas.toString(),
        shouldPass,
        stakePools,
        delegationPools,
      ],
    },
  };
}
