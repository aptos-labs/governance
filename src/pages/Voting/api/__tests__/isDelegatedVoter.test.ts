import {GlobalState} from "../../../../context/globalState/context";
import isDelegatedVoter from "../isDelegatedVoter";

const stakePoolAddress =
  "0x114c5bbd46d2de2ab364649f483bf3d645656fb5509f26e47db9c8446ca2c9af";

const mockState: GlobalState = {
  network_name: "local",
  network_value: "mock-url",
};

const addresses = [
  [
    "0x00a72706e4b4485583f7cdc7cfcd782f52e5266bb718bf9e372f80d13a347c0e",
    "0xa72706e4b4485583f7cdc7cfcd782f52e5266bb718bf9e372f80d13a347c0e",
  ],
  [
    "0xe7be097a90c18f6bdd53efe0e74bf34393cac2f0ae941523ea196a47b6859edb",
    "0xe7be097a90c18f6bdd53efe0e74bf34393cac2f0ae941523ea196a47b6859edb",
  ],
  [
    "0x0000000000c18f6bdd53efe0e74bf34393cac2f0ae941523ea196a47b6859edb",
    "0xc18f6bdd53efe0e74bf34393cac2f0ae941523ea196a47b6859edb",
  ],
];

test.each(addresses)(
  "current wallet address %i matches delegated voter address %i",
  async (walletAddress, delegatedVoterAddress) => {
    const sdk = require("../../../../api");

    jest.spyOn(sdk, "getAccountResource").mockReturnValue({
      data: {
        delegated_voter: delegatedVoterAddress,
      },
    });

    const result = await isDelegatedVoter(
      stakePoolAddress,
      walletAddress,
      mockState,
    );
    expect(result).toBe(true);
  },
);
