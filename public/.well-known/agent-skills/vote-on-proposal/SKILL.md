---
name: vote-on-proposal
description: Cast an on-chain Aptos governance vote through a connected wallet. Agents cannot vote without a user wallet signature.
---

# Vote on an Aptos governance proposal

Voting is an on-chain transaction against `0x1::aptos_governance`. This app never holds private keys.

## Agent flow

1. Open `/proposal/{proposalId}` in the user's browser.
2. Ask the user to connect an AIP-62 wallet (Petra or any registered wallet).
3. Use the on-page voting panel. The user must review and sign the transaction.
4. Do not attempt to submit a vote through the REST or MCP APIs — they are read-only.

## Registration

Read `/auth.md` for agent registration. Read APIs do not require a token.
