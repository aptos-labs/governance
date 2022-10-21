import {BCS, HexString, MaybeHexString, TxnBuilderTypes} from "aptos";
import {getAccountResource} from "../../../api";
import {GlobalState} from "../../../context/globalState/context";

type StakePool = {
  delegated_voter: string;
};

export default async function isDelegatedVoter(
  poolAddress: string,
  currentWalletAddress: MaybeHexString | null,
  state: GlobalState,
) {
  if (!currentWalletAddress) return false;
  try {
    const stakePoolRecordResource = await getAccountResource(
      {address: poolAddress, resourceType: "0x1::stake::StakePool"},
      state.network_value,
    );

    const {delegated_voter: deligatedVoter} =
      stakePoolRecordResource.data as StakePool;

    const currentWalletAddressFromHex =
      TxnBuilderTypes.AccountAddress.fromHex(currentWalletAddress);
    const deligatedVoterAddressFromHex =
      TxnBuilderTypes.AccountAddress.fromHex(deligatedVoter);

    return (
      HexString.fromUint8Array(
        BCS.bcsToBytes(deligatedVoterAddressFromHex),
      ).hex() ===
      HexString.fromUint8Array(
        BCS.bcsToBytes(currentWalletAddressFromHex),
      ).hex()
    );
  } catch (e) {
    return false;
  }
}
