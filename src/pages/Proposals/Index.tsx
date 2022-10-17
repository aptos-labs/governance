import React from "react";
import {useGetProposalsTableData} from "../../api/hooks/useGetProposalsTableData";
import {ProposalsTable} from "../LandingPage/Table";
import {IndividualPageHeader} from "../../components/Header";

export default function ProposalsPage() {
  const proposalTableData = useGetProposalsTableData();

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
