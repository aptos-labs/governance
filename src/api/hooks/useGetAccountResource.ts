import {AccountAddressInput, MoveResource} from "@aptos-labs/ts-sdk";
import {UseQueryResult, useQuery} from "react-query";
import {useGlobalState} from "../../context/globalState";
import {getAccountResource} from "..";
import {ResponseError} from "../client";

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
