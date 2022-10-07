import {
  Button,
  Checkbox,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React, {useState} from "react";
import {useParams} from "react-router-dom";
import {useGetProposal} from "../../api/hooks/useGetProposal";
import GoBack from "../../components/GoBack";
import Header from "../../components/Header";
import LoadingModal from "../../components/LoadingModal";
import {useGlobalState} from "../../GlobalState";
import VoteButtons from "../Proposal/card/VoteButtons";
import {EmptyProposal} from "../Proposal/EmptyProposal";
import {ProposalHeader} from "../Proposal/Header";
import {isValidAccountAddress} from "../utils";
import hasAddressVoted from "./api/hasAddressVoted";

export type ProposalPageURLParams = {
  id: string;
};

type AddressVoteMap = {
  address: string;
  voted: boolean;
};

export default function Voting() {
  const {id: proposalId} = useParams() as ProposalPageURLParams;
  const proposal = useGetProposal(proposalId);
  const [state, _] = useGlobalState();

  const [stakePoolAddressesInput, setStakePoolAddressesInput] =
    useState<string>("");
  const [addressVoteMap, setAddressVoteMap] = useState<AddressVoteMap[]>();
  const [addressHasError, setAddressHasError] = useState<string | null>(null);

  const [modalIsOpen, setModalIsOpen] = useState<boolean>(false);
  if (!proposal) {
    return <EmptyProposal />;
  }

  const onStakePoolAddressesInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setAddressHasError(null);
    const addresses = event.target.value;
    setStakePoolAddressesInput(addresses);
  };

  const fetchHasAccountVoted = async (
    address: string,
  ): Promise<AddressVoteMap> => {
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
    setModalIsOpen(false);
  };

  const onStakePoolAddressesSubmit = (): void => {
    setModalIsOpen(true);
    setAddressVoteMap([]);
    const stakePoolAddressesInputNoSpaces = stakePoolAddressesInput.trim();
    const stakePoolAddressesArray = stakePoolAddressesInputNoSpaces.split(" ");

    let addresses: string[] = [];
    for (let count = 0; count < stakePoolAddressesArray.length; count++) {
      const stakePoolAddress = stakePoolAddressesArray[count];
      if (stakePoolAddress.length === 0) continue;
      const stakePoolAddressNoSpaces = stakePoolAddress.trim();
      if (!isValidAccountAddress(stakePoolAddressNoSpaces)) {
        setAddressHasError(
          `${stakePoolAddressNoSpaces} is not a valid address`,
        );
        setModalIsOpen(false);
        break;
      }
      addresses.push(stakePoolAddressNoSpaces);
    }

    fetchAccounts(addresses);
  };

  return (
    <Grid container>
      <LoadingModal open={modalIsOpen} />
      <Header />
      <GoBack to={"/"} />
      <Grid item xs={12}>
        <ProposalHeader proposal={proposal} />
      </Grid>
      <Grid item xs={12} mb={4}>
        <TextField
          fullWidth
          variant="outlined"
          multiline={true}
          rows={4}
          placeholder={"Input Stake Pool addresses seperated by space"}
          onChange={onStakePoolAddressesInputChange}
        />
        {addressHasError && (
          <Typography color="red">{addressHasError}</Typography>
        )}
        <Button
          variant="primary"
          size="large"
          fullWidth
          onClick={onStakePoolAddressesSubmit}
          sx={{mt: 2}}
        >
          Validate
        </Button>
      </Grid>
      {addressVoteMap &&
        addressVoteMap.map((value, index) => {
          return (
            <Grid container justifyContent="space-between" mb={4} key={index}>
              <Grid item xs={6}>
                <Stack direction="row">
                  <Checkbox
                    inputProps={{"aria-label": "stake-pool-address-checkbox"}}
                    defaultChecked={value.voted ? true : false}
                    disabled
                  />

                  <TextField
                    fullWidth
                    variant="outlined"
                    value={value.address}
                    disabled={true}
                  />
                </Stack>
              </Grid>

              <Grid item xs={4}>
                {value.voted ? (
                  <Button disabled>Voted</Button>
                ) : (
                  <VoteButtons
                    proposalId={proposal.proposal_id}
                    stakeAccount={value.address}
                  />
                )}
              </Grid>
            </Grid>
          );
        })}
    </Grid>
  );
}
