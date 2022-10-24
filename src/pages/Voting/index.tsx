import {Grid} from "@mui/material";
import {useEffect} from "react";
import {useNavigate, useParams} from "react-router-dom";

import {useGetProposal} from "../../api/hooks/useGetProposal";
import GoBack from "../../components/GoBack";
import {IndividualPageHeader} from "../../components/Header";
import {useWalletContext} from "../../context/wallet/context";
import {EmptyProposal} from "../Proposal/EmptyProposal";
import {ProposalHeader} from "../Proposal/Header";
import AddressesList from "./components/AddressesList";

export type ProposalPageURLParams = {
  id: string;
};

export default function Voting() {
  const {id: proposalId} = useParams() as ProposalPageURLParams;
  const proposal = useGetProposal(proposalId);
  const {accountAddress, isConnected} = useWalletContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!accountAddress || !isConnected) {
      navigate(`/proposal/${proposalId}`);
    }
  }, [accountAddress, isConnected]);

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
      <AddressesList proposal={proposal} accountAddress={accountAddress} />
    </Grid>
  );
}
