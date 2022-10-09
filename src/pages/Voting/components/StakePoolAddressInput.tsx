import {Button, Grid, Stack, TextField, Typography} from "@mui/material";
import React, {useState} from "react";
import LoadingModal from "../../../components/LoadingModal";
import {useGlobalState} from "../../../GlobalState";
import {AddressToVoteMap} from "../../Types";
import {isValidAccountAddress} from "../../utils";
import hasAddressVoted from "../api/hasAddressVoted";

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
  const [stakePoolAddressesInput, setStakePoolAddressesInput] =
    useState<string>("");
  const [loadingModalIsOpen, setLoadingModalIsOpen] = useState<boolean>(false);
  const [state, _] = useGlobalState();

  const onStakePoolAddressesInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setAddressHasError(null);
    const addresses = event.target.value;
    setStakePoolAddressesInput(addresses);
  };

  const fetchHasAccountVoted = async (
    address: string,
  ): Promise<AddressToVoteMap> => {
    const result = await hasAddressVoted(address, proposalId, state);
    const addressToVotemap = {
      address,
      voted: result,
    };
    return addressToVotemap;
  };

  const fetchAccounts = async (addresses: string[]): Promise<void> => {
    const map = addresses.map(async (address) => {
      const result = await fetchHasAccountVoted(address);
      return result;
    });

    const addressesVotesMap = await Promise.all(map);
    setAddressVoteMap(addressesVotesMap);
    setLoadingModalIsOpen(false);
  };

  const validateAddresses = (stakePoolAddressesArray: string[]) => {
    let addresses: string[] = [];
    for (let count = 0; count < stakePoolAddressesArray.length; count++) {
      const stakePoolAddress = stakePoolAddressesArray[count];
      if (stakePoolAddress.length === 0) continue;
      const stakePoolAddressTrimmed = stakePoolAddress.trim();
      if (!isValidAccountAddress(stakePoolAddressTrimmed)) {
        setAddressHasError(`${stakePoolAddressTrimmed} is not a valid address`);
        setLoadingModalIsOpen(false);
        break;
      }
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
        Input Stake Pool Addresses
      </Typography>
      <TextField
        fullWidth
        variant="outlined"
        multiline={true}
        rows={4}
        placeholder={
          "Input the stake pool addresses you want to vote for seperated by space"
        }
        onChange={onStakePoolAddressesInputChange}
      />
      {addressHasError && (
        <Typography color="red">{addressHasError}</Typography>
      )}
      <Stack alignItems="flex-end">
        <Button
          variant="primary"
          size="large"
          onClick={onStakePoolAddressesSubmit}
          sx={{mt: 2}}
          disabled={stakePoolAddressesInput.length === 0}
        >
          Validate
        </Button>
      </Stack>
    </Grid>
  );
}
