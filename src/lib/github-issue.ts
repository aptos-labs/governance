export const GITHUB_REPO_URL = "https://github.com/aptos-labs/governance";
export const GITHUB_NEW_ISSUE_URL = `${GITHUB_REPO_URL}/issues/new`;

export function githubNewIssueUrl(pageUrl?: string): string {
  const url = new URL(GITHUB_NEW_ISSUE_URL);
  const sections = ["## Describe the issue", "", ""];
  const trimmed = pageUrl?.trim();
  if (trimmed) {
    sections.push("## Page", "", trimmed, "");
  }
  url.searchParams.set("body", sections.join("\n"));
  return url.toString();
}
