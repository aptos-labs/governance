import {describe, expect, it} from "vitest";
import {resolveNotificationConfig} from "~/lib/notifications/config";
import {slackDestinations} from "~/lib/notifications/destinations";
import {GOVERNANCE_SLACK_CHANNEL} from "~/lib/notifications/types";

const SLACK_URL =
  "https://hooks.slack.com/services/TTEST/BTEST/not-a-real-token";

function withEnv(
  values: Record<string, string | undefined>,
  run: () => void,
): void {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe("slackDestinations", () => {
  it("posts to #governance via an Incoming Webhook", () => {
    withEnv(
      {
        NOTIFICATIONS_SLACK_WEBHOOK_URL: SLACK_URL,
        NOTIFICATIONS_SLACK_BOT_TOKEN: undefined,
        SLACK_WEBHOOK_URL: undefined,
        SLACK_BOT_TOKEN: undefined,
      },
      () => {
        expect(slackDestinations(resolveNotificationConfig())).toEqual([
          {
            via: "webhook",
            webhookUrl: SLACK_URL,
            channel: GOVERNANCE_SLACK_CHANNEL,
          },
        ]);
      },
    );
  });

  it("prefers a Slack bot token and always targets #governance", () => {
    withEnv(
      {
        NOTIFICATIONS_SLACK_WEBHOOK_URL: SLACK_URL,
        NOTIFICATIONS_SLACK_BOT_TOKEN: "xoxb-test-token",
        SLACK_WEBHOOK_URL: undefined,
        SLACK_BOT_TOKEN: undefined,
      },
      () => {
        expect(slackDestinations(resolveNotificationConfig())).toEqual([
          {
            via: "bot",
            botToken: "xoxb-test-token",
            channel: "#governance",
          },
        ]);
      },
    );
  });

  it("ignores a non-Slack webhook URL", () => {
    withEnv(
      {
        NOTIFICATIONS_SLACK_WEBHOOK_URL: "https://example.com/hook",
        NOTIFICATIONS_SLACK_BOT_TOKEN: undefined,
        SLACK_WEBHOOK_URL: undefined,
        SLACK_BOT_TOKEN: undefined,
      },
      () => {
        expect(slackDestinations(resolveNotificationConfig())).toEqual([]);
      },
    );
  });
});
