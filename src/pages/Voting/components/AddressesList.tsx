import {Chip, Grid, Stack, Typography} from "@mui/material";
import {useEffect, useState} from "react";
import {gql, useQuery as useGraphqlQuery} from "@apollo/client";

import {useGlobalState} from "../../../context/globalState";
import VoteButtons from "../../Proposal/card/VoteButtons";
import {AddressToVoteMap, Proposal} from "../../Types";
import {isVotingClosed} from "../../utils";
import hasAddressVoted from "../api/hasAddressVoted";
import {MaybeHexString} from "aptos";

type AddressesListProps = {
  proposal: Proposal;
  accountAddress: MaybeHexString | null;
};

type AddressVotingStateProps = {
  account: AddressToVoteMap;
  index: number;
  proposal: Proposal;
};

function AddressVotingState({
  account,
  index,
  proposal,
}: AddressVotingStateProps) {
  const [voted, setVoted] = useState<boolean>(account.voted);
  const onTransactionSuccess = () => {
    setVoted(true);
  };

  return (
    <Grid
      container
      justifyContent="space-between"
      alignItems="center"
      mb={4}
      key={index}
    >
      <Grid item xs={6}>
        <Stack direction="row">{account.poolAddress}</Stack>
      </Grid>

      <Grid item xs={4}>
        {voted && (
          <Stack alignItems="flex-end">
            <Chip label="Voted" />
          </Stack>
        )}
        {!voted && !isVotingClosed(proposal) && (
          <VoteButtons
            proposalId={proposal.proposal_id}
            stakePoolAddress={account.poolAddress}
            onTransactionSuccess={onTransactionSuccess}
          />
        )}
        {!voted && isVotingClosed(proposal) && (
          <Stack alignItems="flex-end">
            <Chip label="didn't vote" />
          </Stack>
        )}
      </Grid>
    </Grid>
  );
}

const STAKE_POOL_ADDRESS_BY_VOTER_QUERY = gql`
  query current_staking_pool_voter($voter_address: String) {
    current_staking_pool_voter(where: {voter_address: {_eq: $voter_address}}) {
      staking_pool_address
    }
  }
`;

type CurrentStakingPoolVoter = {
  current_staking_pool_voter: [
    {
      __typename: string;
      staking_pool_address: string;
    },
  ];
};

export default function AddressesList({
  proposal,
  accountAddress,
}: AddressesListProps) {
  const [state, _] = useGlobalState();
  const [mapLoading, setMapLoading] = useState<boolean>(false);
  const [addressVoteMap, setAddressVoteMap] = useState<AddressToVoteMap[]>();

  const {loading, error, data} = useGraphqlQuery(
    STAKE_POOL_ADDRESS_BY_VOTER_QUERY,
    {
      variables: {
        voter_address: accountAddress,
      },
    },
  );

  const fetchHasAccountVoted = async (
    poolAddress: string,
  ): Promise<AddressToVoteMap> => {
    const result = await hasAddressVoted(
      poolAddress,
      proposal.proposal_id,
      state,
    );
    const addressToVotemap = {
      poolAddress,
      voted: result,
    };
    return addressToVotemap;
  };

  const fetchAccounts = async (
    poolAddresses: CurrentStakingPoolVoter,
  ): Promise<void> => {
    const map = poolAddresses.current_staking_pool_voter.map(
      async (poolAddress) => {
        const result = await fetchHasAccountVoted(
          poolAddress.staking_pool_address,
        );
        return result;
      },
    );

    const addressesVotesMap = await Promise.all(map);
    setMapLoading(false);
    setAddressVoteMap(addressesVotesMap);
  };

  useEffect(() => {
    if (data !== undefined) {
      setMapLoading(true);
      fetchAccounts(data);
    }
  }, [data, accountAddress]);

  if (loading || mapLoading) {
    return (
      <Stack sx={{width: "100%"}} mt={4}>
        <Typography variant="h4" mb={4}>
          Loading
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack sx={{width: "100%"}} mt={4}>
        <Typography variant="h4" mb={4}>
          {error.message}
        </Typography>
      </Stack>
    );
  }

  if (data.current_staking_pool_voter.length === 0) {
    return (
      <Stack sx={{width: "100%"}} mt={4}>
        <Typography variant="h4" mb={4}>
          We couldn't find any staking pool addresses, make sure you are
          connected with your voter account. If you're delegated staking user,
          use https://govscan.live/aptos/proposals to vote instead.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack sx={{width: "100%"}} mt={4}>
      <Typography variant="h4" mb={4}>
        Stake Pool Addresses
      </Typography>
      {addressVoteMap?.map((account, index) => {
        return (
          <Stack key={account.poolAddress}>
            <AddressVotingState
              account={account}
              index={index}
              proposal={proposal}
            />
          </Stack>
        );
      })}
    </Stack>
  );
}
