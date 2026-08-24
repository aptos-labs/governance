#!/bin/sh
# tests/e2e/run-with-mock-server.sh
#
# Starts the mock fullnode/indexer server as a background process
# BEFORE `playwright test` runs, then always stops it afterward
# regardless of the test outcome.
#
# Why this exists (rather than starting the mock server from inside
# Playwright via `globalSetup` or a "project dependencies" setup
# project): both were tried and both failed in this environment,
# confirmed via a filesystem side-effect probe that never appeared
# across multiple runs for either mechanism. The common failure point
# was Playwright's `webServer` readiness probe (a GET to
# http://localhost:3000/) — this app's "/" route loader eagerly calls
# listProposals, which immediately tries to reach APTOS_FULLNODE_URL
# (port 8081), so the health check fails with HTTP 500 until something
# is listening there. In this environment, that health check appeared
# to gate every Playwright-internal setup mechanism, not just tests.
# Starting the mock server as a fully separate process before
# `playwright test` is even invoked sidesteps Playwright's internal
# task ordering entirely.
set -e

cd "$(dirname "$0")/../.."

node tests/e2e/fixtures/run-mock-server.ts &
MOCK_SERVER_PID=$!

cleanup() {
  kill "$MOCK_SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Give the mock server a brief moment to bind its port before
# Playwright's webServer starts polling it indirectly through the app.
sleep 1

pnpm exec playwright test "$@"
