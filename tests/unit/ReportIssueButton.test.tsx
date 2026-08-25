// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {cleanup, render, screen, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {ReportIssueButton} from "~/components/ReportIssueButton";
import {GITHUB_NEW_ISSUE_URL} from "~/lib/github-issue";

describe("ReportIssueButton", () => {
  afterEach(cleanup);

  it("opens a GitHub new-issue form in a new tab", async () => {
    render(<ReportIssueButton />);
    const link = screen.getByRole("link", {name: "Report Issue"});
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link.getAttribute("href")).toContain(GITHUB_NEW_ISSUE_URL);

    await waitFor(() => {
      const href = link.getAttribute("href") ?? "";
      const body = new URL(href).searchParams.get("body") ?? "";
      expect(body).toContain(window.location.href);
    });
  });
});
