import {describe, expect, it} from "vitest";
import {
  diffProposalEvents,
  idsToFetch,
  REMINDER_6H_SECS,
  REMINDER_24H_SECS,
} from "~/lib/notifications/events";
import type {WatchedProposal} from "~/lib/notifications/types";
import {EMPTY_SNAPSHOT} from "~/lib/notifications/types";

function proposal(
  overrides: Partial<WatchedProposal> &
    Pick<WatchedProposal, "proposalId" | "status">,
): WatchedProposal {
  return {
    title: `Title ${overrides.proposalId}`,
    yesVotes: 10n,
    noVotes: 1n,
    expirationSecs: 2000n,
    creationTimeSecs: 1000n,
    ...overrides,
  };
}

describe("idsToFetch", () => {
  it("fetches every id on the first run so the snapshot can baseline", () => {
    expect(idsToFetch(EMPTY_SNAPSHOT, 3)).toEqual(["0", "1", "2"]);
  });

  it("fetches only new ids plus still-watched proposals after init", () => {
    expect(
      idsToFetch(
        {
          initialized: true,
          nextProposalId: 4,
          proposals: {
            "2": {
              status: "active",
              expirationSecs: "100",
              reminded24h: false,
              reminded6h: false,
            },
          },
        },
        6,
      ),
    ).toEqual(["4", "5", "2"]);
  });
});

describe("diffProposalEvents", () => {
  it("emits nothing on the first poll and records active/passed watches", () => {
    const {events, snapshot} = diffProposalEvents({
      snapshot: EMPTY_SNAPSHOT,
      nextProposalId: 2,
      nowSecs: 50n,
      proposals: [
        proposal({proposalId: "0", status: "executed"}),
        proposal({proposalId: "1", status: "active", expirationSecs: 500n}),
      ],
    });

    expect(events).toEqual([]);
    expect(snapshot.initialized).toBe(true);
    expect(snapshot.nextProposalId).toBe(2);
    expect(snapshot.proposals["0"]).toBeUndefined();
    expect(snapshot.proposals["1"]?.status).toBe("active");
  });

  it("emits created for a newly observed proposal id", () => {
    const {events, snapshot} = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {},
      },
      nextProposalId: 2,
      nowSecs: 50n,
      proposals: [
        proposal({
          proposalId: "1",
          status: "active",
          expirationSecs: 2_000_000n,
        }),
      ],
    });

    expect(events.map((event) => event.type)).toEqual(["proposal.created"]);
    expect(snapshot.proposals["1"]?.status).toBe("active");
  });

  it("emits voting_passed when an active proposal closes successfully", () => {
    const {events} = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {
          "0": {
            status: "active",
            expirationSecs: "1000",
            reminded24h: false,
            reminded6h: false,
          },
        },
      },
      nextProposalId: 1,
      nowSecs: 2000n,
      proposals: [proposal({proposalId: "0", status: "passed"})],
    });

    expect(events.map((event) => event.type)).toEqual([
      "proposal.voting_passed",
    ]);
  });

  it("emits voting_failed when an active proposal closes without passing", () => {
    const {events, snapshot} = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {
          "0": {
            status: "active",
            expirationSecs: "1000",
            reminded24h: false,
            reminded6h: false,
          },
        },
      },
      nextProposalId: 1,
      nowSecs: 2000n,
      proposals: [proposal({proposalId: "0", status: "failed"})],
    });

    expect(events.map((event) => event.type)).toEqual([
      "proposal.voting_failed",
    ]);
    expect(snapshot.proposals["0"]).toBeUndefined();
  });

  it("emits executed when a passed proposal is resolved", () => {
    const {events} = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {
          "0": {
            status: "passed",
            expirationSecs: "1000",
            reminded24h: true,
            reminded6h: true,
          },
        },
      },
      nextProposalId: 1,
      nowSecs: 3000n,
      proposals: [proposal({proposalId: "0", status: "executed"})],
    });

    expect(events.map((event) => event.type)).toEqual(["proposal.executed"]);
  });

  it("emits passed then executed when a poll skips the passed window", () => {
    const {events} = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {
          "0": {
            status: "active",
            expirationSecs: "1000",
            reminded24h: false,
            reminded6h: false,
          },
        },
      },
      nextProposalId: 1,
      nowSecs: 3000n,
      proposals: [proposal({proposalId: "0", status: "executed"})],
    });

    expect(events.map((event) => event.type)).toEqual([
      "proposal.voting_passed",
      "proposal.executed",
    ]);
  });

  it("sends a 24h reminder once while voting is still open", () => {
    const first = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {
          "0": {
            status: "active",
            expirationSecs: "100000",
            reminded24h: false,
            reminded6h: false,
          },
        },
      },
      nextProposalId: 1,
      nowSecs: 100000n - REMINDER_24H_SECS + 60n,
      proposals: [
        proposal({
          proposalId: "0",
          status: "active",
          expirationSecs: 100000n,
        }),
      ],
    });

    expect(first.events).toHaveLength(1);
    expect(first.events[0]?.type).toBe("proposal.voting_ending_soon");
    expect(first.events[0]?.reminderWindow).toBe("24h");
    expect(first.snapshot.proposals["0"]?.reminded24h).toBe(true);

    const second = diffProposalEvents({
      snapshot: first.snapshot,
      nextProposalId: 1,
      nowSecs: 100000n - REMINDER_24H_SECS + 120n,
      proposals: [
        proposal({
          proposalId: "0",
          status: "active",
          expirationSecs: 100000n,
        }),
      ],
    });
    expect(second.events).toEqual([]);
  });

  it("sends only the 6h reminder when both windows are already due", () => {
    const {events, snapshot} = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {
          "0": {
            status: "active",
            expirationSecs: "100000",
            reminded24h: false,
            reminded6h: false,
          },
        },
      },
      nextProposalId: 1,
      nowSecs: 100000n - REMINDER_6H_SECS + 30n,
      proposals: [
        proposal({
          proposalId: "0",
          status: "active",
          expirationSecs: 100000n,
        }),
      ],
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.reminderWindow).toBe("6h");
    expect(snapshot.proposals["0"]?.reminded24h).toBe(true);
    expect(snapshot.proposals["0"]?.reminded6h).toBe(true);
  });

  it("keeps a missing watched proposal so the next poll can retry", () => {
    const {events, snapshot} = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {
          "0": {
            status: "active",
            expirationSecs: "1000",
            reminded24h: false,
            reminded6h: false,
          },
        },
      },
      nextProposalId: 1,
      nowSecs: 10n,
      proposals: [],
    });

    expect(events).toEqual([]);
    expect(snapshot.proposals["0"]?.status).toBe("active");
  });

  it("does not treat a previously known terminal proposal as created", () => {
    const {events} = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 5,
        proposals: {},
      },
      nextProposalId: 5,
      nowSecs: 10n,
      proposals: [proposal({proposalId: "2", status: "executed"})],
    });

    expect(events).toEqual([]);
  });
});
