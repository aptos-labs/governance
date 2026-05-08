import {InputGenerateTransactionPayloadData} from "@aptos-labs/ts-sdk";
import useSubmitTransaction from "./useSubmitTransaction";

const useSubmitIncreaseLock = () => {
  const {
    submitTransaction,
    transactionInProcess,
    transactionResponse,
    clearTransactionResponse,
  } = useSubmitTransaction();

  async function submitIncreaseLockup() {
    const payload: InputGenerateTransactionPayloadData = {
      function: "0x1::stake::increase_lockup",
      typeArguments: [],
      functionArguments: [],
      abi: {
        typeParameters: [],
        parameters: [],
      },
    };

    await submitTransaction(payload);
  }

  return {
    submitIncreaseLockup,
    transactionInProcess,
    transactionResponse,
    clearTransactionResponse,
  };
};

export default useSubmitIncreaseLock;
