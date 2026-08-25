import {
  APTOS_GOVERNANCE_ADDRESS,
  getAptosClient,
  VOTING_FORUM_RESOURCE_TYPE,
} from "~/lib/aptos/client";
import {forumCache} from "~/lib/governance/server-cache";

export interface VotingForumResource {
  next_proposal_id: string;
  proposals: {handle: string};
}

export async function loadVotingForum(): Promise<VotingForumResource> {
  return forumCache.getOrSet("forum", async () => {
    const aptos = getAptosClient();
    return aptos.getAccountResource<VotingForumResource>({
      accountAddress: APTOS_GOVERNANCE_ADDRESS,
      resourceType: VOTING_FORUM_RESOURCE_TYPE,
    });
  }) as Promise<VotingForumResource>;
}

/** Sequential proposal ids run from 0 to next_proposal_id - 1. */
export async function loadProposalCount(): Promise<number> {
  const forum = await loadVotingForum();
  const count = Number(forum.next_proposal_id);
  return Number.isFinite(count) && count > 0 ? count : 0;
}
