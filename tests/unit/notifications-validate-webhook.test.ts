import {describe, expect, it} from "vitest";
import {
  isDiscordWebhookUrl,
  isSlackWebhookUrl,
  isTelegramChatId,
} from "~/lib/notifications/validate-webhook";

describe("isSlackWebhookUrl", () => {
  it("accepts Slack incoming webhook URLs", () => {
    expect(
      isSlackWebhookUrl(
        "https://hooks.slack.com/services/TTEST/BTEST/not-a-real-token",
      ),
    ).toBe(true);
  });

  it("rejects non-Slack hosts and http URLs", () => {
    expect(isSlackWebhookUrl("https://example.com/services/T/B/X")).toBe(false);
    expect(
      isSlackWebhookUrl(
        "http://hooks.slack.com/services/TTEST/BTEST/not-a-real-token",
      ),
    ).toBe(false);
    expect(
      isSlackWebhookUrl(
        "https://user:pass@hooks.slack.com/services/TTEST/BTEST/not-a-real-token",
      ),
    ).toBe(false);
  });
});

describe("isDiscordWebhookUrl", () => {
  it("accepts discord.com and discordapp.com webhook paths", () => {
    expect(
      isDiscordWebhookUrl("https://discord.com/api/webhooks/1/dummy-token"),
    ).toBe(true);
    expect(
      isDiscordWebhookUrl("https://discordapp.com/api/webhooks/1/dummy-token"),
    ).toBe(true);
  });

  it("rejects other Discord paths", () => {
    expect(isDiscordWebhookUrl("https://discord.com/api/channels/1")).toBe(
      false,
    );
  });
});

describe("isTelegramChatId", () => {
  it("accepts user and group chat ids", () => {
    expect(isTelegramChatId("123456789")).toBe(true);
    expect(isTelegramChatId("-1001234567890")).toBe(true);
  });

  it("rejects non-numeric values", () => {
    expect(isTelegramChatId("@channel")).toBe(false);
    expect(isTelegramChatId("https://t.me/joinchat/abc")).toBe(false);
  });
});
