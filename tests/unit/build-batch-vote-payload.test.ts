// tests/unit/build-batch-vote-payload.test.ts
import {describe, expect, it} from "vitest";
import {
  BATCH_VOTE_FUNCTION_ID,
  buildBatchVoteTransactionPayload,
} from "~/lib/governance/build-batch-vote-payload";
import type {EligiblePool} from "~/lib/governance/types";

const stakePool = (address: string, power: bigint): EligiblePool => ({
  poolAddress: address,
  poolKind: "stake_pool",
  remainingVotingPower: power,
  hasEntirelyVoted: false,
});

const delegationPool = (address: string, power: bigint): EligiblePool => ({
  poolAddress: address,
  poolKind: "delegation_pool",
  remainingVotingPower: power,
  hasEntirelyVoted: false,
});

describe("buildBatchVoteTransactionPayload", () => {
  it("targets the verified aptos_voting_batched::partial_vote entry function", () => {
    // Pinned against the decompiled bytecode deployed at this address
    // (aptos-labs/move-modules). A typo or a drifted address here
    // would be a transaction sent to the wrong contract.
    expect(BATCH_VOTE_FUNCTION_ID).toBe(
      "0xdcc43c54a666493b6cbfc1ecc81af0bc24e9b75c5ab3a7065c1fc9632ee8bd82::aptos_voting_batched::partial_vote",
    );
  });

  it("splits pools into the stake-pool and delegation-pool vectors, in the module's argument order", () => {
    const payload = buildBatchVoteTransactionPayload(
      [
        stakePool("0xstake1", 100n),
        delegationPool("0xdelegation1", 200n),
        stakePool("0xstake2", 300n),
      ],
      "42",
      600n,
      true,
    );

    // partial_vote(&signer, proposal_id, voting_power, should_pass,
    //              stake_pools, delegation_pools) — the signer is
    //              supplied by the wallet, so the entry arguments
    //              start at proposal_id.
    expect(payload.data.functionArguments).toEqual([
      "42",
      "600",
      true,
      ["0xstake1", "0xstake2"],
      ["0xdelegation1"],
    ]);
    expect(payload.data.typeArguments).toEqual([]);
  });

  it("preserves caller pool order within each vector, since order decides which pools a partial budget fills", () => {
    const payload = buildBatchVoteTransactionPayload(
      [
        delegationPool("0xdelegation-b", 10n),
        delegationPool("0xdelegation-a", 10n),
      ],
      "7",
      20n,
      false,
    );

    expect(payload.data.functionArguments?.[4]).toEqual([
      "0xdelegation-b",
      "0xdelegation-a",
    ]);
  });

  it("passes the amount as a single budget, not a per-pool amount", () => {
    const payload = buildBatchVoteTransactionPayload(
      [stakePool("0xstake1", 400n), stakePool("0xstake2", 600n)],
      "42",
      1000n,
      true,
    );

    // One u64 covering both pools — the contract walks them in order
    // giving each min(its power, budget left).
    expect(payload.data.functionArguments?.[1]).toBe("1000");
  });

  it("carries the direction through unchanged", () => {
    const payload = buildBatchVoteTransactionPayload(
      [stakePool("0xstake1", 1n), stakePool("0xstake2", 1n)],
      "42",
      2n,
      false,
    );
    expect(payload.data.functionArguments?.[2]).toBe(false);
  });

  it("rejects an amount above the combined remaining power", () => {
    expect(() =>
      buildBatchVoteTransactionPayload(
        [stakePool("0xstake1", 100n), delegationPool("0xdelegation1", 100n)],
        "42",
        201n,
        true,
      ),
    ).toThrow(/exceeds total remaining voting power 200/);
  });

  it("allows an amount equal to the combined remaining power", () => {
    expect(() =>
      buildBatchVoteTransactionPayload(
        [stakePool("0xstake1", 100n), delegationPool("0xdelegation1", 100n)],
        "42",
        200n,
        true,
      ),
    ).not.toThrow();
  });

  it("rejects a zero or negative amount", () => {
    expect(() =>
      buildBatchVoteTransactionPayload(
        [stakePool("0xstake1", 100n)],
        "42",
        0n,
        true,
      ),
    ).toThrow(/greater than zero/);
  });

  it("rejects an empty pool set rather than sending a gas-burning no-op", () => {
    // The contract accepts two empty vectors and simply votes nothing,
    // so this has to be caught client-side.
    expect(() =>
      buildBatchVoteTransactionPayload([], "42", 100n, true),
    ).toThrow(/no pools available/i);
  });
});
