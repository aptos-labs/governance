// tests/e2e/fixtures/run-mock-server.ts
//
// Standalone entry point that starts the mock fullnode/indexer server
// as its own long-lived process, run via a `pretest:e2e` npm script
// (see package.json) BEFORE `playwright test` itself even starts.
//
// Why this exists instead of starting the mock server from inside
// Playwright (globalSetup, or a "project dependencies" setup project):
// both were tried and both failed in this environment — confirmed via
// a filesystem side-effect probe (writing a temp file as the very
// first line of the setup function) that never appeared across
// multiple runs, for either mechanism. The common element in both
// failures is Playwright's `webServer` readiness probe: it polls
// `http://localhost:3000/` and this app's "/" route loader eagerly
// calls listProposals, which immediately tries to reach
// APTOS_FULLNODE_URL (port 8081) — so the health check fails with
// HTTP 500 until something is listening there, and in this
// environment that health check appears to block BEFORE either
// Playwright-internal setup mechanism gets a chance to run, not after.
// Starting the mock server as a fully separate OS process, before the
// `playwright test` command is even invoked, sidesteps Playwright's
// internal task ordering entirely — by the time `playwright test`
// starts polling port 3000, port 8081 has already been serving
// responses for as long as `pnpm dev` takes to boot, which is normally
// well under a second.
import {startMockFullnodeServer} from "./mock-fullnode-server.ts";

async function main() {
  await startMockFullnodeServer(8081);
  console.log("[mock-fullnode-server] listening on http://localhost:8081");
}

main().catch((error) => {
  console.error("[mock-fullnode-server] failed to start:", error);
  process.exit(1);
});
