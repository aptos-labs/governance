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
import {proposalItemCache} from "~/lib/governance/server-cache";
import type {RawProposal} from "~/lib/governance/types";
import type {WatchedProposal} from "~/lib/notifications/types";
import {proposalTitle} from "~/lib/notifications/types";

const FETCH_CONCURRENCY = 8;

export async function loadForumForNotifications(): Promise<{
  nextProposalId: number;
  handle: string;
}> {
  const forum = await loadVotingForum();
  return {
    nextProposalId: Number(forum.next_proposal_id),
    handle: forum.proposals.handle,
  };
}

async function loadRawProposal(
  handle: string,
  id: string,
): Promise<RawProposal> {
  return proposalItemCache.getOrSet(`notifications:${id}`, async () => {
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

export async function loadWatchedProposals(
  handle: string,
  ids: string[],
  nowSecs: bigint,
): Promise<WatchedProposal[]> {
  const items: WatchedProposal[] = [];

  for (let i = 0; i < ids.length; i += FETCH_CONCURRENCY) {
    const batch = ids.slice(i, i + FETCH_CONCURRENCY);
    const loaded = await Promise.all(
      batch.map(async (id) => {
        try {
          const raw = await loadRawProposal(handle, id);
          const core = parseRawProposalCore(id, raw);
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
          const proposal = buildProposalListItem(core, metadataResult, nowSecs);
          const watched: WatchedProposal = {
            proposalId: proposal.proposalId,
            status: proposal.status,
            title: proposalTitle(proposal),
            yesVotes: proposal.yesVotes,
            noVotes: proposal.noVotes,
            expirationSecs: proposal.expirationSecs,
            creationTimeSecs: proposal.creationTimeSecs,
          };
          return watched;
        } catch (error) {
          console.error(`[notifications] failed to load proposal ${id}`, error);
          return null;
        }
      }),
    );
    for (const item of loaded) {
      if (item) items.push(item);
    }
  }

  return items;
}
