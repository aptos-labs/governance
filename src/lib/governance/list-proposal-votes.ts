import {createServerFn} from "@tanstack/react-start";
import {z} from "zod";
import {
  fetchProposalVotesPage,
  PROPOSAL_VOTES_PAGE_SIZE,
} from "~/lib/governance/fetch-proposal-votes";

const inputSchema = z.object({
  proposalId: z.string().regex(/^\d+$/),
  page: z.number().int().min(0).default(0),
});

export const listProposalVotes = createServerFn({method: "GET"})
  .validator(inputSchema)
  .handler(async ({data}) => {
    const page = await fetchProposalVotesPage(data.proposalId, {
      page: data.page,
      pageSize: PROPOSAL_VOTES_PAGE_SIZE,
    });
    return {
      ...page,
      items: page.items.map((vote) => ({
        stakingPoolAddress: vote.stakingPoolAddress,
        shouldPass: vote.shouldPass,
        numVotes: vote.numVotes.toString(),
      })),
    };
  });
