import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Stack,
  TextField,
} from "@mui/material";
import {grey} from "@mui/material/colors";
import React, {useState} from "react";
import VoteButtons from "../../Proposal/card/VoteButtons";
import {AddressToVoteMap, Proposal} from "../../Types";
import {isVotingClosed} from "../../utils";

type AddressesListProps = {
  addressVoteMap: AddressToVoteMap[] | undefined;
  proposal: Proposal;
};

type AddressVotingStateProps = {
  account: AddressToVoteMap;
  index: number;
  proposal: Proposal;
};

function AddressVotingState({
  account,
  index,
  proposal,
}: AddressVotingStateProps) {
  const [voted, setVoted] = useState<boolean>(account.voted);
  const onTransactionSuccess = () => {
    setVoted(true);
  };

  return (
    <Grid
      container
      justifyContent="space-between"
      alignItems="center"
      mb={4}
      key={index}
    >
      <Grid item xs={6}>
        <Stack direction="row">{account.poolAddress}</Stack>
      </Grid>

      <Grid item xs={4}>
        {voted && (
          <Stack alignItems="flex-end">
            <Chip label="Voted" />
          </Stack>
        )}
        {!voted && !isVotingClosed(proposal) && (
          <VoteButtons
            proposalId={proposal.proposal_id}
            stakePoolAddress={account.poolAddress}
            onTransactionSuccess={onTransactionSuccess}
          />
        )}
        {!voted && isVotingClosed(proposal) && (
          <Stack alignItems="flex-end">
            <Chip label="didn't vote" />
          </Stack>
        )}
      </Grid>
    </Grid>
  );
}

export default function AddressesList({
  addressVoteMap,
  proposal,
}: AddressesListProps) {
  return (
    <>
      {addressVoteMap?.map((account, index) => {
        return (
          <Stack sx={{width: "100%"}}>
            <Divider sx={{mb: "2rem"}} variant="dotted" />
            <AddressVotingState
              account={account}
              index={index}
              proposal={proposal}
            />
          </Stack>
        );
      })}
    </>
  );
}
