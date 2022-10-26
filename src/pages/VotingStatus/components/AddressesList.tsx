import {Chip, Grid, Stack} from "@mui/material";
import {useState} from "react";

import {AddressToVoteMap} from "../../Types";

type AddressesListProps = {
  addressVoteMap: AddressToVoteMap[];
};

type AddressVotingStateProps = {
  account: AddressToVoteMap;
  index: number;
};

function AddressVotingState({account, index}: AddressVotingStateProps) {
  const [voted, _] = useState<boolean>(account.voted);

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
        {!voted && (
          <Stack alignItems="flex-end">
            <Chip label="didn't vote" />
          </Stack>
        )}
      </Grid>
    </Grid>
  );
}

export default function AddressesList({addressVoteMap}: AddressesListProps) {
  return (
    <Stack sx={{width: "100%"}} mt={4}>
      {addressVoteMap?.map((account, index) => {
        return (
          <Stack key={account.poolAddress}>
            <AddressVotingState account={account} index={index} />
          </Stack>
        );
      })}
    </Stack>
  );
}
