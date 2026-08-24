// tests/unit/indexer-client.test.ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { executeIndexerQuery } from "~/lib/governance/indexer-client";

describe("executeIndexerQuery", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("posts the query/variables and returns the data field", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ data: { proposal_votes: [{ num_votes: "5" }] } }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const result = await executeIndexerQuery<{
      proposal_votes: Array<{ num_votes: string }>;
    }>("query Foo { proposal_votes { num_votes } }", { proposalId: "1" });

    expect(result.proposal_votes[0].num_votes).toBe("5");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.mainnet.aptoslabs.com/v1/graphql",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws a descriptive error when the GraphQL response contains errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          errors: [{ message: "field 'bogus' not found" }],
        }),
    }) as unknown as typeof fetch;

    await expect(
      executeIndexerQuery("query Foo { bogus }"),
    ).rejects.toThrow(/bogus/);
  });

  it("throws a descriptive error on a non-OK HTTP response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    await expect(executeIndexerQuery("query Foo { x }")).rejects.toThrow(
      /429/,
    );
  });
});