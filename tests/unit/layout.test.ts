import {readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {describe, expect, it} from "vitest";
import {PAGE_SHELL_WIDTH_CLASS} from "~/lib/layout";

const rootDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

describe("page shell width", () => {
  it("matches the original MUI xl container (1536px), not the narrower 7xl", () => {
    expect(PAGE_SHELL_WIDTH_CLASS).toBe("max-w-screen-2xl");
    expect(PAGE_SHELL_WIDTH_CLASS).not.toBe("max-w-7xl");
  });

  it("is used by the header, page body, and footer so columns stay aligned", () => {
    const files = [
      "src/routes/__root.tsx",
      "src/components/SiteHeader.tsx",
      "src/components/SiteFooter.tsx",
    ];
    for (const relative of files) {
      const source = readFileSync(path.join(rootDir, relative), "utf8");
      expect(source, relative).toContain("PAGE_SHELL_WIDTH_CLASS");
      expect(source, relative).not.toContain("max-w-7xl");
    }
  });

  it("places Report Issue in the header and footer chrome", () => {
    for (const relative of [
      "src/components/SiteHeader.tsx",
      "src/components/SiteFooter.tsx",
    ]) {
      const source = readFileSync(path.join(rootDir, relative), "utf8");
      expect(source, relative).toContain("ReportIssueButton");
    }
  });
});
