import {BCS, HexString, TxnBuilderTypes} from "aptos";

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

test.each(addresses)("address %i matches %i", (addressA, addressB) => {
  const addressAFromHex = TxnBuilderTypes.AccountAddress.fromHex(addressA);
  const addressBFromHex = TxnBuilderTypes.AccountAddress.fromHex(addressB);

  const addressABcs = HexString.fromUint8Array(
    BCS.bcsToBytes(addressAFromHex),
  ).hex();
  const addressBBcs = HexString.fromUint8Array(
    BCS.bcsToBytes(addressBFromHex),
  ).hex();

  expect(addressABcs).toMatch(addressBBcs);
});
