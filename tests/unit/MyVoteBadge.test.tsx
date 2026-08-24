// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyVoteBadge } from "~/components/MyVoteBadge";

describe("MyVoteBadge", () => {
  it("renders 'You voted Yes' with green styling when shouldPass is true", () => {
    const { container } = render(<MyVoteBadge shouldPass={true} />);
    expect(screen.getByText("You voted Yes")).toBeTruthy();
    const badge = container.querySelector("span");
    expect(badge).not.toBeNull();
  });

  it("renders 'You voted No' with red styling when shouldPass is false", () => {
    render(<MyVoteBadge shouldPass={false} />);
    expect(screen.getByText("You voted No")).toBeTruthy();
  });
});
