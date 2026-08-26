// src/lib/governance/fetch-proposals.ts
import {createServerFn} from "@tanstack/react-start";
import {z} from "zod";
import {
  getAptosClient,
  VOTING_FORUM_PROPOSAL_VALUE_TYPE,
} from "~/lib/aptos/client";
import {loadVotingForum} from "~/lib/governance/load-forum";
import {fetchAndVerifyProposalMetadata} from "~/lib/governance/metadata";
import {
  buildProposalListItem,
  parseRawProposalCore,
} from "~/lib/governance/parse-raw-proposal";
import {
  proposalItemCache,
  proposalListCache,
} from "~/lib/governance/server-cache";
import type {ProposalListItem, RawProposal} from "~/lib/governance/types";

const PAGE_SIZE = 20;

const listProposalsInputSchema = z.object({
  page: z.number().int().min(0).default(0),
});

export interface ListProposalsResult {
  items: ProposalListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

async function loadRawProposal(
  handle: string,
  id: string,
): Promise<RawProposal> {
  return proposalItemCache.getOrSet(id, async () => {
    const aptos = getAptosClient();
    return aptos.getTableItem<RawProposal>({
      handle,
      data: {
        key_type: "u64",
        value_type: VOTING_FORUM_PROPOSAL_VALUE_TYPE,
        key: id,
      },
    });
  }) as Promise<RawProposal>;
}

/**
 * Lists proposals most-recent-first. Proposal ids are sequential from 0
 * to next_proposal_id - 1 (confirmed against the live VotingForum
 * resource on mainnet on 2026-08-20) — "listing" means picking a slice
 * of that id range and fetching each proposal from the proposals table.
 */
export async function loadProposalListPage(
  page: number,
): Promise<ListProposalsResult> {
  return proposalListCache.getOrSet(`page:${page}`, async () => {
    const forum = await loadVotingForum();

    const totalCount = Number(forum.next_proposal_id);
    const nowSecs = BigInt(Math.floor(Date.now() / 1000));

    const highestId = totalCount - 1 - page * PAGE_SIZE;
    const lowestId = Math.max(0, highestId - PAGE_SIZE + 1);

    if (highestId < 0) {
      return {items: [], totalCount, page, pageSize: PAGE_SIZE};
    }

    const ids: number[] = [];
    for (let id = highestId; id >= lowestId; id--) {
      ids.push(id);
    }

    const items = await Promise.all(
      ids.map(async (id) => {
        const raw = await loadRawProposal(
          forum.proposals.handle,
          id.toString(),
        );
        const core = parseRawProposalCore(id.toString(), raw);

        const metadataResult =
          core.metadataLocation && core.metadataHashHex
            ? await fetchAndVerifyProposalMetadata(
                core.metadataLocation,
                core.metadataHashHex,
              )
            : {
                verified: false as const,
                reason: "proposal has no metadata_location/metadata_hash set",
              };

        return buildProposalListItem(core, metadataResult, nowSecs);
      }),
    );

    return {items, totalCount, page, pageSize: PAGE_SIZE};
  }) as Promise<ListProposalsResult>;
}

export const listProposals = createServerFn({method: "GET"})
  .validator(listProposalsInputSchema)
  .handler(async ({data}): Promise<ListProposalsResult> => {
    return loadProposalListPage(data.page);
  });
