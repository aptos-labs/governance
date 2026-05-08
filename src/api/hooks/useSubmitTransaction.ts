import {InputGenerateTransactionPayloadData} from "@aptos-labs/ts-sdk";
import {useState} from "react";
import {useWallet as useAdapterWallet} from "@aptos-labs/wallet-adapter-react";

import {useWalletContext} from "../../context/wallet/context";
import {useGlobalState} from "../../context/globalState";
import {getAptosClient} from "../common";

export type TransactionResponse =
  | TransactionResponseOnSubmission
  | TransactionResponseOnError;

// "submission" here means that the transaction is posted on chain and gas is paid.
// However, the status of the transaction might not be "success".
export type TransactionResponseOnSubmission = {
  transactionSubmitted: true;
  transactionHash: string;
};

export type TransactionResponseOnError = {
  transactionSubmitted: false;
  message: string;
};

const useSubmitTransaction = () => {
  const [transactionResponse, setTransactionResponse] =
    useState<TransactionResponse | null>(null);
  const [transactionInProcess, setTransactionInProcess] =
    useState<boolean>(false);
  const [state, _] = useGlobalState();
  const {walletNetwork} = useWalletContext();
  const {signAndSubmitTransaction} = useAdapterWallet();
  const client = getAptosClient(state.network_name);

  async function submitTransaction(
    payload: InputGenerateTransactionPayloadData,
  ) {
    const selectedNetwork = state.network_name.toLowerCase();
    if (walletNetwork && walletNetwork !== selectedNetwork) {
      setTransactionResponse({
        transactionSubmitted: false,
        message:
          "Wallet and Governance should use the same network to submit a transaction",
      });
      return;
    }

    setTransactionInProcess(true);
    try {
      const response = await signAndSubmitTransaction({data: payload});
      await client.waitForTransaction({transactionHash: response.hash});
      setTransactionResponse({
        transactionSubmitted: true,
        transactionHash: response.hash,
      });
      setTransactionInProcess(false);
    } catch (error: unknown) {
      setTransactionResponse({
        transactionSubmitted: false,
        message:
          error instanceof Error
            ? error.message
            : String(error ?? "Unknown Error"),
      });
      setTransactionInProcess(false);
    }
  }

  function clearTransactionResponse() {
    setTransactionResponse(null);
  }

  return {
    submitTransaction,
    transactionInProcess,
    transactionResponse,
    clearTransactionResponse,
  };
};

export default useSubmitTransaction;
