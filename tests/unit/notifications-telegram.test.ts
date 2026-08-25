import {describe, expect, it} from "vitest";
import type {NotificationConfig} from "~/lib/notifications/config";
import {MemoryNotificationStore} from "~/lib/notifications/store";
import {
  handleTelegramCommand,
  parseTelegramCommand,
} from "~/lib/notifications/telegram";

const config: NotificationConfig = {
  cronSecret: undefined,
  publicAppUrl: "https://gov.example",
  slackWebhookUrls: [],
  discordWebhookUrls: [],
  telegramBotToken: "token",
  telegramBotUsername: "AptosGovBot",
  telegramChatIds: [],
  telegramWebhookSecret: undefined,
  upstashUrl: undefined,
  upstashToken: undefined,
  storePath: undefined,
};

describe("parseTelegramCommand", () => {
  it("parses slash commands and group mentions", () => {
    expect(parseTelegramCommand("/subscribe", "AptosGovBot")).toEqual({
      command: "subscribe",
      args: "",
    });
    expect(
      parseTelegramCommand("/subscribe@AptosGovBot extra", "AptosGovBot"),
    ).toEqual({command: "subscribe", args: "extra"});
    expect(
      parseTelegramCommand("/subscribe@OtherBot", "AptosGovBot"),
    ).toBeNull();
    expect(parseTelegramCommand("hello", "AptosGovBot")).toBeNull();
  });
});

describe("handleTelegramCommand", () => {
  it("subscribes and unsubscribes a durable store chat", async () => {
    const store = new MemoryNotificationStore(undefined, true);
    const subscribed = await handleTelegramCommand({
      text: "/subscribe",
      chatId: "42",
      store,
      config,
    });
    expect(subscribed.text).toMatch(/Subscribed/);
    expect(store.state.subscriptions).toHaveLength(1);

    const status = await handleTelegramCommand({
      text: "/status",
      chatId: "42",
      store,
      config,
    });
    expect(status.text).toMatch(/is subscribed/);

    const removed = await handleTelegramCommand({
      text: "/unsubscribe",
      chatId: "42",
      store,
      config,
    });
    expect(removed.text).toMatch(/Unsubscribed/);
    expect(store.state.subscriptions).toHaveLength(0);
  });

  it("treats /start subscribe as a subscribe deep link", async () => {
    const store = new MemoryNotificationStore(undefined, true);
    const result = await handleTelegramCommand({
      text: "/start subscribe",
      chatId: "99",
      store,
      config,
    });
    expect(result.text).toMatch(/Subscribed/);
  });

  it("refuses to persist on an ephemeral store", async () => {
    const store = new MemoryNotificationStore();
    const result = await handleTelegramCommand({
      text: "/subscribe",
      chatId: "42",
      store,
      config,
    });
    expect(result.text).toMatch(/durable notification store/);
    expect(store.state.subscriptions).toHaveLength(0);
  });
});
