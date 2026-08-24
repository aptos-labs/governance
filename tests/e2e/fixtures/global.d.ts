// tests/e2e/fixtures/global.d.ts
// Type declarations for browser globals injected by mock scripts.

/* eslint-disable no-var */
declare global {
  interface Window {
    /** Array of payload objects pushed by the mock wallet's
     *  signAndSubmitTransaction, populated synchronously during the
     *  wallet-adapter call and read by e2e test assertions after the
     *  mutation resolves. */
    __mockWalletCalls?: Array<{ data: { function: string; functionArguments: unknown[] } }>;
  }
}
export {};