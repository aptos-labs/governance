import {MoveResource} from "@aptos-labs/ts-sdk";
import {useQuery, UseQueryResult} from "react-query";
import {getAccountResources} from "../../api";
import {ResponseError} from "../../api/client";
import {useGlobalState} from "../../context/globalState";

export function useGetAccountResources(
  address: string,
): UseQueryResult<MoveResource[], ResponseError> {
  const [state, _setState] = useGlobalState();

  const accountResourcesResult = useQuery<Array<MoveResource>, ResponseError>(
    ["accountResources", {address}, state.network_name],
    () => getAccountResources({address}, state.network_name),
  );

  return accountResourcesResult;
}
