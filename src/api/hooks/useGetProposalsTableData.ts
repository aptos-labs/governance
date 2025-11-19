import {useGetAccountResources} from "./useGetAccountResources";
import {ResponseError, ResponseErrorType} from "../client";

interface votingForumData {
  next_proposal_id: string;
  proposals: {
    handle: string;
  };
}

type useGetProposalsTableDataSuccess = {
  nextProposalId: string;
  handle: string;
  error?: never;
};

type useGetProposalsTableDataError = {
  nextProposalId?: never;
  handle?: never;
  error: ResponseError;
};

type useGetProposalsTableData =
  | useGetProposalsTableDataSuccess
  | useGetProposalsTableDataError
  | null;

export function useGetProposalsTableData(): useGetProposalsTableData {
  const accountResourcesResult = useGetAccountResources("0x1");

  // Handle errors.
  if (accountResourcesResult.error) {
    return {error: accountResourcesResult.error};
  }

  if (!accountResourcesResult.data) return null;

  const votingForum = accountResourcesResult.data.find(
    (resource) =>
      resource.type ===
      "0x1::voting::VotingForum<0x1::governance_proposal::GovernanceProposal>",
  );

  if (!votingForum || !votingForum.data) return null;

  const votingForumData: votingForumData = votingForum.data as votingForumData;

  const nextProposalId = votingForumData.next_proposal_id;
  const handle = votingForumData.proposals.handle;

  return {nextProposalId, handle};
}
