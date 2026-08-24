// tests/unit/ProposalCard.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ProposalCard } from "~/components/ProposalCard";
import type { ProposalListItem } from "~/lib/governance/types";

// jsdom does not implement window.scrollTo — TanStack Router's scroll
// restoration calls it on every render, which otherwise logs
// "Not implemented: Window's scrollTo() method" noise to stderr on
// every test in this file. Stub it so test output stays pristine.
beforeAll(() => {
  window.scrollTo = () => {};
});

const baseProposal: ProposalListItem = {
  proposalId: "142",
  proposer: "0xabc",
  status: "active",
  creationTimeSecs: 0n,
  expirationSecs: 1000n,
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
};

/**
 * Renders a component that uses TanStack Router's <Link> inside a real
 * (memory-history) router, since Link throws when rendered outside a
 * RouterProvider. Builds just enough of a route tree (index route +
 * the proposal-detail route ProposalCard links to) for the component
 * under test to resolve its <Link to="/proposal/$proposalId">.
 */
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
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("ProposalCard", () => {
  afterEach(cleanup);

  it("renders the verified title, id, and status", async () => {
    renderWithRouter(<ProposalCard proposal={baseProposal} nowSecs={500n} />);
    expect(
      await screen.findByText("Aptos Improvement Proposal 142"),
    ).toBeInTheDocument();
    expect(screen.getByText("#142")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows time remaining for an active proposal", async () => {
    renderWithRouter(<ProposalCard proposal={baseProposal} nowSecs={500n} />);
    expect(await screen.findByText(/ends in/i)).toBeInTheDocument();
  });

  it("shows a generic fallback title when metadata is unverified", async () => {
    const unverified: ProposalListItem = {
      ...baseProposal,
      metadataResult: { verified: false, reason: "hash mismatch" },
    };
    renderWithRouter(<ProposalCard proposal={unverified} nowSecs={500n} />);
    expect(await screen.findByText(/proposal #142/i)).toBeInTheDocument();
    expect(screen.getByText(/metadata unverified/i)).toBeInTheDocument();
  });

  it("links to the proposal detail page", async () => {
    renderWithRouter(<ProposalCard proposal={baseProposal} nowSecs={500n} />);
    const link = await screen.findByRole("link");
    expect(link).toHaveAttribute("href", "/proposal/142");
  });
});
