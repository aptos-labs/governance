// src/lib/governance/metadata.ts
// NOTE: @noble/hashes@2.x requires the explicit .js extension on subpath
// imports (its package.json "exports" map only defines "./sha3.js" and
// "./utils.js", not the extensionless "./sha3"/"./utils" that worked on
// older majors).
import {sha3_256} from "@noble/hashes/sha3.js";
import {bytesToHex} from "@noble/hashes/utils.js";
import {metadataCache, metadataMissCache} from "~/lib/governance/server-cache";
import type {
  MetadataVerificationResult,
  ProposalMetadata,
} from "~/lib/governance/types";

const MAX_METADATA_BYTES = 1_000_000; // 1 MB bound — see fetchAndVerifyProposalMetadata
const FETCH_TIMEOUT_MS = 8_000;

/**
 * Decodes the on-chain metadata_hash (hex-of-ASCII-hex-digest, confirmed
 * against a real mainnet proposal) into the plain lowercase hex digest
 * string it represents.
 */
function decodeOnChainHash(expectedHashHex: string): string {
  const clean = expectedHashHex.startsWith("0x")
    ? expectedHashHex.slice(2)
    : expectedHashHex;
  const bytes = Buffer.from(clean, "hex");
  return bytes.toString("ascii").toLowerCase();
}

/** Concatenates chunks read from a ReadableStream into one contiguous buffer. */
function concatChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

function isProposalMetadata(value: unknown): value is ProposalMetadata {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === "string" &&
    typeof v.description === "string" &&
    typeof v.source_code_url === "string" &&
    typeof v.discussion_url === "string"
  );
}

/**
 * Verifies raw metadata text against the on-chain hash. Pure and
 * synchronous — no network access — so it's trivially unit-testable
 * and reusable regardless of how the text was obtained.
 */
export function verifyProposalMetadata(
  rawText: string,
  expectedHashHex: string,
): MetadataVerificationResult {
  const computedDigest = bytesToHex(
    sha3_256(new TextEncoder().encode(rawText)),
  );
  const expectedDigest = decodeOnChainHash(expectedHashHex);

  if (computedDigest !== expectedDigest) {
    return {
      verified: false,
      reason: `metadata hash mismatch: computed ${computedDigest} but on-chain value is ${expectedDigest}`,
      rawText,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      verified: false,
      reason: "metadata hash matched but body is not valid JSON",
      rawText,
    };
  }

  if (!isProposalMetadata(parsed)) {
    return {
      verified: false,
      reason:
        "metadata hash matched but JSON is missing required fields (title, description, source_code_url, discussion_url)",
      rawText,
    };
  }

  return {verified: true, metadata: parsed};
}

/**
 * Fetches metadata_location with a timeout and a response-size bound
 * (defense against a malicious/huge metadata_location being used as an
 * amplification vector), then verifies it. Never throws — every failure
 * path returns { verified: false, reason } so callers always get an
 * explicit "unverified" state to show, per design spec §5.3/§10.
 */
export async function fetchAndVerifyProposalMetadata(
  locationUrl: string,
  expectedHashHex: string,
): Promise<MetadataVerificationResult> {
  const cacheKey = `${expectedHashHex}:${locationUrl}`;
  const cached = (metadataCache.get(cacheKey) ??
    metadataMissCache.get(cacheKey)) as MetadataVerificationResult | undefined;
  if (cached) return cached;

  const result = (await metadataMissCache.getOrSet(cacheKey, () =>
    fetchAndVerifyProposalMetadataUncached(locationUrl, expectedHashHex),
  )) as MetadataVerificationResult;

  if (result.verified) {
    metadataCache.set(cacheKey, result);
  }
  return result;
}

async function fetchAndVerifyProposalMetadataUncached(
  locationUrl: string,
  expectedHashHex: string,
): Promise<MetadataVerificationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(locationUrl, {
      signal: controller.signal,
      redirect: "follow",
    });

    if (!response.ok) {
      return {
        verified: false,
        reason: `metadata fetch failed with HTTP ${response.status}`,
      };
    }

    // Enforce MAX_METADATA_BYTES while reading, not after buffering the
    // whole body: response.text() would read an arbitrarily large body
    // into memory before any check ran, defeating the amplification
    // defense entirely. Read the stream in chunks and abort as soon as
    // the byte count (not UTF-16 character count, which undercounts for
    // multi-byte content) exceeds the limit.
    if (!response.body) {
      return {
        verified: false,
        reason: "metadata response had no readable body",
      };
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_METADATA_BYTES) {
          await reader.cancel(
            `metadata response exceeded ${MAX_METADATA_BYTES} byte limit`,
          );
          return {
            verified: false,
            reason: `metadata response exceeded ${MAX_METADATA_BYTES} byte limit`,
          };
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const text = new TextDecoder("utf-8").decode(
      concatChunks(chunks, totalBytes),
    );

    return verifyProposalMetadata(text, expectedHashHex);
  } catch (error) {
    return {
      verified: false,
      reason: `metadata fetch threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
