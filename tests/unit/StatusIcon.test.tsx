// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {StatusLabel} from "~/components/StatusIcon";

describe("StatusLabel", () => {
  afterEach(cleanup);

  it("uses the original governance status copy", () => {
    render(<StatusLabel status="active" />);
    expect(screen.getByText("Voting In Progress")).toBeInTheDocument();
  });
});
