import React from "react";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  HttpLink,
  NormalizedCacheObject,
} from "@apollo/client";
import {useEffect, useState} from "react";

import {useGlobalState} from "../../context/globalState";
import {NetworkName} from "../../constants";

function getGraphqlURI(networkName: NetworkName): string | undefined {
  switch (networkName) {
    case "mainnet":
      return process.env.REACT_APP_INDEXER_GRAPHQL_MAINNET;
    case "testnet":
      return process.env.REACT_APP_INDEXER_GRAPHQL_TESTNET;
    case "Devnet":
      return process.env.REACT_APP_INDEXER_GRAPHQL_DEVNET;
    case "local":
      return undefined;
    default:
      return undefined;
  }
}

function getGraphqlClient(
  networkName: NetworkName,
): ApolloClient<NormalizedCacheObject> {
  return new ApolloClient({
    link: new HttpLink({
      uri: getGraphqlURI(networkName),
    }),
    cache: new InMemoryCache(),
  });
}

export function useGetGraphqlClient() {
  const [state, _] = useGlobalState();
  const [graphqlClient, setGraphqlClient] = useState<
    ApolloClient<NormalizedCacheObject>
  >(getGraphqlClient(state.network_name));

  useEffect(() => {
    setGraphqlClient(getGraphqlClient(state.network_name));
  }, [state.network_name]);

  return graphqlClient;
}

type GraphqlClientProviderProps = {
  children: React.ReactNode;
};

export function GraphqlClientProvider({children}: GraphqlClientProviderProps) {
  const graphqlClient = useGetGraphqlClient();

  return <ApolloProvider client={graphqlClient}>{children}</ApolloProvider>;
}
