// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {cleanup, render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {HeroDivider} from "~/components/HeroDivider";

describe("HeroDivider", () => {
  afterEach(cleanup);

  it("stretches the double-line rails so they meet both squiggle endpoints", () => {
    const {container} = render(<HeroDivider />);
    const root = container.firstElementChild as HTMLElement;
    const classes = root.className.split(/\s+/);

    // Default flex alignment is stretch; items-center collapses the empty
    // rails into a 2px bar that no longer meets the SVG path endpoints.
    expect(classes).toContain("flex");
    expect(classes).toContain("items-stretch");
    expect(classes).not.toContain("items-center");

    const [leftRail, svg, rightRail] = Array.from(root.children);
    expect(leftRail.className.split(/\s+/)).toEqual(
      expect.arrayContaining(["mt-[14px]", "flex-1", "border-y"]),
    );
    expect(rightRail.className.split(/\s+/)).toEqual(
      expect.arrayContaining(["mb-[14px]", "flex-1", "border-y"]),
    );
    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(svg).toHaveAttribute("width", "52");
    expect(svg).toHaveAttribute("height", "34");
  });
});
