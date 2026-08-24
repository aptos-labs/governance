// src/lib/governance/fetch-proposals.ts
import {createServerFn} from "@tanstack/react-start";
import {z} from "zod";
import {
  APTOS_GOVERNANCE_ADDRESS,
  getAptosClient,
  VOTING_FORUM_PROPOSAL_VALUE_TYPE,
  VOTING_FORUM_RESOURCE_TYPE,
} from "~/lib/aptos/client";
import {fetchAndVerifyProposalMetadata} from "~/lib/governance/metadata";
import {
  buildProposalListItem,
  parseRawProposalCore,
} from "~/lib/governance/parse-raw-proposal";
import type {ProposalListItem, RawProposal} from "~/lib/governance/types";

const PAGE_SIZE = 20;

const listProposalsInputSchema = z.object({
  page: z.number().int().min(0).default(0),
});

interface VotingForumResource {
  next_proposal_id: string;
  proposals: {handle: string};
}

export interface ListProposalsResult {
  items: ProposalListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Lists proposals most-recent-first. Proposal ids are sequential from 0
 * to next_proposal_id - 1 (confirmed against the live VotingForum
 * resource on mainnet on 2026-08-20) — "listing" means picking a slice
 * of that id range and fetching each proposal from the proposals table.
 */
export const listProposals = createServerFn({method: "GET"})
  .validator(listProposalsInputSchema)
  .handler(async ({data}): Promise<ListProposalsResult> => {
    const aptos = getAptosClient();

    const forum = await aptos.getAccountResource<VotingForumResource>({
      accountAddress: APTOS_GOVERNANCE_ADDRESS,
      resourceType: VOTING_FORUM_RESOURCE_TYPE,
    });

    const totalCount = Number(forum.next_proposal_id);
    const nowSecs = BigInt(Math.floor(Date.now() / 1000));

    const highestId = totalCount - 1 - data.page * PAGE_SIZE;
    const lowestId = Math.max(0, highestId - PAGE_SIZE + 1);

    if (highestId < 0) {
      return {items: [], totalCount, page: data.page, pageSize: PAGE_SIZE};
    }

    const ids: number[] = [];
    for (let id = highestId; id >= lowestId; id--) {
      ids.push(id);
    }

    const items = await Promise.all(
      ids.map(async (id) => {
        const raw = await aptos.getTableItem<RawProposal>({
          handle: forum.proposals.handle,
          data: {
            key_type: "u64",
            value_type: VOTING_FORUM_PROPOSAL_VALUE_TYPE,
            key: id.toString(),
          },
        });

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

    return {items, totalCount, page: data.page, pageSize: PAGE_SIZE};
  });
