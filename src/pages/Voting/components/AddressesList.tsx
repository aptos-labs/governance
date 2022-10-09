import {Button, Grid, Stack, TextField} from "@mui/material";
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
    <Grid container justifyContent="space-between" mb={4} key={index}>
      <Grid item xs={6}>
        <Stack direction="row">
          <TextField
            fullWidth
            variant="outlined"
            value={account.address}
            disabled={true}
          />
        </Stack>
      </Grid>

      <Grid item xs={4}>
        {voted && (
          <Button disabled fullWidth size="large" variant="primary">
            Voted
          </Button>
        )}
        {!voted && !isVotingClosed(proposal) && (
          <VoteButtons
            proposalId={proposal.proposal_id}
            stakePoolAddress={account.address}
            onTransactionSuccess={onTransactionSuccess}
          />
        )}
        {!voted && isVotingClosed(proposal) && (
          <Button
            disabled
            fullWidth
            size="large"
            variant="primary"
            sx={{
              backgroundColor: grey[500],
            }}
          >
            didn't vote
          </Button>
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
          <AddressVotingState
            account={account}
            index={index}
            proposal={proposal}
          />
        );
      })}
    </>
  );
}
