// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusBadge } from "~/components/StatusBadge";

describe("StatusBadge", () => {
  afterEach(cleanup);
  it("renders 'Active' for active status", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders 'Passed' for passed status", () => {
    render(<StatusBadge status="passed" />);
    expect(screen.getByText("Passed")).toBeInTheDocument();
  });

  it("renders 'Executed' for executed status", () => {
    render(<StatusBadge status="executed" />);
    expect(screen.getByText("Executed")).toBeInTheDocument();
  });

  it("renders 'Failed' for failed status", () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("applies the design-system fill color as a CSS variable, not a hardcoded hex", () => {
    render(<StatusBadge status="active" />);
    const badge = screen.getByText("Active");
    expect(badge.style.backgroundColor).toBe("var(--color-status-active-fill)");
  });
});