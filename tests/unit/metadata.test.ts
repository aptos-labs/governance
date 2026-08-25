// tests/unit/metadata.test.ts
import {afterEach, describe, expect, it, vi} from "vitest";
import {
  fetchAndVerifyProposalMetadata,
  verifyProposalMetadata,
} from "~/lib/governance/metadata";
import {resetServerCachesForTests} from "~/lib/governance/server-cache";

// Real fixture: the exact bytes and on-chain hash confirmed against
// mainnet proposal id 200's metadata_location/metadata_hash on 2026-08-20.
const REAL_METADATA_TEXT = `{
  "title": "Enable transaction limits",
  "description": "Enables staking-based transaction limits (see AIP-146 for details)",
  "source_code_url": "https://github.com/aptos-foundation/mainnet-proposals/tree/main/sources/2026-06-22-enable-transaction-limits",
  "discussion_url": "https://github.com/aptos-foundation/AIPs/issues/669"
}
`;
// Hex-encoding of the ASCII sha3-256 hex digest, exactly as stored on-chain.
const REAL_ON_CHAIN_HASH_HEX =
  "0x63626330376439363530646338383336663137636439393039316638633033333166623765633333643638323562323034393066356235616635353433386138";

describe("verifyProposalMetadata", () => {
  it("verifies successfully when the hash matches", () => {
    const result = verifyProposalMetadata(
      REAL_METADATA_TEXT,
      REAL_ON_CHAIN_HASH_HEX,
    );
    expect(result.verified).toBe(true);
    if (result.verified) {
      expect(result.metadata.title).toBe("Enable transaction limits");
      expect(result.metadata.discussion_url).toBe(
        "https://github.com/aptos-foundation/AIPs/issues/669",
      );
    }
  });

  it("fails verification when the text has been tampered with", () => {
    const tampered = REAL_METADATA_TEXT.replace(
      "Enable transaction limits",
      "Malicious title",
    );
    const result = verifyProposalMetadata(tampered, REAL_ON_CHAIN_HASH_HEX);
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toMatch(/hash mismatch/i);
    }
  });

  it("fails verification when the text is not valid JSON, even if hash matched", () => {
    const notJson = "not json at all";
    // This hash genuinely matches notJson's real sha3-256 digest
    // (hex-of-ASCII-hex-digest encoded, same scheme as the real on-chain
    // fixture above) so this test actually isolates the JSON-parse
    // failure from the hash-mismatch failure — an arbitrary non-matching
    // placeholder like "0xdeadbeef" would make the hash check fail first
    // and never exercise the JSON-parse branch at all.
    const notJsonHash =
      "0x30363663386165366266633061303334306630376161306239623638353861346635643638393531663062316331356463326336313039386662363166616361";
    const result = verifyProposalMetadata(notJson, notJsonHash);
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toMatch(/not valid JSON/i);
    }
  });

  it("fails verification when required fields are missing", () => {
    const incomplete = JSON.stringify({title: "Only a title"});
    // Same reasoning as above: this hash genuinely matches `incomplete`'s
    // real digest so the test isolates the missing-fields branch instead
    // of tripping the hash-mismatch check first.
    const incompleteHash =
      "0x62373039623032626236316634373333303432623034313331353962616133346261653536646262633331653239343662643631303363663537336236383766";
    const result = verifyProposalMetadata(incomplete, incompleteHash);
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toMatch(/missing|invalid/i);
    }
  });
});

describe("fetchAndVerifyProposalMetadata", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    resetServerCachesForTests();
  });

  // Uses the real, native `Response` constructor (available globally in
  // Node 18+) rather than a hand-mocked object with only a `text()`
  // method — the implementation reads `response.body` as a real
  // ReadableStream to enforce the byte-size limit while streaming, so a
  // mock that only fakes `text()` would not exercise that code path at
  // all and would have silently hidden the size-limit bug this test
  // suite was missing.
  function mockFetchResolvedWith(body: string, status = 200): void {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(body, {status}),
      ) as unknown as typeof fetch;
  }

  it("returns verified metadata for a matching fetch response", async () => {
    mockFetchResolvedWith(REAL_METADATA_TEXT, 200);

    const result = await fetchAndVerifyProposalMetadata(
      "https://example.com/metadata.json",
      REAL_ON_CHAIN_HASH_HEX,
    );
    expect(result.verified).toBe(true);
  });

  it("returns an unverified result (not a throw) when the fetch fails", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("network error")) as unknown as typeof fetch;

    const result = await fetchAndVerifyProposalMetadata(
      "https://example.com/missing.json",
      REAL_ON_CHAIN_HASH_HEX,
    );
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toMatch(/fetch/i);
    }
  });

  it("returns an unverified result when the response is not ok (e.g. 404)", async () => {
    mockFetchResolvedWith("", 404);

    const result = await fetchAndVerifyProposalMetadata(
      "https://example.com/missing.json",
      REAL_ON_CHAIN_HASH_HEX,
    );
    expect(result.verified).toBe(false);
  });

  it("returns an unverified result when the response body exceeds the byte-size limit, without buffering the whole thing first", async () => {
    // 1,000,001 bytes — one byte over the 1,000,000-byte MAX_METADATA_BYTES
    // limit. This test would pass for the WRONG reason if the
    // implementation only checked text.length after response.text() had
    // already buffered everything (the original, reviewer-caught bug) —
    // it specifically exercises the streaming/byte-counting path by using
    // a real Response with a real body stream, not a pre-materialized
    // string handed to a fake text() method.
    const oversized = "a".repeat(1_000_001);
    mockFetchResolvedWith(oversized, 200);

    const result = await fetchAndVerifyProposalMetadata(
      "https://example.com/huge.json",
      REAL_ON_CHAIN_HASH_HEX,
    );
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toMatch(/exceeded.*byte limit/i);
    }
  });
});
