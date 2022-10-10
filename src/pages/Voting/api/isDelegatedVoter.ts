import {getAccountResource} from "../../../api";
import {GlobalState} from "../../../GlobalState";

type StakePool = {
  delegated_voter: string;
};

export default async function isDelegatedVoter(
  poolAddress: string,
  currentWalletAddress: string | null,
  state: GlobalState,
) {
  try {
    const stakePoolRecordResource = await getAccountResource(
      {address: poolAddress, resourceType: "0x1::stake::StakePool"},
      state.network_value,
    );
    const {delegated_voter: deligatedVoter} =
      stakePoolRecordResource.data as StakePool;
    return deligatedVoter == currentWalletAddress;
  } catch (e) {
    return false;
  }
}
