// src/lib/governance/fetch-proposal.ts
import {createServerFn} from "@tanstack/react-start";
import {z} from "zod";
import {
  APTOS_GOVERNANCE_ADDRESS,
  getAptosClient,
  VOTING_FORUM_PROPOSAL_VALUE_TYPE,
  VOTING_FORUM_RESOURCE_TYPE,
} from "~/lib/aptos/client";
import {
  fetchProposalVotes,
  type ProposalVoteRow,
} from "~/lib/governance/fetch-proposal-votes";
import {fetchAndVerifyProposalMetadata} from "~/lib/governance/metadata";
import {
  buildProposalListItem,
  parseRawProposalCore,
} from "~/lib/governance/parse-raw-proposal";
import type {ProposalListItem, RawProposal} from "~/lib/governance/types";

const getProposalInputSchema = z.object({
  proposalId: z
    .string()
    .regex(/^\d+$/, "proposalId must be a non-negative integer string"),
});

interface VotingForumResource {
  next_proposal_id: string;
  proposals: {handle: string};
}

export interface ProposalDetailResult {
  proposal: ProposalListItem;
  votes: ProposalVoteRow[];
}

export const getProposalDetail = createServerFn({method: "GET"})
  .validator(getProposalInputSchema)
  .handler(async ({data}): Promise<ProposalDetailResult> => {
    const aptos = getAptosClient();

    const forum = await aptos.getAccountResource<VotingForumResource>({
      accountAddress: APTOS_GOVERNANCE_ADDRESS,
      resourceType: VOTING_FORUM_RESOURCE_TYPE,
    });

    const nextProposalId = BigInt(forum.next_proposal_id);
    if (BigInt(data.proposalId) >= nextProposalId) {
      throw new Error(
        `Proposal ${data.proposalId} does not exist (only 0..${(nextProposalId - 1n).toString()} exist)`,
      );
    }

    const [raw, votes] = await Promise.all([
      aptos.getTableItem<RawProposal>({
        handle: forum.proposals.handle,
        data: {
          key_type: "u64",
          value_type: VOTING_FORUM_PROPOSAL_VALUE_TYPE,
          key: data.proposalId,
        },
      }),
      // Indexer failure degrades to an empty vote list rather than
      // failing the whole page — the fullnode-sourced yes/no tally
      // fetched above remains authoritative either way (design spec §6.3).
      fetchProposalVotes(data.proposalId).catch(() => [] as ProposalVoteRow[]),
    ]);

    const core = parseRawProposalCore(data.proposalId, raw);
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
  });
