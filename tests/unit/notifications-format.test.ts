import {describe, expect, it} from "vitest";
import {
  eventHeadline,
  formatDiscordPayload,
  formatPlainText,
  formatSlackPayload,
  formatTelegramHtml,
  proposalPageUrl,
} from "~/lib/notifications/format";
import type {ProposalEvent} from "~/lib/notifications/types";

const event: ProposalEvent = {
  type: "proposal.created",
  proposalId: "12",
  status: "active",
  title: "Enable feature <X> & Y",
  yesVotes: "100000000",
  noVotes: "0",
  expirationSecs: "2000",
};

describe("notification formatters", () => {
  const url = proposalPageUrl("https://gov.example", "12");

  it("builds the proposal page URL without a trailing slash", () => {
    expect(url).toBe("https://gov.example/proposal/12");
  });

  it("uses a distinct headline per event type", () => {
    expect(eventHeadline(event)).toBe("New Aptos governance proposal");
    expect(eventHeadline({...event, type: "proposal.voting_passed"})).toBe(
      "Proposal passed voting",
    );
    expect(eventHeadline({...event, type: "proposal.voting_failed"})).toBe(
      "Proposal failed voting",
    );
    expect(eventHeadline({...event, type: "proposal.executed"})).toBe(
      "Proposal executed",
    );
    expect(
      eventHeadline({
        ...event,
        type: "proposal.voting_ending_soon",
        reminderWindow: "3d",
      }),
    ).toBe("3 days left to vote");
    expect(
      eventHeadline({
        ...event,
        type: "proposal.voting_ending_soon",
        reminderWindow: "2d",
      }),
    ).toBe("2 days left to vote");
    expect(
      eventHeadline({
        ...event,
        type: "proposal.voting_ending_soon",
        reminderWindow: "1d",
      }),
    ).toBe("1 day left to vote");
    expect(
      eventHeadline({
        ...event,
        type: "proposal.voting_ending_soon",
        reminderWindow: "6h",
      }),
    ).toBe("6 hours left to vote");
  });

  it("escapes HTML in Telegram bodies", () => {
    const html = formatTelegramHtml(event, url);
    expect(html).toContain("Enable feature &lt;X&gt; &amp; Y");
    expect(html).toContain(`href="${url}"`);
    expect(html).not.toContain("Enable feature <X>");
  });

  it("includes the proposal link in Slack and Discord payloads", () => {
    const slack = formatSlackPayload(event, url);
    expect(slack.text).toContain("#12");
    expect(JSON.stringify(slack.blocks)).toContain(url);

    const discord = formatDiscordPayload(event, url);
    expect(discord.embeds[0]?.url).toBe(url);
    expect(discord.embeds[0]?.title).toContain("#12");
  });

  it("keeps a plain-text fallback with title and URL", () => {
    const text = formatPlainText(event, url);
    expect(text).toContain("New Aptos governance proposal");
    expect(text).toContain("Enable feature <X> & Y");
    expect(text).toContain(url);
  });
});
