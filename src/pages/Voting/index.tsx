import {Grid} from "@mui/material";
import {useParams} from "react-router-dom";

import {useGetProposal} from "../../api/hooks/useGetProposal";
import GoBack from "../../components/GoBack";
import {IndividualPageHeader} from "../../components/Header";
import {EmptyProposal} from "../Proposal/EmptyProposal";
import {ProposalHeader} from "../Proposal/Header";
import AddressesList from "./components/AddressesList";

export type ProposalPageURLParams = {
  id: string;
};

export default function Voting() {
  const {id: proposalId} = useParams() as ProposalPageURLParams;
  const proposal = useGetProposal(proposalId);

  if (!proposal) {
    return <EmptyProposal />;
  }

  return (
    <Grid container>
      <IndividualPageHeader title="Vote" />
      <GoBack to={"/"} />
      <Grid item xs={12}>
        <ProposalHeader proposal={proposal} />
      </Grid>
      <AddressesList proposal={proposal} />
    </Grid>
  );
}
