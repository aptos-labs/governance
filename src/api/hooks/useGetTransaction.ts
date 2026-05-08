import {TransactionResponse} from "@aptos-labs/ts-sdk";
import {useQuery} from "react-query";
import {getTransaction} from "../../api";
import {ResponseError} from "../../api/client";
import {useGlobalState} from "../../context/globalState";

export function useGetTransaction(txnHashOrVersion: string) {
  const [state, _setState] = useGlobalState();

  const result = useQuery<TransactionResponse, ResponseError>(
    ["transaction", {txnHashOrVersion}, state.network_name],
    () => getTransaction({txnHashOrVersion}, state.network_name),
    {enabled: !!txnHashOrVersion},
  );

  return result;
}
