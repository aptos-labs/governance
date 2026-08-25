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
