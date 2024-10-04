import {Grid} from "@mui/material";
import React, {useState} from "react";
import {useParams} from "react-router-dom";
import {useGetProposal} from "../../api/hooks/useGetProposal";
import GoBack from "../../components/GoBack";
import {IndividualPageHeader} from "../../components/Header";
import {EmptyProposal} from "../Proposal/EmptyProposal";
import {ProposalHeader} from "../Proposal/Header";
import {AddressToVoteMap} from "../Types";
import AddressesList from "./components/AddressesList";
import StakePoolAddressInput from "./components/StakePoolAddressInput";
import {defaultProposalErrorMessage} from "../../constants";

export type ProposalPageURLParams = {
  id: string;
};

export default function VotingStatus() {
  const {id: proposalId} = useParams() as ProposalPageURLParams;
  const {proposal} = useGetProposal(proposalId);

  const [addressVoteMap, setAddressVoteMap] = useState<AddressToVoteMap[]>();

  if (!proposal || "errorMessage" in proposal) {
    return (
      <EmptyProposal
        errorMessage={proposal?.errorMessage ?? defaultProposalErrorMessage}
      />
    );
  }

  return (
    <Grid container>
      <IndividualPageHeader title="Voting Status" />
      <GoBack to={"/"} />
      <Grid item xs={12}>
        <ProposalHeader proposal={proposal} />
      </Grid>
      <StakePoolAddressInput
        setAddressVoteMap={setAddressVoteMap}
        proposalId={proposalId}
        subtitle="Input the staking pool addresses you would like to see the voting status for, separated
        by space."
      />
      {addressVoteMap && <AddressesList addressVoteMap={addressVoteMap} />}
    </Grid>
  );
}
