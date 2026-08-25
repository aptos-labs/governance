// tests/e2e/fixtures/mock-wallet.ts

/**
 * Serialized as a string and injected via page.addInitScript in
 * vote-flow.spec.ts. Implements exactly the required AIP-62 feature
 * set confirmed from @aptos-labs/wallet-standard's isWalletWithRequiredFeatureSet
 * (aptos:account, aptos:connect, aptos:disconnect, aptos:network,
 * aptos:onAccountChange, aptos:onNetworkChange, aptos:signMessage,
 * aptos:signTransaction) plus the optional aptos:signAndSubmitTransaction
 * this app actually calls, and registers itself via the real
 * wallet-standard 'wallet-standard:register-wallet' event protocol
 * confirmed from @wallet-standard/core's registerWallet() source —
 * not a guessed/simplified event shape.
 */
export const MOCK_WALLET_INIT_SCRIPT = `
(function () {
  const MOCK_ADDRESS = "0xf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfee";
  // Must be genuinely valid hex (not human-readable placeholder text
  // like "0xstakepoolmock...") — the app's real code path parses this
  // as an actual AccountAddress once past the wallet-connect step
  // (when building/encoding a real view-function call), and a
  // non-hex address throws "Hex characters are invalid" at that
  // point, confirmed by reproducing this exact failure.
  const MOCK_POOL_ADDRESS = "0xbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00d";

  window.__mockWalletCalls = [];

  const account = {
    address: MOCK_ADDRESS,
    publicKey: "0x" + "11".repeat(32),
  };

  const wallet = {
    version: "1.0.0",
    name: "Mock Wallet",
    icon: "data:image/svg+xml;base64,PHN2Zy8+",
    url: "https://example.com/mock-wallet",
    chains: ["aptos:mainnet"],
    accounts: [account],
    features: {
      "aptos:account": {
        version: "1.0.0",
        account: async () => account,
      },
      "aptos:connect": {
        version: "1.0.0",
        connect: async () => ({ status: "Approved", args: account }),
      },
      "aptos:disconnect": {
        version: "1.0.0",
        disconnect: async () => {},
      },
      "aptos:network": {
        version: "1.0.0",
        network: async () => ({ name: "mainnet", chainId: 1, url: "http://localhost:8081" }),
      },
      "aptos:onAccountChange": {
        version: "1.0.0",
        onAccountChange: async () => {},
      },
      "aptos:onNetworkChange": {
        version: "1.0.0",
        onNetworkChange: async () => {},
      },
      "aptos:signMessage": {
        version: "1.0.0",
        signMessage: async (input) => ({
          status: "Approved",
          args: { message: input.message, nonce: input.nonce, signature: "0x" + "22".repeat(64) },
        }),
      },
      "aptos:signTransaction": {
        version: "1.0.0",
        signTransaction: async () => ({
          status: "Approved",
          args: { authenticator: {}, rawTransaction: new Uint8Array() },
        }),
      },
      "aptos:signAndSubmitTransaction": {
        version: "1.0.0",
        signAndSubmitTransaction: async (input) => {
          window.__mockWalletCalls.push(input);
          return {
            status: "Approved",
            args: { hash: "0x" + "aa".repeat(32) },
          };
        },
      },
    },
  };

  function registerWallet(w) {
    const callback = (detail) => detail.register(w);
    try {
      window.dispatchEvent(
        new CustomEvent("wallet-standard:register-wallet", { detail: callback }),
      );
    } catch (e) {
      console.error("mock wallet register-wallet dispatch failed", e);
    }
    try {
      window.addEventListener("wallet-standard:app-ready", (event) =>
        callback(event.detail),
      );
    } catch (e) {
      console.error("mock wallet app-ready listener failed", e);
    }
  }

  registerWallet(wallet);
})();
`;

export const MOCK_ADDRESS =
  "0xf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfee";
// Must match the browser-injected script's MOCK_POOL_ADDRESS exactly —
// see the comment there for why this must be genuinely valid hex.
export const MOCK_POOL_ADDRESS =
  "0xbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00d";
