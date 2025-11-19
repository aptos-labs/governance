import {useQuery} from "react-query";
import {sha3_256} from "js-sha3";

import {getTableItem} from "..";
import {Proposal, ProposalMetadata, ProposalError} from "../../pages/Types";
import {hex_to_string} from "../../utils";
import {getProposalStatus, isVotingClosed} from "../../pages/utils";
import {useGetProposalsTableData} from "../hooks/useGetProposalsTableData";
import {GlobalState, useGlobalState} from "../../context/globalState/context";
import {defaultProposalErrorMessage} from "../../constants";

const fetchTableItem = async (
  proposal_id: string,
  handle: string,
  state: GlobalState,
): Promise<Proposal | null> => {
  const votingTableItemRequest = {
    key_type: "u64",
    value_type:
      "0x1::voting::Proposal<0x1::governance_proposal::GovernanceProposal>",
    key: proposal_id,
  };

  const proposalData = await getTableItem(
    {tableHandle: handle, data: votingTableItemRequest},
    state.network_value,
  );

  if (!proposalData) return null;

  return proposalData;
};

const getRawGithubUrl = (url: string): string => {
  if (!url.includes("github.com")) {
    return url;
  }

  // Hot fix for github raw url
  // from:  https://github.com                /aptos-foundation/mainnet-proposals /raw /main/metadata/v1.2/0/0-move-stdlib.json
  //   to:  https://raw.githubusercontent.com /aptos-foundation/mainnet-proposals      /main/metadata/v1.2/0/0-move-stdlib.json
  return url
    .replace("/raw", "")
    .replace("github.com", "raw.githubusercontent.com");
};

const fetchProposalMetadata = async (
  proposalData: Proposal,
): Promise<ProposalMetadata | ProposalError> => {
  // fetch proposal metadata from metadata_location property
  const proposal_metadata_location = proposalData.metadata.data.find(
    (metadata) => metadata.key === "metadata_location",
  )!.value;
  const metadata_location = hex_to_string(proposal_metadata_location);

  const raw_metadata_location = getRawGithubUrl(metadata_location);

  const response = await fetch(raw_metadata_location);
  // validate response status
  if (response.status !== 200) {
    return {
      errorMessage: "Proposal metadata not found",
    };
  }

  const metadataText = await response.text();
  // validate metadata
  const metadata_hash = proposalData.metadata.data.find(
    (metadata) => metadata.key === "metadata_hash",
  )!.value;
  const hash = sha3_256(metadataText);
  if (hex_to_string(metadata_hash) !== hash) {
    return {
      errorMessage: "Metadata hash mismatch",
    };
  }

  const proposal_metadata = JSON.parse(metadataText);
  return proposal_metadata;
};

const fetchProposal = async (
  proposal_id: string,
  handle: string,
  state: GlobalState,
): Promise<Proposal | ProposalError> => {
  // fetch proposal table item
  const proposalData = await fetchTableItem(proposal_id, handle, state);
  if (!proposalData) {
    return {
      errorMessage: defaultProposalErrorMessage,
    };
  }

  // fetch proposal metadata
  const proposal_metadata = await fetchProposalMetadata(proposalData);
  // if bad metadata response or metadata hash is different
  if ("errorMessage" in proposal_metadata) {
    return {
      errorMessage:
        proposal_metadata.errorMessage ?? defaultProposalErrorMessage,
    };
  }

  proposalData.status = getProposalStatus(proposalData);
  proposalData.is_voting_closed = isVotingClosed(proposalData);

  proposalData.proposal_id = proposal_id;
  proposalData.proposal_metadata = proposal_metadata;

  return proposalData;
};

export function useGetProposal(proposal_id: string): {
  proposal: Proposal | ProposalError | undefined;
  loading: boolean;
  error: any;
} {
  const [state, _setState] = useGlobalState();
  const proposalTableData = useGetProposalsTableData();

  const handle =
    proposalTableData && "handle" in proposalTableData
      ? proposalTableData.handle
      : undefined;

  const {
    data: proposal,
    isLoading: loading,
    error,
  } = useQuery(
    ["proposal", proposal_id, handle, state.network_value],
    () => {
      if (handle === undefined) {
        return Promise.resolve(undefined);
      }
      return fetchProposal(proposal_id, handle, state);
    },
    {
      enabled: handle !== undefined,
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes.
      cacheTime: 30 * 60 * 1000, // Keep unused data in cache for 30 minutes.
      refetchOnWindowFocus: false, // Don't refetch when window regains focus.
      refetchOnMount: false, // Don't refetch on component mount if data exists.
    },
  );

  return {proposal, loading, error};
}
