// tests/unit/fetch-my-pools.test.ts
import { describe, expect, it, vi } from "vitest";
import { findMyPools } from "~/lib/governance/fetch-my-pools";
import * as indexerClient from "~/lib/governance/indexer-client";
import { getAptosClient } from "~/lib/aptos/client";

vi.mock("~/lib/governance/indexer-client");
vi.mock("~/lib/aptos/client");

const VOTER = "0xvoter";

describe("findMyPools", () => {
  it("returns a stake pool with its current voting power", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockImplementation(
      async (query: string) => {
        if (query.includes("current_staking_pool_voter")) {
          return {
            current_staking_pool_voter: [
              { staking_pool_address: "0xstakepool1" },
            ],
          } as never;
        }
        return { current_delegated_voter: [] } as never;
      },
    );

    const mockView = vi.fn(async ({ payload }: { payload: { function: string } }) => {
      if (payload.function === "0x1::aptos_governance::get_voting_power") {
        return [1234n];
      }
      throw new Error(`unexpected view call: ${payload.function}`);
    });
    vi.mocked(getAptosClient).mockReturnValue({ view: mockView } as never);

    const pools = await findMyPools(VOTER);

    expect(pools).toEqual([
      {
        poolAddress: "0xstakepool1",
        poolKind: "stake_pool",
        votingPower: 1234n,
      },
    ]);
  });

  it("returns a delegation pool with its current total voting power", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockImplementation(
      async (query: string) => {
        if (query.includes("current_staking_pool_voter")) {
          return { current_staking_pool_voter: [] } as never;
        }
        return {
          current_delegated_voter: [
            { delegation_pool_address: "0xdelegpool1" },
          ],
        } as never;
      },
    );

    const mockView = vi.fn(async ({ payload }: { payload: { function: string } }) => {
      if (
        payload.function ===
        "0x1::delegation_pool::calculate_and_update_voter_total_voting_power"
      ) {
        return [777n];
      }
      throw new Error(`unexpected view call: ${payload.function}`);
    });
    vi.mocked(getAptosClient).mockReturnValue({ view: mockView } as never);

    const pools = await findMyPools(VOTER);

    expect(pools).toEqual([
      {
        poolAddress: "0xdelegpool1",
        poolKind: "delegation_pool",
        votingPower: 777n,
      },
    ]);
  });

  it("returns an empty array when the voter controls no pools", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockResolvedValue({
      current_staking_pool_voter: [],
      current_delegated_voter: [],
    } as never);

    expect(await findMyPools(VOTER)).toEqual([]);
  });
});