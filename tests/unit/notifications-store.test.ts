import {mkdtemp, readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {
  FileNotificationStore,
  normalizeStoreState,
} from "~/lib/notifications/store";
import {EMPTY_SNAPSHOT, EMPTY_STORE_STATE} from "~/lib/notifications/types";

describe("FileNotificationStore", () => {
  it("persists the poll snapshot across store instances", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "gov-notify-"));
    const filePath = path.join(dir, "notifications.json");
    const first = new FileNotificationStore(filePath);
    await first.withLock(async (state) => ({
      state: {
        ...state,
        snapshot: {
          initialized: true,
          nextProposalId: 4,
          proposals: {
            "3": {
              status: "active",
              expirationSecs: "1000",
              reminded3d: false,
              reminded2d: false,
              reminded1d: false,
              reminded6h: false,
            },
          },
        },
      },
      result: undefined,
    }));

    const raw = await readFile(filePath, "utf8");
    expect(raw).toContain('"nextProposalId": 4');

    const second = new FileNotificationStore(filePath);
    const snapshot = await second.withLock(async (state) => ({
      state,
      result: state.snapshot,
    }));
    expect(snapshot.nextProposalId).toBe(4);
    expect(snapshot.proposals["3"]?.status).toBe("active");
    expect(EMPTY_STORE_STATE.snapshot).toEqual(EMPTY_SNAPSHOT);
  });
});

describe("normalizeStoreState", () => {
  it("keeps the snapshot and drops leftover subscription fields", () => {
    const migrated = normalizeStoreState({
      version: 1,
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {
          "0": {
            status: "active",
            expirationSecs: "100",
            reminded3d: false,
            reminded2d: false,
            reminded1d: false,
            reminded6h: false,
          },
        },
      },
      subscriptions: [{id: "old"}],
      telegramWebhookUrl: "https://example.com",
    });

    expect(migrated).toEqual({
      version: 1,
      snapshot: {
        initialized: true,
        nextProposalId: 1,
        proposals: {
          "0": {
            status: "active",
            expirationSecs: "100",
            reminded3d: false,
            reminded2d: false,
            reminded1d: false,
            reminded6h: false,
          },
        },
      },
    });
  });
});
