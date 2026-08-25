// tests/unit/indexer-client.test.ts
import {afterEach, describe, expect, it, vi} from "vitest";
import {executeIndexerQuery} from "~/lib/governance/indexer-client";

const ENV_NAMES = [
  "APTOS_BUILD_API_KEY",
  "GEOMI_API_KEY",
  "VITE_APTOS_BUILD_API_KEY",
  "VITE_GEOMI_API_KEY",
  "VITE_APTOS_API_KEY_MAINNET",
  "VITE_APTOS_API_KEY",
  "APTOS_API_KEY",
  "APTOS_INDEXER_URL",
  "VITE_GEOMI_INDEXER_URL",
] as const;

const originalEnv: Record<string, string | undefined> = {};

function snapshotEnv() {
  for (const name of ENV_NAMES) {
    if (!(name in originalEnv)) originalEnv[name] = process.env[name];
    delete process.env[name];
  }
}

function restoreEnv() {
  for (const name of ENV_NAMES) {
    const value = originalEnv[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

describe("executeIndexerQuery", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    restoreEnv();
  });

  it("posts the query/variables and returns the data field", async () => {
    snapshotEnv();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({data: {proposal_votes: [{num_votes: "5"}]}}),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const result = await executeIndexerQuery<{
      proposal_votes: Array<{num_votes: string}>;
    }>("query Foo { proposal_votes { num_votes } }", {proposalId: "1"});

    expect(result.proposal_votes[0].num_votes).toBe("5");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.mainnet.aptoslabs.com/v1/graphql",
      expect.objectContaining({method: "POST"}),
    );
  });

  it("sends a Bearer API key when one is configured", async () => {
    snapshotEnv();
    process.env.APTOS_BUILD_API_KEY = "aptoslabs_server_key";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({data: {ok: true}}),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await executeIndexerQuery("query Foo { x }");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.mainnet.aptoslabs.com/v1/graphql",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer aptoslabs_server_key",
        }),
      }),
    );
  });

  it("throws a descriptive error when the GraphQL response contains errors", async () => {
    snapshotEnv();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          errors: [{message: "field 'bogus' not found"}],
        }),
    }) as unknown as typeof fetch;

    await expect(executeIndexerQuery("query Foo { bogus }")).rejects.toThrow(
      /bogus/,
    );
  });

  it("throws a descriptive error on a non-OK HTTP response", async () => {
    snapshotEnv();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    await expect(executeIndexerQuery("query Foo { x }")).rejects.toThrow(/429/);
  });
});
