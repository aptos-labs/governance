import {useEffect, useState} from "react";
import {sha3_256} from "js-sha3";

import {getTableItem} from "..";
import {Proposal, ProposalMetadata} from "../../pages/Types";
import {hex_to_string} from "../../utils";
import {getProposalStatus, isVotingClosed} from "../../pages/utils";
import {useGetProposalsTableData} from "../hooks/useGetProposalsTableData";
import {GlobalState, useGlobalState} from "../../context/globalState/context";

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
): Promise<ProposalMetadata | null> => {
  // fetch proposal metadata from metadata_location property
  const metadata_location = hex_to_string(proposalData.metadata.data[1].value);
  const raw_metadata_location = getRawGithubUrl(metadata_location);

  const response = await fetch(raw_metadata_location);
  // validate response status
  if (response.status !== 200) return null;

  const metadataText = await response.text();

  //validate metadata
  const metadata_hash = proposalData.metadata.data[0].value;

  const hash = sha3_256(metadataText);
  if (hex_to_string(metadata_hash) !== hash) return null;

  const proposal_metadata = JSON.parse(metadataText);

  return proposal_metadata;
};

const fetchProposal = async (
  proposal_id: string,
  handle: string,
  state: GlobalState,
): Promise<Proposal | null> => {
  // fetch proposal table item
  const proposalData = await fetchTableItem(proposal_id, handle, state);
  if (!proposalData) return null;

  // fetch proposal metadata
  const proposal_metadata = await fetchProposalMetadata(proposalData);
  // if bad metadata response or metadata hash is different
  if (!proposal_metadata) return null;

  proposalData.status = getProposalStatus(proposalData);
  proposalData.is_voting_closed = isVotingClosed(proposalData);

  proposalData.proposal_id = proposal_id;
  proposalData.proposal_metadata = proposal_metadata;

  return proposalData;
};

export function useGetProposal(proposal_id: string): Proposal | undefined {
  const [state, _setState] = useGlobalState();
  const [proposal, setProposal] = useState<Proposal>();
  const proposalTableData = useGetProposalsTableData();

  const handle = proposalTableData?.handle ?? undefined;
  useEffect(() => {
    if (handle !== undefined) {
      fetchProposal(proposal_id, handle, state).then((data) => {
        data && setProposal(data);
      });
    }
  }, [handle, state]);

  return proposal;
}
