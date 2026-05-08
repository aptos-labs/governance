import {
  AccountAddressInput,
  AccountData,
  MoveModuleBytecode,
  MoveResource,
  MoveStructId,
  TableItemRequest,
  TransactionResponse,
} from "@aptos-labs/ts-sdk";
import {isHex} from "../pages/utils";
import {withResponseError} from "./client";
import {getAptosClient} from "./common";

export function getTransaction(
  requestParameters: {txnHashOrVersion: string | number},
  networkName: string,
): Promise<TransactionResponse> {
  const {txnHashOrVersion} = requestParameters;
  if (isHex(txnHashOrVersion as string)) {
    return getTransactionByHash(txnHashOrVersion as string, networkName);
  } else {
    return getTransactionByVersion(txnHashOrVersion as number, networkName);
  }
}

function getTransactionByVersion(
  version: number,
  networkName: string,
): Promise<TransactionResponse> {
  const client = getAptosClient(networkName);
  return withResponseError(
    client.getTransactionByVersion({ledgerVersion: BigInt(version)}),
  );
}

function getTransactionByHash(
  hash: string,
  networkName: string,
): Promise<TransactionResponse> {
  const client = getAptosClient(networkName);
  return withResponseError(
    client.getTransactionByHash({transactionHash: hash}),
  );
}

export function getAccount(
  requestParameters: {address: string},
  networkName: string,
): Promise<AccountData> {
  const client = getAptosClient(networkName);
  const {address} = requestParameters;
  return withResponseError(client.getAccountInfo({accountAddress: address}));
}

export function getAccountResources(
  requestParameters: {address: AccountAddressInput; ledgerVersion?: number},
  networkName: string,
): Promise<MoveResource[]> {
  const client = getAptosClient(networkName);
  const {address, ledgerVersion} = requestParameters;
  return withResponseError(
    client.getAccountResources({
      accountAddress: address,
      options: {
        ledgerVersion: ledgerVersion ? BigInt(ledgerVersion) : undefined,
      },
    }),
  );
}

export function getAccountResource(
  requestParameters: {
    address: AccountAddressInput;
    resourceType: string;
    ledgerVersion?: number;
  },
  networkName: string,
): Promise<MoveResource> {
  const client = getAptosClient(networkName);
  const {address, resourceType, ledgerVersion} = requestParameters;
  return withResponseError(
    client.getAccountResource({
      accountAddress: address,
      resourceType: resourceType as MoveStructId,
      options: {
        ledgerVersion: ledgerVersion ? BigInt(ledgerVersion) : undefined,
      },
    }),
  ) as Promise<MoveResource>;
}

export function getAccountModules(
  requestParameters: {address: string; ledgerVersion?: number},
  networkName: string,
): Promise<MoveModuleBytecode[]> {
  const client = getAptosClient(networkName);
  const {address, ledgerVersion} = requestParameters;
  return withResponseError(
    client.getAccountModules({
      accountAddress: address,
      options: {
        ledgerVersion: ledgerVersion ? BigInt(ledgerVersion) : undefined,
      },
    }),
  );
}

export function getTableItem(
  requestParameters: {tableHandle: string; data: TableItemRequest},
  networkName: string,
): Promise<unknown> {
  const client = getAptosClient(networkName);
  const {tableHandle, data} = requestParameters;
  return withResponseError(client.getTableItem({handle: tableHandle, data}));
}
