import { describe, expect, it } from "vitest";
import { deriveProposalStatus, isVotingClosed } from "~/lib/governance/status";

describe("isVotingClosed", () => {
  it("is false before expiration with no early-resolution threshold set", () => {
    expect(
      isVotingClosed({
        yesVotes: 10n,
        noVotes: 5n,
        earlyResolutionVoteThreshold: null,
        expirationSecs: 1000n,
        nowSecs: 500n,
      }),
    ).toBe(false);
  });

  it("is true once nowSecs reaches expirationSecs", () => {
    expect(
      isVotingClosed({
        yesVotes: 10n,
        noVotes: 5n,
        earlyResolutionVoteThreshold: null,
        expirationSecs: 1000n,
        nowSecs: 1000n,
      }),
    ).toBe(true);
  });

  it("is true early once yes votes reach the early-resolution threshold", () => {
    expect(
      isVotingClosed({
        yesVotes: 60n,
        noVotes: 5n,
        earlyResolutionVoteThreshold: 60n,
        expirationSecs: 1000n,
        nowSecs: 10n,
      }),
    ).toBe(true);
  });

  it("is true early once no votes reach the early-resolution threshold", () => {
    expect(
      isVotingClosed({
        yesVotes: 5n,
        noVotes: 60n,
        earlyResolutionVoteThreshold: 60n,
        expirationSecs: 1000n,
        nowSecs: 10n,
      }),
    ).toBe(true);
  });
});

describe("deriveProposalStatus", () => {
  const base = {
    isResolved: false,
    yesVotes: 0n,
    noVotes: 0n,
    minVoteThreshold: 100n,
    earlyResolutionVoteThreshold: null as bigint | null,
    expirationSecs: 1000n,
    nowSecs: 0n,
  };

  it("is active while voting is still open", () => {
    expect(deriveProposalStatus({ ...base, nowSecs: 500n })).toBe("active");
  });

  it("is passed once closed with enough yes votes over threshold", () => {
    expect(
      deriveProposalStatus({
        ...base,
        nowSecs: 1000n,
        yesVotes: 80n,
        noVotes: 20n,
        minVoteThreshold: 100n,
      }),
    ).toBe("passed");
  });

  it("is failed once closed without meeting the minimum vote threshold", () => {
    expect(
      deriveProposalStatus({
        ...base,
        nowSecs: 1000n,
        yesVotes: 10n,
        noVotes: 5n,
        minVoteThreshold: 100n,
      }),
    ).toBe("failed");
  });

  it("is failed once closed with more no votes than yes votes", () => {
    expect(
      deriveProposalStatus({
        ...base,
        nowSecs: 1000n,
        yesVotes: 40n,
        noVotes: 60n,
        minVoteThreshold: 50n,
      }),
    ).toBe("failed");
  });

  it("is executed once is_resolved is true, regardless of timing", () => {
    expect(
      deriveProposalStatus({
        ...base,
        isResolved: true,
        nowSecs: 0n,
      }),
    ).toBe("executed");
  });
});