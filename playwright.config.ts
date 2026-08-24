// playwright.config.ts
import {defineConfig, devices} from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Not fullyParallel: both tests in vote-flow.spec.ts share one
  // stateful mock fullnode/indexer server bound to a fixed port
  // (8081, started once by the "setup" project below) — keeping this
  // serial avoids any shared-state surprises (e.g. the mock wallet's
  // window.__mockWalletCalls) between the two tests.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      // The /v1 suffix is required, not optional: the SDK's own
      // production default for AptosConfig.fullnode is
      // "https://api.mainnet.aptoslabs.com/v1" (confirmed directly
      // from @aptos-labs/ts-sdk's utils/apiEndpoints.js) and
      // AptosConfig.getRequestUrl() returns a custom `fullnode` value
      // verbatim, appending resource/table/view paths directly onto
      // it with no path-prefix insertion. Omitting /v1 here (as an
      // earlier version of this config did) causes every fullnode
      // request to be missing a path segment, which the mock server
      // then correctly reports as "no handler for GET
      // /accounts/0x1/resource/..." instead of the expected
      // "/v1/accounts/0x1/resource/...".
      APTOS_FULLNODE_URL: "http://localhost:8081/v1",
      APTOS_INDEXER_URL: "http://localhost:8081/graphql",
    },
  },
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [
    // Starts the mock fullnode/indexer server before the "chromium"
    // project's tests run — and, critically, before webServer's own
    // readiness probe against http://localhost:3000/ succeeds, since
    // that probe depends on the mock server already being up (see
    // global.setup.ts for the full explanation, including why the
    // config-level `globalSetup` option was tried first and replaced
    // with this "project dependencies" approach instead).
    {name: "setup", testMatch: /global\.setup\.ts/},
    {
      name: "chromium",
      use: {...devices["Desktop Chrome"]},
      dependencies: ["setup"],
    },
  ],
});
