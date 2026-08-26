import {describe, expect, it} from "vitest";
import {
  diffProposalEvents,
  idsToFetch,
  REMINDER_1D_SECS,
  REMINDER_2D_SECS,
  REMINDER_3D_SECS,
  REMINDER_6H_SECS,
} from "~/lib/notifications/events";
import type {
  PollSnapshot,
  ProposalWatchState,
  WatchedProposal,
} from "~/lib/notifications/types";
import {EMPTY_SNAPSHOT, emptyReminderFlags} from "~/lib/notifications/types";

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

function watch(
  overrides: Partial<ProposalWatchState> = {},
): ProposalWatchState {
  return {
    status: "active",
    expirationSecs: "1000",
    ...emptyReminderFlags(),
    ...overrides,
  };
}

const EXPIRATION = 1_000_000n;

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
            "2": watch({expirationSecs: "100"}),
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

  it("emits created for a newly observed proposal id, including time left", () => {
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
    expect(events[0]?.remainingSecs).toBe(String(2_000_000n - 50n));
    expect(snapshot.proposals["1"]).toMatchObject({
      status: "active",
      ...emptyReminderFlags(),
    });
  });

  it("does not send a separate countdown when a new proposal is already due", () => {
    const expiration = 100_000n;
    const {events, snapshot} = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {},
      },
      nextProposalId: 2,
      nowSecs: expiration - REMINDER_6H_SECS + 30n,
      proposals: [
        proposal({
          proposalId: "1",
          status: "active",
          expirationSecs: expiration,
        }),
      ],
    });

    expect(events.map((event) => event.type)).toEqual(["proposal.created"]);
    expect(events[0]?.remainingSecs).toBe(String(REMINDER_6H_SECS - 30n));
    expect(snapshot.proposals["1"]).toMatchObject({
      reminded3d: true,
      reminded2d: true,
      reminded1d: true,
      reminded6h: true,
    });
  });

  it("emits voting_passed when an active proposal closes successfully", () => {
    const {events} = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {
          "0": watch({expirationSecs: "1000"}),
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
          "0": watch({expirationSecs: "1000"}),
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
          "0": watch({
            status: "passed",
            expirationSecs: "1000",
            reminded3d: true,
            reminded2d: true,
            reminded1d: true,
            reminded6h: true,
          }),
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
          "0": watch({expirationSecs: "1000"}),
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

  it("sends a 3d reminder once while voting is still open", () => {
    const first = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {
          "0": watch({expirationSecs: EXPIRATION.toString()}),
        },
      },
      nextProposalId: 1,
      nowSecs: EXPIRATION - REMINDER_3D_SECS + 60n,
      proposals: [
        proposal({
          proposalId: "0",
          status: "active",
          expirationSecs: EXPIRATION,
        }),
      ],
    });

    expect(first.events).toHaveLength(1);
    expect(first.events[0]?.type).toBe("proposal.voting_ending_soon");
    expect(first.events[0]?.reminderWindow).toBe("3d");
    expect(first.snapshot.proposals["0"]?.reminded3d).toBe(true);
    expect(first.snapshot.proposals["0"]?.reminded2d).toBe(false);

    const second = diffProposalEvents({
      snapshot: first.snapshot,
      nextProposalId: 1,
      nowSecs: EXPIRATION - REMINDER_3D_SECS + 120n,
      proposals: [
        proposal({
          proposalId: "0",
          status: "active",
          expirationSecs: EXPIRATION,
        }),
      ],
    });
    expect(second.events).toEqual([]);
  });

  it("walks 3d → 2d → 1d → 6h without repeating a window", () => {
    let snapshot: PollSnapshot = {
      initialized: true,
      nextProposalId: 1,
      proposals: {
        "0": watch({expirationSecs: EXPIRATION.toString()}),
      },
    };

    const windows = [
      {threshold: REMINDER_3D_SECS, window: "3d"},
      {threshold: REMINDER_2D_SECS, window: "2d"},
      {threshold: REMINDER_1D_SECS, window: "1d"},
      {threshold: REMINDER_6H_SECS, window: "6h"},
    ] as const;

    for (const step of windows) {
      const result = diffProposalEvents({
        snapshot,
        nextProposalId: 1,
        nowSecs: EXPIRATION - step.threshold + 30n,
        proposals: [
          proposal({
            proposalId: "0",
            status: "active",
            expirationSecs: EXPIRATION,
          }),
        ],
      });
      expect(result.events).toHaveLength(1);
      expect(result.events[0]?.reminderWindow).toBe(step.window);
      snapshot = result.snapshot;
    }
  });

  it("sends only the 6h reminder when every countdown window is already due", () => {
    const {events, snapshot} = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {
          "0": watch({expirationSecs: EXPIRATION.toString()}),
        },
      },
      nextProposalId: 1,
      nowSecs: EXPIRATION - REMINDER_6H_SECS + 30n,
      proposals: [
        proposal({
          proposalId: "0",
          status: "active",
          expirationSecs: EXPIRATION,
        }),
      ],
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.reminderWindow).toBe("6h");
    expect(snapshot.proposals["0"]).toMatchObject({
      reminded3d: true,
      reminded2d: true,
      reminded1d: true,
      reminded6h: true,
    });
  });

  it("treats a legacy 24h flag as the 1d window already sent", () => {
    const {events, snapshot} = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {
          "0": {
            status: "active",
            expirationSecs: EXPIRATION.toString(),
            reminded24h: true,
            reminded6h: false,
          } as unknown as ProposalWatchState,
        },
      },
      nextProposalId: 1,
      nowSecs: EXPIRATION - REMINDER_1D_SECS + 60n,
      proposals: [
        proposal({
          proposalId: "0",
          status: "active",
          expirationSecs: EXPIRATION,
        }),
      ],
    });

    expect(events).toEqual([]);
    expect(snapshot.proposals["0"]).toMatchObject({
      reminded3d: true,
      reminded2d: true,
      reminded1d: true,
      reminded6h: false,
    });
  });

  it("keeps a missing watched proposal so the next poll can retry", () => {
    const {events, snapshot} = diffProposalEvents({
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {
          "0": watch({expirationSecs: "1000"}),
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
