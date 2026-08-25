import {afterEach, describe, expect, it, vi} from "vitest";
import {
  fetchProposalVotesPage,
  PROPOSAL_VOTES_PAGE_SIZE,
} from "~/lib/governance/fetch-proposal-votes";
import {resetServerCachesForTests} from "~/lib/governance/server-cache";

describe("fetchProposalVotesPage", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    resetServerCachesForTests();
  });

  it("requests a 20-row page and returns the aggregate count", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            proposal_votes: [
              {
                staking_pool_address: "0xabc",
                should_pass: true,
                num_votes: "100000000",
              },
            ],
            proposal_votes_aggregate: {aggregate: {count: 41}},
          },
        }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const page = await fetchProposalVotesPage("12", {page: 1});

    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(PROPOSAL_VOTES_PAGE_SIZE);
    expect(page.totalCount).toBe(41);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].numVotes).toBe(100000000n);

    const body = JSON.parse(
      (mockFetch.mock.calls[0][1] as {body: string}).body,
    ) as {variables: {limit: number; offset: number; proposalId: string}};
    expect(body.variables.limit).toBe(20);
    expect(body.variables.offset).toBe(20);
    expect(body.variables.proposalId).toBe("12");
  });

  it("serves a cached page on the second call", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            proposal_votes: [],
            proposal_votes_aggregate: {aggregate: {count: 0}},
          },
        }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await fetchProposalVotesPage("12", {page: 0});
    await fetchProposalVotesPage("12", {page: 0});
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
