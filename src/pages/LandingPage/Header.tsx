import {Button, Grid, Link, Typography} from "@mui/material";
import {Box} from "@mui/system";

type HeaderProps = {
  onVoteProposalButtonClick?: () => void;
};

export const Header = ({onVoteProposalButtonClick}: HeaderProps) => {
  return (
    <Grid container mb={10}>
      <Grid item xs={12}>
        <Grid
          container
          spacing={{xs: 6, sm: 12}}
          justifyContent="space-between"
          flexDirection="row"
        >
          <Grid item xs={12} sm={6}>
            <Typography variant="h6">
              Welcome to Aptos Governance. Here you can view and vote on the
              proposals. Learn more about Aptos Governance{" "}
              <Link
                href="https://aptos.dev/concepts/governance/"
                target="_blank"
                title="Aptos Foundation"
              >
                here
              </Link>
              .
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body1" mb={4}>
              Aptos Governance is where on chain voting occurs for AIPs (Aptos
              Improvement Proposals). To vote on a proposal, install Petra
              (Aptos Wallet), connect to the wallet and begin voting on any
              proposal. You can vote on multiple proposals. You can view all
              AIPs here.
            </Typography>
            <Box justifyContent="center">
              <Button
                variant="primary"
                onClick={onVoteProposalButtonClick}
                sx={{width: "300px"}}
              >
                View AIPs
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};
