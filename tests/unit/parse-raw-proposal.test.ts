import { describe, expect, it } from "vitest";
import {
  decodeMetadataLocation,
  parseRawProposalCore,
  buildProposalListItem,
} from "~/lib/governance/parse-raw-proposal";
import type { RawProposal } from "~/lib/governance/types";

const REAL_RAW_PROPOSAL: RawProposal = {
  creation_time_secs: "1782168501",
  early_resolution_vote_threshold: { vec: ["60229252106793881"] },
  execution_content: { vec: [{ dummy_field: false }] },
  execution_hash:
    "0x1d7165849ba6d59630992eafb972ac83c997a65670192a93d95503f8c8e35447",
  expiration_secs: "1782427701",
  is_resolved: true,
  metadata: {
    data: [
      {
        key: "metadata_location",
        value:
          "0x68747470733a2f2f7261772e67697468756275736572636f6e74656e742e636f6d2f6170746f732d666f756e646174696f6e2f6d61696e6e65742d70726f706f73616c732f726566732f68656164732f6d61696e2f6d657461646174612f323032362d30362d32322d656e61626c652d7472616e73616374696f6e2d6c696d6974732f656e61626c652d7472616e73616374696f6e2d6c696d6974732e6a736f6e",
      },
      {
        key: "metadata_hash",
        value:
          "0x63626330376439363530646338383336663137636439393039316638633033333166623765633333643638323562323034393066356235616635353433386138",
      },
      { key: "IS_MULTI_STEP_PROPOSAL_KEY", value: "0x01" },
      { key: "IS_MULTI_STEP_PROPOSAL_IN_EXECUTION", value: "0x00" },
      { key: "RESOLVABLE_TIME_METADATA_KEY", value: "0x36a83d6a00000000" },
    ],
  },
  min_vote_threshold: "30000000000000000",
  no_votes: "144947835464",
  proposer:
    "0xdb009ab1a3259c4b27a0d8ff9d0e913e13e4c8b657fc73768f4e9bb811c7a1d8",
  resolution_time_secs: "1782509324",
  yes_votes: "36993524951380141",
};

describe("decodeMetadataLocation", () => {
  it("decodes the real hex-encoded metadata_location to its URL", () => {
    const entry = REAL_RAW_PROPOSAL.metadata.data.find(
      (e) => e.key === "metadata_location",
    )!;
    expect(decodeMetadataLocation(entry.value)).toBe(
      "https://raw.githubusercontent.com/aptos-foundation/mainnet-proposals/refs/heads/main/metadata/2026-06-22-enable-transaction-limits/enable-transaction-limits.json",
    );
  });
});

describe("parseRawProposalCore", () => {
  it("converts every numeric field to bigint and extracts metadata fields", () => {
    const core = parseRawProposalCore("200", REAL_RAW_PROPOSAL);

    expect(core.proposalId).toBe("200");
    expect(core.proposer).toBe(
      "0xdb009ab1a3259c4b27a0d8ff9d0e913e13e4c8b657fc73768f4e9bb811c7a1d8",
    );
    expect(core.isResolved).toBe(true);
    expect(core.creationTimeSecs).toBe(1782168501n);
    expect(core.expirationSecs).toBe(1782427701n);
    expect(core.resolutionTimeSecs).toBe(1782509324n);
    expect(core.minVoteThreshold).toBe(30000000000000000n);
    expect(core.earlyResolutionVoteThreshold).toBe(60229252106793881n);
    expect(core.yesVotes).toBe(36993524951380141n);
    expect(core.noVotes).toBe(144947835464n);
    expect(core.metadataLocation).toBe(
      "https://raw.githubusercontent.com/aptos-foundation/mainnet-proposals/refs/heads/main/metadata/2026-06-22-enable-transaction-limits/enable-transaction-limits.json",
    );
    expect(core.metadataHashHex).toBe(
      "0x63626330376439363530646338383336663137636439393039316638633033333166623765633333643638323562323034393066356235616635353433386138",
    );
  });

  it("returns resolutionTimeSecs=null for an unresolved proposal", () => {
    const unresolved: RawProposal = {
      ...REAL_RAW_PROPOSAL,
      is_resolved: false,
      resolution_time_secs: "0",
    };
    expect(parseRawProposalCore("201", unresolved).resolutionTimeSecs).toBeNull();
  });

  it("returns earlyResolutionVoteThreshold=null when the option vec is empty", () => {
    const noThreshold: RawProposal = {
      ...REAL_RAW_PROPOSAL,
      early_resolution_vote_threshold: { vec: [] },
    };
    expect(
      parseRawProposalCore("202", noThreshold).earlyResolutionVoteThreshold,
    ).toBeNull();
  });
});

describe("buildProposalListItem", () => {
  it("derives status=executed for the real resolved proposal", () => {
    const core = parseRawProposalCore("200", REAL_RAW_PROPOSAL);
    const item = buildProposalListItem(
      core,
      { verified: false, reason: "not fetched in this test" },
      0n,
    );
    expect(item.status).toBe("executed");
    expect(item.yesVotes).toBe(36993524951380141n);
  });
});