import {describe, expect, it} from "vitest";
import {resolveNotificationConfig} from "~/lib/notifications/config";
import {
  addTelegramSubscription,
  addWebhookSubscription,
  destinationsForEvent,
  envDestinations,
  MAX_SUBSCRIPTIONS,
  removeSubscriptionByToken,
  removeTelegramChat,
} from "~/lib/notifications/subscriptions";
import type {
  NotificationEventType,
  Subscription,
} from "~/lib/notifications/types";
import {EMPTY_STORE_STATE} from "~/lib/notifications/types";

const SLACK_URL =
  "https://hooks.slack.com/services/TTEST/BTEST/not-a-real-token";
const DISCORD_URL = "https://discord.com/api/webhooks/1/dummy-token";
const ALL: NotificationEventType[] = [
  "proposal.created",
  "proposal.voting_passed",
  "proposal.voting_failed",
  "proposal.executed",
  "proposal.voting_ending_soon",
];

describe("webhook subscriptions", () => {
  it("adds a Slack webhook and is idempotent on the same URL", () => {
    const first = addWebhookSubscription(EMPTY_STORE_STATE, {
      channel: "slack",
      url: SLACK_URL,
      events: ALL,
      now: new Date("2026-08-25T00:00:00Z"),
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = addWebhookSubscription(first.state, {
      channel: "slack",
      url: SLACK_URL,
      events: ["proposal.created"],
      now: new Date("2026-08-25T00:00:00Z"),
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.created).toBe(false);
    expect(second.state.subscriptions).toHaveLength(1);
    expect(second.subscription.events).toEqual(["proposal.created"]);
  });

  it("rejects non-Slack URLs", () => {
    const result = addWebhookSubscription(EMPTY_STORE_STATE, {
      channel: "slack",
      url: DISCORD_URL,
      events: ALL,
      now: new Date(),
    });
    expect(result.ok).toBe(false);
  });

  it("unsubscribes by token", () => {
    const added = addWebhookSubscription(EMPTY_STORE_STATE, {
      channel: "discord",
      url: DISCORD_URL,
      events: ALL,
      now: new Date(),
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const removed = removeSubscriptionByToken(
      added.state,
      added.subscription.unsubscribeToken,
    );
    expect(removed.removed).toBe(true);
    expect(removed.state.subscriptions).toHaveLength(0);
  });
});

describe("telegram subscriptions", () => {
  it("adds and removes a chat id", () => {
    const added = addTelegramSubscription(EMPTY_STORE_STATE, {
      chatId: "-1001234567890",
      events: ALL,
      now: new Date(),
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const removed = removeTelegramChat(added.state, "-1001234567890");
    expect(removed.removed).toBe(true);
  });
});

describe("destination fan-out", () => {
  it("includes env destinations and filters by event type", () => {
    const previous = {
      NOTIFICATIONS_SLACK_WEBHOOK_URL:
        process.env.NOTIFICATIONS_SLACK_WEBHOOK_URL,
      NOTIFICATIONS_TELEGRAM_CHAT_IDS:
        process.env.NOTIFICATIONS_TELEGRAM_CHAT_IDS,
    };
    process.env.NOTIFICATIONS_SLACK_WEBHOOK_URL = SLACK_URL;
    process.env.NOTIFICATIONS_TELEGRAM_CHAT_IDS = "11111";
    try {
      const config = resolveNotificationConfig();
      expect(envDestinations(config)).toHaveLength(2);

      const subscription: Subscription = {
        id: "1",
        channel: "discord",
        events: ["proposal.executed"],
        createdAt: new Date().toISOString(),
        unsubscribeToken: "tok",
        discordWebhookUrl: DISCORD_URL,
      };
      const created = destinationsForEvent(
        {...EMPTY_STORE_STATE, subscriptions: [subscription]},
        config,
        "proposal.created",
      );
      expect(created.map((destination) => destination.channel).sort()).toEqual([
        "slack",
        "telegram",
      ]);

      const executed = destinationsForEvent(
        {...EMPTY_STORE_STATE, subscriptions: [subscription]},
        config,
        "proposal.executed",
      );
      expect(executed.map((destination) => destination.channel).sort()).toEqual(
        ["discord", "slack", "telegram"],
      );
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("enforces the subscription cap", () => {
    let state = EMPTY_STORE_STATE;
    for (let i = 0; i < MAX_SUBSCRIPTIONS; i++) {
      const added = addTelegramSubscription(state, {
        chatId: String(10000 + i),
        events: ALL,
        now: new Date(),
      });
      expect(added.ok).toBe(true);
      if (!added.ok) return;
      state = added.state;
    }
    const overflow = addTelegramSubscription(state, {
      chatId: "999999",
      events: ALL,
      now: new Date(),
    });
    expect(overflow.ok).toBe(false);
  });
});
