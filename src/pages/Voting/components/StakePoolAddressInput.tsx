import {Button, Grid, Stack, TextField, Typography} from "@mui/material";
import React, {useState} from "react";
import LoadingModal from "../../../components/LoadingModal";
import {useWalletContext} from "../../../context/wallet/context";
import {useGlobalState} from "../../../GlobalState";
import {AddressToVoteMap} from "../../Types";
import {isValidAccountAddress} from "../../utils";
import hasAddressVoted from "../api/hasAddressVoted";
import isDelegatedVoter from "../api/isDelegatedVoter";
import {alpha} from "@mui/material";
import {primaryColor} from "../../constants";

type StakePoolAddressInputProps = {
  setAddressVoteMap: React.Dispatch<
    React.SetStateAction<AddressToVoteMap[] | undefined>
  >;
  proposalId: string;
};

export default function StakePoolAddressInput({
  setAddressVoteMap,
  proposalId,
}: StakePoolAddressInputProps) {
  const [addressHasError, setAddressHasError] = useState<string | null>(null);
  const [notPartOfStakingPool, setNotPartOfStakingPool] = useState<
    string | null
  >(null);
  const [stakePoolAddressesInput, setStakePoolAddressesInput] =
    useState<string>("");
  const [loadingModalIsOpen, setLoadingModalIsOpen] = useState<boolean>(false);
  const [state, _] = useGlobalState();
  const {accountAddress} = useWalletContext();

  const resetErrors = () => {
    setAddressHasError(null);
    setNotPartOfStakingPool(null);
  };

  const onStakePoolAddressesInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    resetErrors();
    const addresses = event.target.value;
    setStakePoolAddressesInput(addresses);
  };

  const fetchHasAccountVoted = async (
    poolAddress: string,
  ): Promise<AddressToVoteMap> => {
    const result = await hasAddressVoted(poolAddress, proposalId, state);
    const addressToVotemap = {
      poolAddress,
      voted: result,
    };
    return addressToVotemap;
  };

  const validateIsVoter = async (poolAddress: string): Promise<boolean> => {
    const isVoter = await isDelegatedVoter(poolAddress, accountAddress, state);
    return isVoter;
  };

  const fetchAccounts = async (poolAddresses: string[]): Promise<void> => {
    const map = poolAddresses.map(async (poolAddress) => {
      const result = await fetchHasAccountVoted(poolAddress);
      return result;
    });

    const addressesVotesMap = await Promise.all(map);
    setAddressVoteMap(addressesVotesMap);
    setLoadingModalIsOpen(false);
  };

  const validateStakePoolAddress = (poolAdddress: string) => {
    if (!isValidAccountAddress(poolAdddress)) {
      setAddressHasError(`${poolAdddress} is not a valid address`);
      setLoadingModalIsOpen(false);
      return false;
    }
    return true;
  };

  const validateAccountIsVoter = async (poolAdddress: string) => {
    const isVoter = await validateIsVoter(poolAdddress);
    if (!isVoter) {
      setLoadingModalIsOpen(false);
      setNotPartOfStakingPool(
        `you are not part of staking pool ${poolAdddress}`,
      );
      return false;
    }
    return true;
  };

  const validateAddresses = async (stakePoolAddressesArray: string[]) => {
    resetErrors();
    let addresses: string[] = [];
    stakePoolAddressesArray = Array.from(new Set(stakePoolAddressesArray));
    for (let count = 0; count < stakePoolAddressesArray.length; count++) {
      const stakePoolAddress = stakePoolAddressesArray[count];
      const stakePoolAddressTrimmed = stakePoolAddress.trim();
      if (stakePoolAddressTrimmed.length === 0) continue;
      if (!validateStakePoolAddress(stakePoolAddressTrimmed)) break;
      if (!(await validateAccountIsVoter(stakePoolAddressTrimmed))) break;
      addresses.push(stakePoolAddressTrimmed);
    }

    fetchAccounts(addresses);
  };

  const onStakePoolAddressesSubmit = (): void => {
    setLoadingModalIsOpen(true);
    setAddressVoteMap([]);
    const stakePoolAddressesInputTrimmed = stakePoolAddressesInput.trim();
    const stakePoolAddressesArray = stakePoolAddressesInputTrimmed.split(" ");
    validateAddresses(stakePoolAddressesArray);
  };

  return (
    <Grid item xs={12} mb={10} mt={6}>
      <LoadingModal open={loadingModalIsOpen} />
      <Typography variant="h5" mb={2}>
        Stake Pool Addresses
      </Typography>
      <Typography variant="body1" mb={2}>
        Input the staking pool addresses you would like to vote for, separated
        by space.
      </Typography>
      <TextField
        fullWidth
        variant="outlined"
        multiline={true}
        rows={4}
        placeholder={"0x123456789 0x987654321 0x123459876"}
        onChange={onStakePoolAddressesInputChange}
      />
      {addressHasError && (
        <Typography color="red">
          <p>{addressHasError}</p>
        </Typography>
      )}
      {notPartOfStakingPool && (
        <Typography color="red">
          <p>{notPartOfStakingPool} </p>
        </Typography>
      )}
      <Stack alignItems="flex-end">
        <Button
          variant="contained"
          onClick={onStakePoolAddressesSubmit}
          sx={{
            mt: 2,
            color: "black",
            backgroundColor: alpha(primaryColor, 1),
            "&:hover": {
              backgroundColor: alpha(primaryColor, 1),
            },
          }}
          disabled={stakePoolAddressesInput.length === 0}
        >
          Validate
        </Button>
      </Stack>
    </Grid>
  );
}
