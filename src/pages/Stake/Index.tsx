import React from "react";

import {useWalletContext} from "../../context/wallet/context";
import {CreateOrEdit} from "./components/CreateOrEdit";
import {IndividualPageHeader} from "../../components/Header";

export default function StakingPage() {
  const {isConnected, accountAddress} = useWalletContext();

  return (
    <>
      <IndividualPageHeader title="Staking" />
      <CreateOrEdit
        isWalletConnected={isConnected}
        accountAddress={accountAddress}
      />
    </>
  );
}
