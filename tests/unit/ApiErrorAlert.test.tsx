// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {ApiErrorAlert} from "~/components/ApiErrorAlert";
import {RATE_LIMIT_MESSAGE} from "~/lib/governance/rate-limit";

describe("ApiErrorAlert", () => {
  afterEach(cleanup);

  it("shows the Aptos Origin 401 instead of a generic crash message", () => {
    render(
      <ApiErrorAlert
        error={
          new Error(
            'Account resource/0x1::voting::VotingForum<0x1::governance_proposal::GovernanceProposal> failed with status: Unauthorized(code:401) and response body: "Unauthorized: Origin header is required"',
          )
        }
      />,
    );
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Origin header is required/i,
    );
  });

  it("uses the rate-limit copy for 429s", () => {
    render(<ApiErrorAlert error={new Error("429 Too Many Requests")} />);
    expect(screen.getByText("Rate Limited")).toBeInTheDocument();
    expect(screen.getByText(RATE_LIMIT_MESSAGE)).toBeInTheDocument();
  });

  it("retries when Try again is clicked", () => {
    const onRetry = vi.fn();
    render(<ApiErrorAlert error={new Error("boom")} onRetry={onRetry} />);
    screen.getByRole("button", {name: /try again/i}).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
