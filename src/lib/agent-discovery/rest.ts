import {jsonResponse, notFound} from "~/lib/agent-discovery/http";
import {publicOrigin} from "~/lib/agent-discovery/origin";
import {loadProposalDetail} from "~/lib/governance/fetch-proposal";
import {
  fetchProposalVotesPage,
  PROPOSAL_VOTES_PAGE_SIZE,
} from "~/lib/governance/fetch-proposal-votes";
import {loadProposalListPage} from "~/lib/governance/fetch-proposals";
import {proposalToJson} from "~/lib/governance/json";

function pageFrom(request: Request): number {
  const page = Number(new URL(request.url).searchParams.get("page") ?? "0");
  return Number.isFinite(page) && page >= 0 ? Math.floor(page) : 0;
}

export function healthPayload(origin: string) {
  return {
    status: "ok",
    service: "aptos-governance",
    docs: `${origin}/docs/api`,
    openapi: `${origin}/openapi.json`,
  };
}

export async function handleListProposals(request: Request): Promise<Response> {
  const page = pageFrom(request);
  const result = await loadProposalListPage(page);
  return jsonResponse({
    items: result.items.map(proposalToJson),
    totalCount: result.totalCount,
    page: result.page,
    pageSize: result.pageSize,
  });
}

export async function handleGetProposal(
  request: Request,
  proposalId: string,
): Promise<Response> {
  if (!/^\d+$/.test(proposalId)) {
    return notFound("proposalId must be a non-negative integer");
  }
  try {
    const result = await loadProposalDetail(proposalId, pageFrom(request));
    return jsonResponse({
      proposal: proposalToJson(result.proposal),
      votes: {
        items: result.votes.items.map((vote) => ({
          stakingPoolAddress: vote.stakingPoolAddress,
          shouldPass: vote.shouldPass,
          numVotes: vote.numVotes.toString(),
        })),
        totalCount: result.votes.totalCount,
        page: result.votes.page,
        pageSize: result.votes.pageSize,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (/does not exist/.test(message)) {
      return notFound(message);
    }
    return jsonResponse(
      {error: message},
      "application/json; charset=utf-8",
      {},
      500,
    );
  }
}

export async function handleListVotes(
  request: Request,
  proposalId: string,
): Promise<Response> {
  if (!/^\d+$/.test(proposalId)) {
    return notFound("proposalId must be a non-negative integer");
  }
  const page = await fetchProposalVotesPage(proposalId, {
    page: pageFrom(request),
    pageSize: PROPOSAL_VOTES_PAGE_SIZE,
  });
  return jsonResponse({
    items: page.items.map((vote) => ({
      stakingPoolAddress: vote.stakingPoolAddress,
      shouldPass: vote.shouldPass,
      numVotes: vote.numVotes.toString(),
    })),
    totalCount: page.totalCount,
    page: page.page,
    pageSize: page.pageSize,
  });
}

export function handleHealth(request: Request): Response {
  return jsonResponse(healthPayload(publicOrigin(request)));
}
