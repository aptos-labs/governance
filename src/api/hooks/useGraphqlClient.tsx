import React from "react";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  HttpLink,
  NormalizedCacheObject,
} from "@apollo/client";
import {useMemo} from "react";

import {useGlobalState} from "../../context/globalState";
import {NetworkName} from "../../constants";

function getGraphqlURI(networkName: NetworkName): string | undefined {
  const envMainnet = import.meta.env.VITE_INDEXER_GRAPHQL_MAINNET;
  const envTestnet = import.meta.env.VITE_INDEXER_GRAPHQL_TESTNET;
  const envDevnet = import.meta.env.VITE_INDEXER_GRAPHQL_DEVNET;

  switch (networkName.toLowerCase()) {
    case "mainnet":
      return envMainnet || "https://api.mainnet.aptoslabs.com/v1/graphql";
    case "testnet":
      return envTestnet || "https://api.testnet.aptoslabs.com/v1/graphql";
    case "devnet":
      return envDevnet || "https://api.devnet.aptoslabs.com/v1/graphql";
    case "local":
      return "http://127.0.0.1:8090/v1/graphql";
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
  const graphqlClient = useMemo(
    () => getGraphqlClient(state.network_name),
    [state.network_name],
  );

  return graphqlClient;
}

type GraphqlClientProviderProps = {
  children: React.ReactNode;
};

export function GraphqlClientProvider({children}: GraphqlClientProviderProps) {
  const graphqlClient = useGetGraphqlClient();

  return <ApolloProvider client={graphqlClient}>{children}</ApolloProvider>;
}
