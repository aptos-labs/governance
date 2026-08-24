// tests/unit/build-vote-payload.test.ts
import { describe, expect, it } from "vitest";
import { buildVoteTransactionPayload } from "~/lib/governance/build-vote-payload";
import type { EligiblePool } from "~/lib/governance/types";

const stakePool: EligiblePool = {
  poolAddress: "0xstakepool1",
  poolKind: "stake_pool",
  remainingVotingPower: 500n,
  hasEntirelyVoted: false,
};

const delegationPool: EligiblePool = {
  poolAddress: "0xdelegpool1",
  poolKind: "delegation_pool",
  remainingVotingPower: 1000n,
  hasEntirelyVoted: false,
};

describe("buildVoteTransactionPayload", () => {
  it("builds an aptos_governance::partial_vote payload for a stake pool", () => {
    const payload = buildVoteTransactionPayload(stakePool, "42", 300n, true);
    expect(payload).toEqual({
      data: {
        function: "0x1::aptos_governance::partial_vote",
        typeArguments: [],
        functionArguments: ["0xstakepool1", "42", "300", true],
      },
    });
  });

  it("builds a delegation_pool::vote payload for a delegation pool", () => {
    const payload = buildVoteTransactionPayload(
      delegationPool,
      "42",
      750n,
      false,
    );
    expect(payload).toEqual({
      data: {
        function: "0x1::delegation_pool::vote",
        typeArguments: [],
        functionArguments: ["0xdelegpool1", "42", "750", false],
      },
    });
  });

  it("throws if the requested amount exceeds the pool's remaining voting power", () => {
    expect(() =>
      buildVoteTransactionPayload(stakePool, "42", 999n, true),
    ).toThrow(/exceeds remaining voting power/i);
  });

  it("throws if the requested amount is zero", () => {
    expect(() =>
      buildVoteTransactionPayload(stakePool, "42", 0n, true),
    ).toThrow(/must be greater than zero/i);
  });

  it("throws if the requested amount is negative", () => {
    expect(() =>
      buildVoteTransactionPayload(stakePool, "42", -1n, true),
    ).toThrow(/must be greater than zero/i);
  });
});