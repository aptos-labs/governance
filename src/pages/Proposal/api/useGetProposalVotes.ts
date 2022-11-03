import {gql, useQuery as useGraphqlQuery} from "@apollo/client";

const PROPOSAL_VOTES_QUERY = gql`
  query proposal_votes($proposal_id: bigint, $offset: Int) {
    proposal_votes(
      where: {proposal_id: {_eq: $proposal_id}}
      order_by: {num_votes: desc}
      offset: $offset
    ) {
      should_pass
      staking_pool_address
      num_votes
    }
  }
`;

export function useGetProposalVotes(proposalId: string, offset: number) {
  const {loading, data} = useGraphqlQuery(PROPOSAL_VOTES_QUERY, {
    variables: {
      proposal_id: proposalId,
      offset,
    },
  });

  if (!data) {
    return {votes: null, loading};
  }

  const votes = data.proposal_votes;

  return {votes, loading};
}
