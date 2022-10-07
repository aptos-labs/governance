import {Button, Grid, Stack, TextField} from "@mui/material";
import {grey} from "@mui/material/colors";
import React from "react";
import VoteButtons from "../../Proposal/card/VoteButtons";
import {
  AddressToVoteMap,
  Proposal,
  ProposalStatus,
  ProposalVotingState,
} from "../../Types";

type AddressesListProps = {
  addressVoteMap: AddressToVoteMap[] | undefined;
  proposal: Proposal;
};

export default function AddressesList({
  addressVoteMap,
  proposal,
}: AddressesListProps) {
  return (
    <>
      {addressVoteMap?.map((account, index) => {
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
              {account.voted && (
                <Button disabled fullWidth size="large" variant="primary">
                  Voted
                </Button>
              )}
              {!account.voted && !proposal.is_voting_closed && (
                <VoteButtons
                  proposalId={proposal.proposal_id}
                  stakePoolAddress={account.address}
                />
              )}
              {proposal.is_voting_closed && (
                <Button
                  disabled
                  fullWidth
                  size="large"
                  variant="primary"
                  sx={{
                    backgroundColor: grey[500],
                  }}
                >
                  Voting Close
                </Button>
              )}
            </Grid>
          </Grid>
        );
      })}
    </>
  );
}
