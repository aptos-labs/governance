import {AccountAddress} from "@aptos-labs/ts-sdk";
import {getAccountResource} from "../../../api";
import {GlobalState} from "../../../context/globalState/context";
import {MaybeHexString} from "../../../context/wallet/context";

type StakePool = {
  delegated_voter: string;
};

function normalizeAddress(address: string): string {
  const hex = address.toLowerCase().replace(/^0x/, "");
  return `0x${hex.padStart(64, "0")}`;
}

export default async function isDelegatedVoter(
  poolAddress: string,
  currentWalletAddress: MaybeHexString | null,
  state: GlobalState,
) {
  if (!currentWalletAddress) return false;
  try {
    const stakePoolRecordResource = await getAccountResource(
      {address: poolAddress, resourceType: "0x1::stake::StakePool"},
      state.network_name,
    );

    const {delegated_voter: delegatedVoter} =
      stakePoolRecordResource.data as StakePool;

    return (
      AccountAddress.from(normalizeAddress(delegatedVoter)).toStringLong() ===
      AccountAddress.from(normalizeAddress(currentWalletAddress)).toStringLong()
    );
  } catch (e) {
    return false;
  }
}
