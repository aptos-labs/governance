import {mkdtemp, readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {FileNotificationStore} from "~/lib/notifications/store";
import {addTelegramSubscription} from "~/lib/notifications/subscriptions";
import {EMPTY_STORE_STATE} from "~/lib/notifications/types";

describe("FileNotificationStore", () => {
  it("persists subscriptions across store instances", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "gov-notify-"));
    const filePath = path.join(dir, "notifications.json");
    const first = new FileNotificationStore(filePath);
    await first.withLock(async (state) => {
      const added = addTelegramSubscription(state, {
        chatId: "12345",
        events: ["proposal.created"],
        now: new Date("2026-08-25T00:00:00Z"),
      });
      if (!added.ok) throw new Error(added.error);
      return {state: added.state, result: added.subscription.id};
    });

    const raw = await readFile(filePath, "utf8");
    expect(raw).toContain("12345");

    const second = new FileNotificationStore(filePath);
    const chatIds = await second.withLock(async (state) => ({
      state,
      result: state.subscriptions.map((sub) => sub.telegramChatId),
    }));
    expect(chatIds).toEqual(["12345"]);
    expect(EMPTY_STORE_STATE.subscriptions).toHaveLength(0);
  });
});
