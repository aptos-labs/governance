import {gql, useQuery as useGraphqlQuery} from "@apollo/client";

const PROPOSAL_VOTES_COUNT_QUERY = gql`
  query proposal_votes_aggregate($proposal_id: bigint) {
    proposal_votes_aggregate(where: {proposal_id: {_eq: $proposal_id}}) {
      aggregate {
        count
      }
    }
  }
`;

export function useGetProposalVotesCount(proposalId: string) {
  const {data} = useGraphqlQuery(PROPOSAL_VOTES_COUNT_QUERY, {
    variables: {
      proposal_id: proposalId,
    },
  });

  if (!data) {
    return 0;
  }

  return data.proposal_votes_aggregate.aggregate.count;
}
