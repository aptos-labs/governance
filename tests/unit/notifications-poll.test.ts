import {describe, expect, it, vi} from "vitest";
import {
  cronAuthorized,
  telegramWebhookAuthorized,
} from "~/lib/notifications/auth";
import type {NotificationConfig} from "~/lib/notifications/config";
import {runNotificationPoll} from "~/lib/notifications/poll";
import {MemoryNotificationStore} from "~/lib/notifications/store";
import type {WatchedProposal} from "~/lib/notifications/types";

const config: NotificationConfig = {
  cronSecret: "secret",
  publicAppUrl: "https://gov.example",
  slackWebhookUrls: [
    "https://hooks.slack.com/services/TTEST/BTEST/not-a-real-token",
  ],
  discordWebhookUrls: [],
  telegramBotToken: undefined,
  telegramBotUsername: undefined,
  telegramChatIds: [],
  telegramWebhookSecret: "tg-secret",
  upstashUrl: undefined,
  upstashToken: undefined,
  storePath: undefined,
};

describe("cronAuthorized", () => {
  it("accepts a matching bearer token", () => {
    const request = new Request("https://gov.example/api/cron/notifications", {
      headers: {authorization: "Bearer secret"},
    });
    expect(cronAuthorized(request, "secret")).toBe(true);
  });

  it("rejects a missing or wrong secret", () => {
    const request = new Request("https://gov.example/api/cron/notifications");
    expect(cronAuthorized(request, "secret")).toBe(false);
    const wrong = new Request("https://gov.example/api/cron/notifications", {
      headers: {authorization: "Bearer nope"},
    });
    expect(cronAuthorized(wrong, "secret")).toBe(false);
  });
});

describe("telegramWebhookAuthorized", () => {
  it("checks the Telegram secret-token header when configured", () => {
    const request = new Request(
      "https://gov.example/api/notifications/telegram",
      {
        headers: {"x-telegram-bot-api-secret-token": "tg-secret"},
      },
    );
    expect(telegramWebhookAuthorized(request, "tg-secret")).toBe(true);
    expect(telegramWebhookAuthorized(request, "other")).toBe(false);
    expect(telegramWebhookAuthorized(request, undefined)).toBe(true);
  });
});

describe("runNotificationPoll", () => {
  it("baselines on the first poll then notifies on a new proposal", async () => {
    const store = new MemoryNotificationStore(undefined, true);
    const deliver = vi.fn(
      async (_destinations: unknown, _event: unknown, _config: unknown) => ({
        attempted: 1,
        delivered: 1,
        failed: 0,
      }),
    );

    const first = await runNotificationPoll({
      config,
      store,
      nowSecs: 10n,
      loadForum: async () => ({nextProposalId: 1, handle: "h"}),
      loadProposals: async () => [
        {
          proposalId: "0",
          status: "active",
          title: "Existing",
          yesVotes: 1n,
          noVotes: 0n,
          expirationSecs: 10_000_000n,
          creationTimeSecs: 1n,
        } satisfies WatchedProposal,
      ],
      deliver,
    });
    expect(first.events).toBe(0);
    expect(deliver).not.toHaveBeenCalled();

    const second = await runNotificationPoll({
      config,
      store,
      nowSecs: 20n,
      loadForum: async () => ({nextProposalId: 2, handle: "h"}),
      loadProposals: async (_handle, ids) =>
        ids.map((id) => ({
          proposalId: id,
          status: "active",
          title: id === "1" ? "Brand new" : "Existing",
          yesVotes: 1n,
          noVotes: 0n,
          expirationSecs: 10_000_000n,
          creationTimeSecs: 1n,
        })),
      deliver,
    });

    expect(second.eventTypes).toEqual(["proposal.created"]);
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver.mock.calls[0]?.[1]).toMatchObject({
      type: "proposal.created",
      proposalId: "1",
    });
  });

  it("commits the snapshot even if delivery fails", async () => {
    const store = new MemoryNotificationStore(undefined, true);
    await runNotificationPoll({
      config,
      store,
      nowSecs: 10n,
      loadForum: async () => ({nextProposalId: 0, handle: "h"}),
      loadProposals: async () => [],
      deliver: async () => ({attempted: 0, delivered: 0, failed: 0}),
    });

    const result = await runNotificationPoll({
      config,
      store,
      nowSecs: 20n,
      loadForum: async () => ({nextProposalId: 1, handle: "h"}),
      loadProposals: async () => [
        {
          proposalId: "0",
          status: "active",
          title: "New",
          yesVotes: 1n,
          noVotes: 0n,
          expirationSecs: 10_000_000n,
          creationTimeSecs: 1n,
        },
      ],
      deliver: async () => {
        throw new Error("slack down");
      },
    });

    expect(result.failed).toBeGreaterThan(0);
    expect(store.state.snapshot.nextProposalId).toBe(1);
    expect(store.state.snapshot.proposals["0"]?.status).toBe("active");
  });
});
