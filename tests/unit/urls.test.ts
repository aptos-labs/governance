import {describe, expect, it} from "vitest";
import {isNavigableHttpUrl} from "~/lib/governance/urls";

describe("isNavigableHttpUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isNavigableHttpUrl("https://github.com/aptos-foundation/AIPs")).toBe(
      true,
    );
    expect(isNavigableHttpUrl("http://example.com/thread")).toBe(true);
  });

  it("rejects empty, whitespace, hash-only, and placeholder values", () => {
    expect(isNavigableHttpUrl("")).toBe(false);
    expect(isNavigableHttpUrl("   ")).toBe(false);
    expect(isNavigableHttpUrl("#")).toBe(false);
    expect(isNavigableHttpUrl("n/a")).toBe(false);
    expect(isNavigableHttpUrl("N/A")).toBe(false);
    expect(isNavigableHttpUrl("none")).toBe(false);
    expect(isNavigableHttpUrl(null)).toBe(false);
    expect(isNavigableHttpUrl(undefined)).toBe(false);
  });

  it("rejects javascript and non-http schemes", () => {
    expect(isNavigableHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isNavigableHttpUrl("mailto:hello@example.com")).toBe(false);
    expect(isNavigableHttpUrl("ipfs://bafy")).toBe(false);
  });
});
