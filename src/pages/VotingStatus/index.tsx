import {Grid} from "@mui/material";
import React, {useState} from "react";
import {useParams} from "react-router-dom";
import {useGetProposal} from "../../api/hooks/useGetProposal";
import GoBack from "../../components/GoBack";
import {IndividualPageHeader} from "../../components/Header";
import {EmptyProposal} from "../Proposal/EmptyProposal";
import {ProposalHeader} from "../Proposal/Header";
import {AddressToVoteMap} from "../Types";
import AddressesList from "../Voting/components/AddressesList";
import StakePoolAddressInput from "../Voting/components/StakePoolAddressInput";

export type ProposalPageURLParams = {
  id: string;
};

export default function VotingStatus() {
  const {id: proposalId} = useParams() as ProposalPageURLParams;
  const proposal = useGetProposal(proposalId);

  const [addressVoteMap, setAddressVoteMap] = useState<AddressToVoteMap[]>();

  if (!proposal) {
    return <EmptyProposal />;
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
      />
      {addressVoteMap && (
        <AddressesList addressVoteMap={addressVoteMap} proposal={proposal} />
      )}
    </Grid>
  );
}
