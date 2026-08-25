// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, beforeAll, describe, expect, it} from "vitest";
import {ProposalsTable} from "~/components/ProposalsTable";
import type {ProposalListItem} from "~/lib/governance/types";

beforeAll(() => {
  window.scrollTo = () => {
    /* jsdom stub */
  };
});

const longErrorReason =
  "Failed to load metadata from https://raw.githubusercontent.com/aptos-foundation/mainnet-proposals/refs/heads/main/metadata/this-path-is-intentionally-very-long-so-it-would-blow-out-a-nowrap-table-row/metadata.json: hash mismatch deadbeef".repeat(
    3,
  );

function makeProposal(
  overrides: Partial<ProposalListItem> = {},
): ProposalListItem {
  return {
    proposalId: "142",
    proposer:
      "0xdb009ab1a3259c4b27a0d8ff9d0e913e13e4c8b657fc73768f4e9bb811c7a1d8",
    status: "active",
    creationTimeSecs: 1_700_000_000n,
    expirationSecs: 1_700_086_400n,
    resolutionTimeSecs: null,
    minVoteThreshold: 100n,
    earlyResolutionVoteThreshold: null,
    yesVotes: 80n,
    noVotes: 10n,
    executionHash: "0x00",
    metadataLocation: "https://example.com/meta.json",
    metadataHashHex: "0xdead",
    metadataResult: {
      verified: true,
      metadata: {
        title: "Aptos Improvement Proposal 142",
        description: "desc",
        source_code_url: "https://example.com/src",
        discussion_url: "https://example.com/discuss",
      },
    },
    ...overrides,
  };
}

function renderWithRouter(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => ui,
  });
  const proposalRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/proposal/$proposalId",
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, proposalRoute]),
    history: createMemoryHistory({initialEntries: ["/"]}),
  });
  return render(<RouterProvider router={router} />);
}

describe("ProposalsTable", () => {
  afterEach(cleanup);

  it("keeps the desktop table behind an xl breakpoint so thin viewports use the stacked list", async () => {
    renderWithRouter(<ProposalsTable proposals={[makeProposal()]} />);

    const table = await screen.findByTestId("proposals-table");
    expect(table.className).toMatch(/\bhidden\b/);
    expect(table.className).toMatch(/\bxl:block\b/);

    const mobile = screen.getByTestId("proposals-mobile-list");
    expect(mobile.className).toMatch(/\bxl:hidden\b/);
  });

  it("renders the same proposals in the stacked mobile list", async () => {
    renderWithRouter(
      <ProposalsTable
        proposals={[
          makeProposal({proposalId: "142"}),
          makeProposal({
            proposalId: "138",
            metadataResult: {verified: false, reason: "hash mismatch"},
          }),
        ]}
      />,
    );

    const mobile = await screen.findByTestId("proposals-mobile-list");
    expect(mobile).toHaveTextContent("Aptos Improvement Proposal 142");
    expect(mobile).toHaveTextContent("Proposal #138");
    expect(mobile.querySelectorAll("a")).toHaveLength(2);
    expect(mobile.querySelector("a")?.getAttribute("href")).toBe(
      "/proposal/142?votesPage=0",
    );
  });

  it("does not dump a long unverified-metadata error into a nowrap table cell", async () => {
    const errored = makeProposal({
      proposalId: "138",
      metadataResult: {verified: false, reason: longErrorReason},
    });
    renderWithRouter(<ProposalsTable proposals={[errored]} />);

    expect(await screen.findByTestId("proposals-table")).toBeInTheDocument();
    expect(screen.queryByText(longErrorReason)).not.toBeInTheDocument();
    expect(screen.getAllByText("Proposal #138").length).toBeGreaterThan(0);

    const errorNotes = screen.getAllByText(/metadata unverified/i);
    expect(errorNotes.length).toBeGreaterThan(0);
    for (const note of errorNotes) {
      expect(note.className).toMatch(/truncate/);
      expect(note).toHaveAttribute("title", longErrorReason);
    }
  });
});
