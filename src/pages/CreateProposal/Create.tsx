import {Button, Grid, Typography, TextField} from "@mui/material";
import {useState} from "react";
import {
  Account,
  AccountAddress,
  Aptos,
  Ed25519PrivateKey,
  InputGenerateTransactionPayloadData,
} from "@aptos-labs/ts-sdk";
import {getHexString} from "../utils";
import {useGlobalState} from "../../context/globalState";
import {doTransaction} from "../utils";
import {getAptosClient} from "../../api/common";

/* OPTIONAL: Please replace the following with your own test data */
const TEST_EXECUTION_HASH =
  "0x21bd7a43e576297d3f71badd7ee740ccd2ef8a13cf6660075ae2de0994b1f433";
const TEST_METADATA_LOCATION =
  "https://mocki.io/v1/5714369f-d2d6-4987-83a2-2f3f4c2b5d38";
const TEST_METADATA_HASH =
  "706b43a2a6f116099a079b2bf469a7add66190d26e324b275f174566d7e603ca";

async function createProposal(
  account: Account,
  client: Aptos,
): Promise<string> {
  const payload: InputGenerateTransactionPayloadData = {
    function: "0x1::aptos_governance::create_proposal",
    typeArguments: [],
    functionArguments: [
      account.accountAddress.toString(),
      TEST_EXECUTION_HASH,
      getHexString(TEST_METADATA_LOCATION),
      getHexString(TEST_METADATA_HASH),
    ],
  };
  const transactionRes = await doTransaction(account, client, payload);

  return transactionRes.hash;
}

export function Create() {
  const [state, _] = useGlobalState();

  const [accountAddr, setAccountAddr] = useState<string>("");
  const [accountSecretKey, setAccountSecretKey] = useState<string>("");

  const onAccountAddrChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAccountAddr(event.target.value);
  };

  const onAccountSecretKeyChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setAccountSecretKey(event.target.value);
  };

  const onCreateProposalClick = async () => {
    const client = getAptosClient(state.network_name);

    const account = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(accountSecretKey),
      address: AccountAddress.from(accountAddr),
      legacy: true,
    });
    await client.fundAccount({
      accountAddress: account.accountAddress,
      amount: 5000,
    });

    const proposalHash = await createProposal(account, client);
    setProposalHash(proposalHash);
  };

  const [proposalHash, setProposalHash] = useState<string>();

  return (
    <>
      <TextField
        fullWidth
        label="Account Address"
        variant="outlined"
        margin="normal"
        value={accountAddr}
        onChange={onAccountAddrChange}
      />
      <TextField
        fullWidth
        label="Account Secret Key"
        variant="outlined"
        margin="normal"
        value={accountSecretKey}
        onChange={onAccountSecretKeyChange}
      />
      <Grid
        container
        direction="row"
        justifyContent={{xs: "center", sm: "flex"}}
        alignItems="center"
      >
        <Button variant="primary" sx={{mt: 4}} onClick={onCreateProposalClick}>
          Create a Test Proposal
        </Button>
      </Grid>
      {proposalHash && (
        <Grid
          container
          direction="row"
          justifyContent={{xs: "center", sm: "flex"}}
          alignItems="center"
        >
          <Typography mt={4}>New Proposal: {proposalHash}</Typography>
        </Grid>
      )}
    </>
  );
}
