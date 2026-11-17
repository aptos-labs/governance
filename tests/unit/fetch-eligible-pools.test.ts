// tests/unit/fetch-eligible-pools.test.ts
import {describe, expect, it, vi} from "vitest";
import {getAptosClient} from "~/lib/aptos/client";
import {findEligiblePools} from "~/lib/governance/fetch-eligible-pools";
import * as indexerClient from "~/lib/governance/indexer-client";

vi.mock("~/lib/governance/indexer-client");
vi.mock("~/lib/aptos/client");

const VOTER = "0xvoter";
const PROPOSAL_ID = "42";

describe("findEligiblePools", () => {
  it("returns a stake pool with its remaining power and voted flag", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockImplementation(
      async (query: string) => {
        if (query.includes("current_staking_pool_voter")) {
          return {
            current_staking_pool_voter: [
              {staking_pool_address: "0xstakepool1"},
            ],
          } as never;
        }
        return {current_delegated_voter: []} as never;
      },
    );

    const mockView = vi.fn(async ({payload}: {payload: {function: string}}) => {
      if (
        payload.function === "0x1::aptos_governance::get_remaining_voting_power"
      ) {
        return [500n];
      }
      if (payload.function === "0x1::aptos_governance::has_entirely_voted") {
        return [false];
      }
      throw new Error(`unexpected view call: ${payload.function}`);
    });
    vi.mocked(getAptosClient).mockReturnValue({view: mockView} as never);

    const pools = await findEligiblePools(VOTER, PROPOSAL_ID);

    expect(pools).toEqual([
      {
        poolAddress: "0xstakepool1",
        poolKind: "stake_pool",
        remainingVotingPower: 500n,
        hasEntirelyVoted: false,
      },
    ]);
  });

  it("derives hasEntirelyVoted=true for a delegation pool with zero remaining but nonzero total power", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockImplementation(
      async (query: string) => {
        if (query.includes("current_staking_pool_voter")) {
          return {current_staking_pool_voter: []} as never;
        }
        return {
          current_delegated_voter: [{delegation_pool_address: "0xdelegpool1"}],
        } as never;
      },
    );

    const mockView = vi.fn(async ({payload}: {payload: {function: string}}) => {
      if (
        payload.function ===
        "0x1::delegation_pool::calculate_and_update_remaining_voting_power"
      ) {
        return [0n];
      }
      if (
        payload.function ===
        "0x1::delegation_pool::calculate_and_update_voter_total_voting_power"
      ) {
        return [1000n];
      }
      throw new Error(`unexpected view call: ${payload.function}`);
    });
    vi.mocked(getAptosClient).mockReturnValue({view: mockView} as never);

    const pools = await findEligiblePools(VOTER, PROPOSAL_ID);

    expect(pools).toEqual([
      {
        poolAddress: "0xdelegpool1",
        poolKind: "delegation_pool",
        remainingVotingPower: 0n,
        hasEntirelyVoted: true,
      },
    ]);
  });

  it("deduplicates delegation pools before view calls and preserves first-seen order", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockImplementation(
      async (query: string) => {
        if (query.includes("current_staking_pool_voter")) {
          return {current_staking_pool_voter: []} as never;
        }
        // Different delegators can delegate to the same voter through one pool.
        return {
          current_delegated_voter: [
            {delegation_pool_address: "0xdelegpool2"},
            {delegation_pool_address: "0xdelegpool1"},
            {delegation_pool_address: "0xdelegpool2"},
          ],
        } as never;
      },
    );

    const mockView = vi.fn(
      async ({
        payload,
      }: {
        payload: {function: string; functionArguments: string[]};
      }) => {
        if (
          payload.function ===
          "0x1::delegation_pool::calculate_and_update_remaining_voting_power"
        ) {
          return [
            payload.functionArguments[0] === "0xdelegpool2" ? "500" : "300",
          ];
        }
        if (
          payload.function ===
          "0x1::delegation_pool::calculate_and_update_voter_total_voting_power"
        ) {
          return ["1000"];
        }
        throw new Error(`unexpected view call: ${payload.function}`);
      },
    );
    vi.mocked(getAptosClient).mockReturnValue({view: mockView} as never);

    const pools = await findEligiblePools(VOTER, PROPOSAL_ID);

    expect.soft(pools).toEqual([
      {
        poolAddress: "0xdelegpool2",
        poolKind: "delegation_pool",
        remainingVotingPower: 500n,
        hasEntirelyVoted: false,
      },
      {
        poolAddress: "0xdelegpool1",
        poolKind: "delegation_pool",
        remainingVotingPower: 300n,
        hasEntirelyVoted: false,
      },
    ]);
    expect
      .soft(pools.reduce((sum, pool) => sum + pool.remainingVotingPower, 0n))
      .toBe(800n);
    expect.soft(mockView).toHaveBeenCalledTimes(4);
    for (const poolAddress of ["0xdelegpool2", "0xdelegpool1"]) {
      expect
        .soft(
          mockView.mock.calls.filter(
            ([{payload}]) => payload.functionArguments[0] === poolAddress,
          ),
        )
        .toHaveLength(2);
      expect(mockView).toHaveBeenCalledWith({
        payload: {
          function:
            "0x1::delegation_pool::calculate_and_update_remaining_voting_power",
          typeArguments: [],
          functionArguments: [poolAddress, VOTER, PROPOSAL_ID],
        },
      });
      expect(mockView).toHaveBeenCalledWith({
        payload: {
          function:
            "0x1::delegation_pool::calculate_and_update_voter_total_voting_power",
          typeArguments: [],
          functionArguments: [poolAddress, VOTER],
        },
      });
    }
  });

  it("marks hasEntirelyVoted=false for a delegation pool with zero total power (no stake / ineligible)", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockImplementation(
      async (query: string) => {
        if (query.includes("current_staking_pool_voter")) {
          return {current_staking_pool_voter: []} as never;
        }
        return {
          current_delegated_voter: [{delegation_pool_address: "0xdelegpool2"}],
        } as never;
      },
    );

    const mockView = vi.fn(async ({payload}: {payload: {function: string}}) => {
      if (
        payload.function ===
        "0x1::delegation_pool::calculate_and_update_remaining_voting_power"
      ) {
        return [0n];
      }
      if (
        payload.function ===
        "0x1::delegation_pool::calculate_and_update_voter_total_voting_power"
      ) {
        return [0n];
      }
      throw new Error(`unexpected view call: ${payload.function}`);
    });
    vi.mocked(getAptosClient).mockReturnValue({view: mockView} as never);

    const pools = await findEligiblePools(VOTER, PROPOSAL_ID);

    expect(pools[0].hasEntirelyVoted).toBe(false);
    expect(pools[0].remainingVotingPower).toBe(0n);
  });

  it("returns an empty array when the voter controls no pools", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockResolvedValue({
      current_staking_pool_voter: [],
      current_delegated_voter: [],
    } as never);

    const pools = await findEligiblePools(VOTER, PROPOSAL_ID);
    expect(pools).toEqual([]);
  });
});
