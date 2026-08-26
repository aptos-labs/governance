// src/lib/governance/fetch-proposal.ts
import {createServerFn} from "@tanstack/react-start";
import {z} from "zod";
import {
  getAptosClient,
  VOTING_FORUM_PROPOSAL_VALUE_TYPE,
} from "~/lib/aptos/client";
import {
  fetchProposalVotesPage,
  PROPOSAL_VOTES_PAGE_SIZE,
  type ProposalVotesPage,
} from "~/lib/governance/fetch-proposal-votes";
import {loadVotingForum} from "~/lib/governance/load-forum";
import {fetchAndVerifyProposalMetadata} from "~/lib/governance/metadata";
import {
  buildProposalListItem,
  parseRawProposalCore,
} from "~/lib/governance/parse-raw-proposal";
import {proposalItemCache} from "~/lib/governance/server-cache";
import type {ProposalListItem, RawProposal} from "~/lib/governance/types";

const getProposalInputSchema = z.object({
  proposalId: z
    .string()
    .regex(/^\d+$/, "proposalId must be a non-negative integer string"),
  votesPage: z.number().int().min(0).default(0),
});

export interface ProposalDetailResult {
  proposal: ProposalListItem;
  votes: ProposalVotesPage;
}

export async function loadProposalDetail(
  proposalId: string,
  votesPage = 0,
): Promise<ProposalDetailResult> {
  const forum = await loadVotingForum();

  const nextProposalId = BigInt(forum.next_proposal_id);
  if (BigInt(proposalId) >= nextProposalId) {
    throw new Error(
      `Proposal ${proposalId} does not exist (only 0..${(nextProposalId - 1n).toString()} exist)`,
    );
  }

  const aptos = getAptosClient();

  const [raw, votes] = await Promise.all([
    proposalItemCache.getOrSet(proposalId, async () =>
      aptos.getTableItem<RawProposal>({
        handle: forum.proposals.handle,
        data: {
          key_type: "u64",
          value_type: VOTING_FORUM_PROPOSAL_VALUE_TYPE,
          key: proposalId,
        },
      }),
    ) as Promise<RawProposal>,
    // Indexer failure degrades to an empty vote list rather than
    // failing the whole page — the fullnode-sourced yes/no tally
    // fetched above remains authoritative either way (design spec §6.3).
    fetchProposalVotesPage(proposalId, {
      page: votesPage,
      pageSize: PROPOSAL_VOTES_PAGE_SIZE,
    }).catch(
      (): ProposalVotesPage => ({
        items: [],
        totalCount: 0,
        page: votesPage,
        pageSize: PROPOSAL_VOTES_PAGE_SIZE,
      }),
    ),
  ]);

  const core = parseRawProposalCore(proposalId, raw);
  const nowSecs = BigInt(Math.floor(Date.now() / 1000));

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

  return {
    proposal: buildProposalListItem(core, metadataResult, nowSecs),
    votes,
  };
}

export const getProposalDetail = createServerFn({method: "GET"})
  .validator(getProposalInputSchema)
  .handler(async ({data}): Promise<ProposalDetailResult> => {
    return loadProposalDetail(data.proposalId, data.votesPage);
  });
