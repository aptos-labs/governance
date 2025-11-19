import {useRef} from "react";
import {Box, Grid, Stack, Alert, AlertTitle} from "@mui/material";
import {HomePageHeader} from "../../components/Header";
import {Header as ProposalsHeader} from "./Header";
import {ProposalsTable} from "./Table";
import {useGetProposalsTableData} from "../../api/hooks/useGetProposalsTableData";
import {ResponseErrorType} from "../../api/client";

export default function LandingPage() {
  const proposalTableData = useGetProposalsTableData();
  const ProposalsTableRef = useRef<null | HTMLDivElement>(null);

  const scrollTableIntoView = () => {
    ProposalsTableRef.current?.scrollIntoView({behavior: "smooth"});
  };

  // Handle error states.
  if (
    proposalTableData &&
    "error" in proposalTableData &&
    proposalTableData.error
  ) {
    const error = proposalTableData.error;
    let errorTitle = "Error";
    let errorMessage = "An error occurred while loading proposals.";

    if (error.type === ResponseErrorType.RATE_LIMITED) {
      errorTitle = "Rate Limited";
      errorMessage =
        "You've been rate limited by the API. Please try again later.";
    }

    // Use the error's message if available.
    if (error.message) {
      errorMessage = error.message;
    }

    return (
      <Grid item xs={12}>
        <HomePageHeader />
        <ProposalsHeader onVoteProposalButtonClick={scrollTableIntoView} />
        <Stack spacing={2} sx={{mt: 4, mx: 2}}>
          <Alert severity="error">
            <AlertTitle>{errorTitle}</AlertTitle>
            {errorMessage}
          </Alert>
        </Stack>
      </Grid>
    );
  }

  return (
    <Grid item xs={12}>
      <HomePageHeader />
      <ProposalsHeader onVoteProposalButtonClick={scrollTableIntoView} />
      {proposalTableData && proposalTableData.nextProposalId !== "0" ? (
        <ProposalsTable
          nextProposalId={proposalTableData.nextProposalId}
          ProposalsTableRef={ProposalsTableRef}
        />
      ) : (
        <Stack spacing={1}>
          <Box sx={{width: "auto", overflowX: "auto"}}>No Proposals</Box>
        </Stack>
      )}
    </Grid>
  );
}
