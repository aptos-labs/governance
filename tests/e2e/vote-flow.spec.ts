// tests/e2e/vote-flow.spec.ts
import {expect, test} from "@playwright/test";
import {ACTIVE_PROPOSAL_ID} from "./fixtures/mock-fullnode-server";
import {MOCK_ADDRESS, MOCK_WALLET_INIT_SCRIPT} from "./fixtures/mock-wallet";

async function expectNoHorizontalOverflow(
  page: import("@playwright/test").Page,
) {
  const widths = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport + 1);
}

// The mock fullnode/indexer server is started once, as its own
// process, before `playwright test` is even invoked — see
// package.json's `test:e2e` script and tests/e2e/run-with-mock-server.sh
// for why it cannot be started from inside Playwright (globalSetup and
// project-dependencies were both tried and both failed to run before
// the webServer readiness probe in this environment).

/**
 * Opens the wallet-connect picker and clicks the "Mock Wallet"
 * menuitem, retrying the initial "Connect Wallet" click if the
 * menuitem hasn't appeared yet.
 *
 * Why this retry is needed (confirmed, not a defensive guess): this
 * app is server-rendered, and there is a real, reproducible window
 * where "Connect Wallet" is visible and clickable in the DOM before
 * React has finished hydrating and attaching its onClick handler —
 * clicking during that window is a silent no-op, since the browser
 * click event fires and is gone before the handler exists to catch
 * it. This was diagnosed directly: a manual reproduction that waited
 * before clicking opened the picker correctly every time (confirming
 * the wallet itself registers and is discovered correctly — "Mock
 * Wallet" appeared in the DOM immediately alongside AptosConnect's
 * real "Continue with Google"/"Continue with Apple" options), while
 * the original test (click immediately after page.goto, no wait)
 * failed consistently with the menu never opening at all. Retrying
 * the click (rather than adding a fixed sleep) tolerates the race
 * without weakening what the test proves or introducing arbitrary
 * timing that could still flake under different machine speeds.
 */
async function connectMockWallet(page: import("@playwright/test").Page) {
  const connectButton = page.getByRole("button", {name: /connect wallet/i});
  const mockWalletMenuItem = page.getByRole("menuitem", {name: "Mock Wallet"});

  await expect(async () => {
    await connectButton.click();
    await expect(mockWalletMenuItem).toBeVisible({timeout: 1000});
  }).toPass({timeout: 15000});

  await mockWalletMenuItem.click();
}

test("keeps connected voting controls within a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({width: 320, height: 844});
  await page.addInitScript(MOCK_WALLET_INIT_SCRIPT);
  await page.goto(`/proposal/${ACTIVE_PROPOSAL_ID}`);
  await connectMockWallet(page);

  await expect(
    page.getByText(MOCK_ADDRESS.slice(0, 8), {exact: false}).first(),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", {name: /^yes$/i}).click();
  await page.getByRole("button", {name: /review vote/i}).click();
  await expect(
    page.getByText("0x1::aptos_governance::partial_vote"),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("connect wallet, view proposal, and cast a vote", async ({page}) => {
  // Inject the mock AIP-62 wallet before any app script runs, so the
  // adapter's discovery code sees it exactly like a real extension.
  await page.addInitScript(MOCK_WALLET_INIT_SCRIPT);

  await page.goto(`/proposal/${ACTIVE_PROPOSAL_ID}`);

  // The verified title should be visible — confirms metadata hash
  // verification passed against the mock server's served body.
  await expect(page.getByText("Mock Proposal For E2E Testing")).toBeVisible();

  await connectMockWallet(page);

  // The truncated mock address should appear once connected.
  await expect(
    page.getByText(MOCK_ADDRESS.slice(0, 8), {exact: false}),
  ).toBeVisible();

  // Cast a Yes vote.
  await page.getByRole("button", {name: /^yes$/i}).click();
  await page.getByRole("button", {name: /review vote/i}).click();

  // Review step must show the real function name before any signing.
  await expect(
    page.getByText("0x1::aptos_governance::partial_vote"),
  ).toBeVisible();

  await page.getByRole("button", {name: /confirm and sign/i}).click();

  // After a successful vote, the mock wallet's signAndSubmitTransaction
  // should have been called with the exact expected payload.
  await page.waitForFunction(() => (window.__mockWalletCalls?.length ?? 0) > 0);
  const calls = (await page.evaluate(
    () => window.__mockWalletCalls,
  )) as NonNullable<typeof window.__mockWalletCalls>;
  expect(calls).toHaveLength(1);
  expect(calls[0].data.function).toBe("0x1::aptos_governance::partial_vote");
  expect(calls[0].data.functionArguments[1]).toBe(ACTIVE_PROPOSAL_ID);
  expect(calls[0].data.functionArguments[3]).toBe(true);
});

test("shows a specific message when the wallet rejects the connection", async ({
  page,
}) => {
  const REJECTING_WALLET_SCRIPT = MOCK_WALLET_INIT_SCRIPT.replace(
    `connect: async () => ({ status: "Approved", args: account }),`,
    `connect: async () => { throw new Error("User rejected the request"); },`,
  );
  await page.addInitScript(REJECTING_WALLET_SCRIPT);

  await page.goto(`/proposal/${ACTIVE_PROPOSAL_ID}`);
  await connectMockWallet(page);

  await expect(page.getByText(/rejected/i)).toBeVisible();
});
