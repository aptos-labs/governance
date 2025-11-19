import {useGetProposalsTableData} from "../../api/hooks/useGetProposalsTableData";
import {ProposalsTable} from "../LandingPage/Table";
import {IndividualPageHeader} from "../../components/Header";
import {Stack, Alert, AlertTitle} from "@mui/material";
import {ResponseErrorType} from "../../api/client";

export default function ProposalsPage() {
  const proposalTableData = useGetProposalsTableData();

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
      <>
        <IndividualPageHeader title="Proposals" />
        <Stack spacing={2} sx={{mt: 4, mx: 2}}>
          <Alert severity="error">
            <AlertTitle>{errorTitle}</AlertTitle>
            {errorMessage}
          </Alert>
        </Stack>
      </>
    );
  }

  return (
    <>
      <IndividualPageHeader title="Proposals" />
      {proposalTableData && (
        <ProposalsTable
          nextProposalId={proposalTableData.nextProposalId}
          hideTitle
        />
      )}
    </>
  );
}
