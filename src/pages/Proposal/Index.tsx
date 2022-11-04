import {Box, Grid, Stack} from "@mui/material";
import {useParams} from "react-router-dom";
import Pagination from "@mui/material/Pagination";

import {ProposalHeader} from "./Header";
import {ProposalCard} from "./card/Index";
import {ProposalContent} from "./Content";
import {useGetProposal} from "../../api/hooks/useGetProposal";
import {EmptyProposal} from "./EmptyProposal";
import {IndividualPageHeader} from "../../components/Header";
import GoBack from "../../components/GoBack";
import {VotesTable} from "./VotesTable";
import {useState} from "react";
import {useGetProposalVotesCount} from "./api/useGetProposalVotesCount";
import {useGetProposalVotes} from "./api/useGetProposalVotes";
import LoadingModal from "../../components/LoadingModal";

export type ProposalPageURLParams = {
  id: string;
};

const QUERY_LIMIT = 20;

export const ProposalPage = () => {
  // useParams type signature is string | undefined - to go around it we cast the return value
  const {id: proposalId} = useParams() as ProposalPageURLParams;
  const proposal = useGetProposal(proposalId);
  const [offset, setOffset] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const {votes, loading} = useGetProposalVotes(proposalId, offset);
  const totalVotesCount = useGetProposalVotesCount(proposalId);

  const numPages = totalVotesCount && Math.ceil(totalVotesCount / QUERY_LIMIT);

  if (!proposal) {
    return <EmptyProposal />;
  }

  const handlePaginationChange = (
    event: React.ChangeEvent<unknown>,
    newPageNum: number,
  ) => {
    setOffset((newPageNum - 1) * QUERY_LIMIT);
    setCurrentPage(newPageNum);
  };

  return (
    <Grid container>
      <IndividualPageHeader title="Proposal" />
      <GoBack to={"/"} />
      <Grid item md={12} xs={12} sx={{mb: 6}}>
        <ProposalHeader proposal={proposal} />
      </Grid>
      <Grid
        item
        md={8}
        xs={12}
        paddingRight={{md: 6, xs: 0}}
        marginBottom={{md: 0, xs: 6}}
      >
        <ProposalContent proposal={proposal} />
      </Grid>
      <Grid item md={4} xs={12}>
        <ProposalCard proposal={proposal} />
      </Grid>
      <Grid item xs={8} mt={8}>
        {loading && <LoadingModal open={loading} />}
        {votes && votes.length > 0 && (
          <Stack spacing={2}>
            <VotesTable votes={votes} />
            <Box sx={{display: "flex", justifyContent: "center"}}>
              {votes && votes.length < totalVotesCount && (
                <Pagination
                  variant="outlined"
                  shape="rounded"
                  onChange={handlePaginationChange}
                  page={currentPage}
                  count={numPages}
                  showFirstButton
                  showLastButton
                />
              )}
            </Box>
          </Stack>
        )}
      </Grid>
    </Grid>
  );
};
