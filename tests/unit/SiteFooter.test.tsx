// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {SiteFooter} from "~/components/SiteFooter";
import {GITHUB_NEW_ISSUE_URL} from "~/lib/github-issue";

describe("SiteFooter", () => {
  afterEach(cleanup);

  it("includes a Report Issue button that opens GitHub", () => {
    render(<SiteFooter />);
    const link = screen.getByRole("link", {name: "Report Issue"});
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("href")).toContain(GITHUB_NEW_ISSUE_URL);
  });
});
