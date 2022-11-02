import {Box, Grid, Stack, Typography} from "@mui/material";
import {gql, useQuery as useGraphqlQuery} from "@apollo/client";
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
import {Proposal} from "../Types";
import {useEffect, useState} from "react";

export type ProposalPageURLParams = {
  id: string;
};

const PROPOSAL_VOTES_QUERY = gql`
  query proposal_votes($proposal_id: bigint) {
    proposal_votes(
      where: {proposal_id: {_eq: $proposal_id}}
      order_by: {num_votes: desc}
      limit: $limit
      offset: $offset
    ) {
      should_pass
      staking_pool_address
      num_votes
    }
  }
`;

function getTotalVote(proposal: Proposal) {
  const yesVotes: number = parseInt(proposal.yes_votes);
  const noVotes: number = parseInt(proposal.no_votes);
  return yesVotes + noVotes;
}

export const ProposalPage = () => {
  // useParams type signature is string | undefined - to go around it we cast the return value
  const {id: proposalId} = useParams() as ProposalPageURLParams;
  const proposal = useGetProposal(proposalId);
  const [totalVotes, setTotalVotes] = useState<number>(0);

  const {loading, error, data} = useGraphqlQuery(PROPOSAL_VOTES_QUERY, {
    variables: {
      proposal_id: proposalId,
    },
  });

  useEffect(() => {
    if (proposal !== undefined) {
      setTotalVotes(getTotalVote(proposal));
    }
  }, [proposal]);

  if (!proposal) {
    return <EmptyProposal />;
  }

  const handlePaginationChange = () => {
    console.log("here");
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
      <Grid item xs={12} mt={8}>
        {data && (
          <Stack spacing={2}>
            <VotesTable votes={data.proposal_votes} totalVotes={totalVotes} />
            <Box sx={{display: "flex", justifyContent: "center"}}>
              <Pagination
                variant="outlined"
                shape="rounded"
                onChange={handlePaginationChange}
              />
            </Box>
          </Stack>
        )}
      </Grid>
    </Grid>
  );
};
