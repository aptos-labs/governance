import * as Sentry from "@sentry/react";
import {getAccountResource, getTableItem} from "../../../api";
import {GlobalState} from "../../../GlobalState";

interface VotingRecords {
  votes: {
    handle: string;
  };
}

const fetchTableItem = async (
  pool_address: string,
  proposal_id: string,
  handle: string,
  state: GlobalState,
): Promise<boolean> => {
  const tableItemRequest = {
    key_type: "0x1::aptos_governance::RecordKey",
    value_type: "bool",
    key: {
      stake_pool: pool_address,
      proposal_id,
    },
  };

  try {
    await getTableItem(
      {tableHandle: handle, data: tableItemRequest},
      state.network_value,
    );
  } catch (e: any) {
    // fetchTableItem returns a 404 error if the item does not exist, which means address has not voted, therefore return `false`
    if (e.type == "Not found") {
      console.log("hasAddressVoted", e);
      return false;
    } else {
      Sentry.captureException(`hasAddressVoted ${e}`);
    }
  }
  // return `true` if the item exists, which means address has voted
  return true;
};

export default async function hasAddressVoted(
  address: string,
  proposal_id: string,
  state: GlobalState,
) {
  const votingRecordResource = await getAccountResource(
    {address: "0x1", resourceType: "0x1::aptos_governance::VotingRecords"},
    state.network_value,
  );
  const votingResource = votingRecordResource.data as VotingRecords;
  const {handle} = votingResource.votes;
  return fetchTableItem(address, proposal_id, handle, state);
}
