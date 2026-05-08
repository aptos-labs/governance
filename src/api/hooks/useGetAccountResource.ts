import {AccountAddressInput, MoveResource} from "@aptos-labs/ts-sdk";
import {useQuery, UseQueryResult} from "react-query";
import {getAccountResource} from "..";
import {ResponseError} from "../client";
import {useGlobalState} from "../../context/globalState";

type useGetAccountResourceResponse = {
  accountResource: MoveResource | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<UseQueryResult>;
};

export function useGetAccountResource(
  address: AccountAddressInput,
  resource: string,
): useGetAccountResourceResponse {
  const [state, _setState] = useGlobalState();
  const accountResourcesResult = useQuery<MoveResource, ResponseError>(
    ["accountResource", {address, resource}, state.network_name],
    () =>
      getAccountResource({address, resourceType: resource}, state.network_name),
    {refetchOnWindowFocus: false},
  );

  const {isLoading, isError, refetch} = accountResourcesResult;

  const accountResource = accountResourcesResult.data;

  return {accountResource, isLoading, isError, refetch};
}
