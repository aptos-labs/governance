// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VoteBar } from "~/components/VoteBar";

describe("VoteBar", () => {
  afterEach(cleanup);

  it("renders formatted yes and no vote totals", () => {
    render(
      <VoteBar
        yesVotes={100_00000000n}
        noVotes={20_00000000n}
        minVoteThreshold={50_00000000n}
      />,
    );
    expect(screen.getByText(/100 APT for/i)).toBeInTheDocument();
    expect(screen.getByText(/20 APT against/i)).toBeInTheDocument();
  });

  it("shows a threshold-met indicator when total votes exceed the minimum", () => {
    render(
      <VoteBar
        yesVotes={100_00000000n}
        noVotes={20_00000000n}
        minVoteThreshold={50_00000000n}
      />,
    );
    expect(screen.getByText(/threshold met/i)).toBeInTheDocument();
  });

  it("shows a threshold-not-met indicator when total votes are below the minimum", () => {
    render(
      <VoteBar yesVotes={10_00000000n} noVotes={5_00000000n} minVoteThreshold={50_00000000n} />,
    );
    expect(screen.getByText(/threshold not yet met/i)).toBeInTheDocument();
  });

  it("renders a zero-width bar without dividing by zero when there are no votes", () => {
    render(<VoteBar yesVotes={0n} noVotes={0n} minVoteThreshold={100n} />);
    expect(screen.getByText(/0 APT for/i)).toBeInTheDocument();
  });
});
