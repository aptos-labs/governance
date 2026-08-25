import {describe, expect, it} from "vitest";
import {isSlackWebhookUrl} from "~/lib/notifications/validate-webhook";

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
