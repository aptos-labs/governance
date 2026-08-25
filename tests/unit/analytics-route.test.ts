import {describe, expect, it} from "vitest";
import {analyticsRouteFromPath} from "~/lib/analytics-route";

describe("analyticsRouteFromPath", () => {
  it("leaves static paths unchanged", () => {
    expect(analyticsRouteFromPath("/", {})).toBe("/");
    expect(analyticsRouteFromPath("/delegation", {})).toBe("/delegation");
  });

  it("replaces dynamic segments so proposal pages group together", () => {
    expect(
      analyticsRouteFromPath("/proposal/42", {proposalId: "42"}),
    ).toBe("/proposal/[proposalId]");
  });
});
