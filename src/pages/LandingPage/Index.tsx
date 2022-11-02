import {useRef} from "react";
import {Box, Grid, Stack} from "@mui/material";
import {HomePageHeader} from "../../components/Header";
import {Header as ProposalsHeader} from "./Header";
import {ProposalsTable} from "./Table";
import {useGetProposalsTableData} from "../../api/hooks/useGetProposalsTableData";

export default function LandingPage() {
  const proposalTableData = useGetProposalsTableData();
  const ProposalsTableRef = useRef<null | HTMLDivElement>(null);

  const scrollTableIntoView = () => {
    ProposalsTableRef.current?.scrollIntoView({behavior: "smooth"});
  };

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
