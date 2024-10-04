import {Grid} from "@mui/material";

// TODO: generalize empty page for proposals, transactions, and more
export function EmptyProposal({errorMessage}: {errorMessage: string}) {
  return (
    <Grid container marginTop={{md: 12, xs: 6}}>
      {errorMessage.toUpperCase()}
    </Grid>
  );
}
