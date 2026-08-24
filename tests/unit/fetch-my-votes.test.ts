// tests/unit/fetch-my-votes.test.ts
import { describe, it, expect } from "vitest";
import { aggregateVotesByProposal } from "~/lib/governance/fetch-my-votes";

describe("aggregateVotesByProposal", () => {
  it("returns empty map when no votes match the specified pool addresses", () => {
    const result = aggregateVotesByProposal(
      ["0xpool1"],
      [{ staking_pool_address: "0xother", proposal_id: "10", should_pass: true, num_votes: "100" }],
    );
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("aggregates votes from multiple pools on the same proposal", () => {
    const result = aggregateVotesByProposal(
      ["0xpool1", "0xpool2"],
      [
        { staking_pool_address: "0xpool1", proposal_id: "10", should_pass: true, num_votes: "100" },
        { staking_pool_address: "0xpool2", proposal_id: "10", should_pass: true, num_votes: "200" },
      ],
    );
    expect(result["10"]).toBeDefined();
    expect(result["10"].shouldPass).toBe(true);
    expect(result["10"].amountOctas).toBe("300");
    expect(result["10"].poolAddresses).toEqual(["0xpool1", "0xpool2"]);
  });

  it("handles votes on different proposals separately", () => {
    const result = aggregateVotesByProposal(
      ["0xpool1"],
      [
        { staking_pool_address: "0xpool1", proposal_id: "10", should_pass: true, num_votes: "100" },
        { staking_pool_address: "0xpool1", proposal_id: "15", should_pass: false, num_votes: "50" },
      ],
    );
    expect(result["10"].shouldPass).toBe(true);
    expect(result["15"].shouldPass).toBe(false);
  });

  it("returns empty map for empty inputs", () => {
    expect(aggregateVotesByProposal([], [])).toEqual({});
    expect(aggregateVotesByProposal(["0xpool1"], [])).toEqual({});
  });
});