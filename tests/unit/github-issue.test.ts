import {describe, expect, it} from "vitest";
import {GITHUB_NEW_ISSUE_URL, githubNewIssueUrl} from "~/lib/github-issue";

describe("githubNewIssueUrl", () => {
  it("opens a new issue on aptos-labs/governance", () => {
    const href = githubNewIssueUrl();
    expect(href.startsWith(`${GITHUB_NEW_ISSUE_URL}?`)).toBe(true);
    expect(href).toContain("github.com/aptos-labs/governance/issues/new");
    expect(new URL(href).searchParams.get("body")).toContain(
      "Describe the issue",
    );
  });

  it("includes the current page in the issue body", () => {
    const pageUrl = "https://governance.aptosfoundation.org/proposal/142";
    const href = githubNewIssueUrl(pageUrl);
    const body = new URL(href).searchParams.get("body") ?? "";
    expect(body).toContain(pageUrl);
  });
});
