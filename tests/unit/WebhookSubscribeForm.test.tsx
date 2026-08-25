// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {WebhookSubscribeForm} from "~/components/WebhookSubscribeForm";

vi.mock("~/lib/notifications/server", () => ({
  subscribeWebhook: vi.fn(),
}));

import {subscribeWebhook} from "~/lib/notifications/server";

const mockedSubscribe = vi.mocked(subscribeWebhook);

describe("WebhookSubscribeForm", () => {
  afterEach(() => {
    cleanup();
    mockedSubscribe.mockReset();
  });

  it("submits a Slack webhook URL", async () => {
    mockedSubscribe.mockResolvedValue({
      ok: true,
      created: true,
      unsubscribeUrl: "https://gov.example/notifications/unsubscribe?token=abc",
    });

    render(
      <WebhookSubscribeForm
        channel="slack"
        placeholder="https://hooks.slack.com/services/…"
        help="Paste a Slack incoming webhook."
      />,
    );

    fireEvent.change(screen.getByLabelText("Webhook URL"), {
      target: {
        value: "https://hooks.slack.com/services/TTEST/BTEST/not-a-real-token",
      },
    });
    fireEvent.click(screen.getByRole("button", {name: "Subscribe"}));

    await waitFor(() => {
      expect(mockedSubscribe).toHaveBeenCalledTimes(1);
    });
    expect(mockedSubscribe.mock.calls[0]?.[0]).toMatchObject({
      data: {
        channel: "slack",
        url: "https://hooks.slack.com/services/TTEST/BTEST/not-a-real-token",
      },
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/Subscribed/);
  });

  it("shows the server error when subscribe is rejected", async () => {
    mockedSubscribe.mockResolvedValue({
      ok: false,
      error: "Enter a Slack incoming webhook URL (hooks.slack.com).",
    });

    render(
      <WebhookSubscribeForm
        channel="slack"
        placeholder="https://hooks.slack.com/services/…"
        help="Paste a Slack incoming webhook."
      />,
    );

    fireEvent.change(screen.getByLabelText("Webhook URL"), {
      target: {value: "https://example.com/not-slack"},
    });
    fireEvent.click(screen.getByRole("button", {name: "Subscribe"}));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a Slack incoming webhook URL",
    );
  });
});
