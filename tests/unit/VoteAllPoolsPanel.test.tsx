// tests/unit/VoteAllPoolsPanel.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {useWallet} from "@aptos-labs/wallet-adapter-react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {VotingPanel} from "~/components/VotingPanel";
import {getAptosClient} from "~/lib/aptos/client";
import {BATCH_VOTE_FUNCTION_ID} from "~/lib/governance/build-batch-vote-payload";
import {getEligiblePools} from "~/lib/governance/get-eligible-pools";

vi.mock("@aptos-labs/wallet-adapter-react", async () => {
  const actual = await vi.importActual("@aptos-labs/wallet-adapter-react");
  return {...actual, useWallet: vi.fn()};
});
vi.mock("~/lib/governance/get-eligible-pools");
vi.mock("~/lib/aptos/client", async () => {
  const actual = await vi.importActual("~/lib/aptos/client");
  return {...actual, getAptosClient: vi.fn()};
});

const mockedUseWallet = vi.mocked(useWallet);
const mockedGetEligiblePools = vi.mocked(getEligiblePools);
const mockedGetAptosClient = vi.mocked(getAptosClient);

const TWO_POOLS = [
  {
    poolAddress: "0xstakepool1",
    poolKind: "stake_pool",
    remainingVotingPower: "50000000000", // 500 APT
    hasEntirelyVoted: false,
  },
  {
    poolAddress: "0xdelegationpool2",
    poolKind: "delegation_pool",
    remainingVotingPower: "25000000000", // 250 APT
    hasEntirelyVoted: false,
  },
];

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

function panel() {
  return screen.getByTestId("vote-all-pools");
}

async function reviewAllPools(direction: RegExp = /yes to all/i) {
  await waitFor(() => screen.getByTestId("vote-all-pools"));
  fireEvent.click(within(panel()).getByRole("button", {name: direction}));
  fireEvent.click(
    within(panel()).getByRole("button", {name: /review vote across all/i}),
  );
}

describe("vote with all voting power across pools", () => {
  const waitForTransaction = vi.fn();

  beforeEach(() => {
    waitForTransaction.mockReset().mockResolvedValue(undefined);
    mockedGetAptosClient.mockReturnValue({waitForTransaction} as never);
  });

  afterEach(cleanup);

  it("is not offered when only one pool is eligible", async () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction: vi.fn(),
    } as never);
    mockedGetEligiblePools.mockResolvedValue([TWO_POOLS[0]] as never);

    renderWithClient(<VotingPanel proposalId="42" />);
    await waitFor(() => screen.getByText(/0xstakepool1/i));

    expect(screen.queryByTestId("vote-all-pools")).not.toBeInTheDocument();
  });

  it("stays visible with several pools even when some have no power left, and batches only the ones that can still vote", async () => {
    const signAndSubmitTransaction = vi
      .fn()
      .mockResolvedValue({hash: "0xhash"});
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction,
    } as never);
    mockedGetEligiblePools.mockResolvedValue([
      TWO_POOLS[0],
      {...TWO_POOLS[1], remainingVotingPower: "0", hasEntirelyVoted: true},
    ] as never);

    renderWithClient(<VotingPanel proposalId="42" />);
    await waitFor(() => screen.getByTestId("vote-all-pools"));

    // Visibility follows the account's pool count, not its remaining
    // power, so the control does not vanish once a pool has voted.
    expect(panel()).toHaveTextContent(/1 of your 2 pools/i);
    expect(panel()).toHaveTextContent(/no voting power left on this proposal/i);

    await reviewAllPools();
    fireEvent.click(
      within(panel()).getByRole("button", {name: /confirm and sign/i}),
    );

    await waitFor(() =>
      expect(signAndSubmitTransaction).toHaveBeenCalledTimes(1),
    );
    // The spent-out pool is left out of the payload entirely rather
    // than sent with a zero amount.
    expect(signAndSubmitTransaction).toHaveBeenCalledWith({
      data: {
        function: BATCH_VOTE_FUNCTION_ID,
        typeArguments: [],
        functionArguments: ["42", "50000000000", true, ["0xstakepool1"], []],
      },
    });
  });

  it("shows a disabled state, not a broken button, when no pool has power left", async () => {
    const signAndSubmitTransaction = vi.fn();
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction,
    } as never);
    mockedGetEligiblePools.mockResolvedValue(
      TWO_POOLS.map((pool) => ({
        ...pool,
        remainingVotingPower: "0",
        hasEntirelyVoted: true,
      })) as never,
    );

    renderWithClient(<VotingPanel proposalId="42" />);
    await waitFor(() => screen.getByTestId("vote-all-pools"));

    expect(panel()).toHaveTextContent(
      /none of your 2 pools has voting power left/i,
    );
    expect(
      within(panel()).getByRole("button", {name: /yes to all/i}),
    ).toBeDisabled();
    expect(
      within(panel()).getByRole("button", {name: /no voting power left/i}),
    ).toBeDisabled();
    expect(signAndSubmitTransaction).not.toHaveBeenCalled();
  });

  it("casts every pool's full power in ONE transaction through the batch contract", async () => {
    const signAndSubmitTransaction = vi
      .fn()
      .mockResolvedValue({hash: "0xhash"});
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction,
    } as never);
    mockedGetEligiblePools.mockResolvedValue(TWO_POOLS as never);

    renderWithClient(<VotingPanel proposalId="42" />);
    await waitFor(() => screen.getByTestId("vote-all-pools"));

    // Combined power across both pools is surfaced before any click.
    expect(panel()).toHaveTextContent("750 APT");

    await reviewAllPools();

    // The review step names the contract being called, the combined
    // total and every pool, before anything is signed.
    expect(panel()).toHaveTextContent(BATCH_VOTE_FUNCTION_ID);
    expect(panel()).toHaveTextContent("750 APT");
    expect(panel()).toHaveTextContent("#42");
    expect(signAndSubmitTransaction).not.toHaveBeenCalled();

    fireEvent.click(
      within(panel()).getByRole("button", {name: /confirm and sign/i}),
    );

    await waitFor(() =>
      expect(signAndSubmitTransaction).toHaveBeenCalledTimes(1),
    );

    // One transaction, carrying the proposal id, the combined budget,
    // the direction, and the pools split into the module's two
    // address vectors.
    expect(signAndSubmitTransaction).toHaveBeenCalledWith({
      data: {
        function: BATCH_VOTE_FUNCTION_ID,
        typeArguments: [],
        functionArguments: [
          "42",
          "75000000000",
          true,
          ["0xstakepool1"],
          ["0xdelegationpool2"],
        ],
      },
    });

    await waitFor(() =>
      expect(panel()).toHaveTextContent(/cast across 2 pools in one/i),
    );
  });

  it("submits 'No' for every pool when the No option is chosen", async () => {
    const signAndSubmitTransaction = vi
      .fn()
      .mockResolvedValue({hash: "0xhash"});
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction,
    } as never);
    mockedGetEligiblePools.mockResolvedValue(TWO_POOLS as never);

    renderWithClient(<VotingPanel proposalId="42" />);
    await reviewAllPools(/no to all/i);
    fireEvent.click(
      within(panel()).getByRole("button", {name: /confirm and sign/i}),
    );

    await waitFor(() =>
      expect(signAndSubmitTransaction).toHaveBeenCalledTimes(1),
    );
    expect(
      signAndSubmitTransaction.mock.calls[0][0].data.functionArguments[2],
    ).toBe(false);
  });

  it("surfaces a rejected signature without claiming any vote was cast", async () => {
    const signAndSubmitTransaction = vi
      .fn()
      .mockRejectedValue(new Error("User rejected the request"));
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction,
    } as never);
    mockedGetEligiblePools.mockResolvedValue(TWO_POOLS as never);

    renderWithClient(<VotingPanel proposalId="42" />);
    await reviewAllPools();
    fireEvent.click(
      within(panel()).getByRole("button", {name: /confirm and sign/i}),
    );

    await waitFor(() =>
      expect(screen.getByText(/user rejected/i)).toBeInTheDocument(),
    );
    expect(panel()).not.toHaveTextContent(/cast across/i);

    // Still on the review step, so the same vote can be retried with
    // one click rather than rebuilt from scratch.
    expect(
      within(panel()).getByRole("button", {name: /confirm and sign/i}),
    ).toBeInTheDocument();
  });

  it("keeps the confirmation visible after every pool has voted", async () => {
    const signAndSubmitTransaction = vi
      .fn()
      .mockResolvedValue({hash: "0xhash"});
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction,
    } as never);
    // First load offers both pools; every load after the vote (the
    // completed transaction invalidates the eligible-pools query)
    // reports them as entirely voted, which drops the votable count
    // below two. The confirmation must survive that, or the user never
    // gets to read the outcome of what they just signed.
    mockedGetEligiblePools
      .mockResolvedValueOnce(TWO_POOLS as never)
      .mockResolvedValue(
        TWO_POOLS.map((pool) => ({
          ...pool,
          remainingVotingPower: "0",
          hasEntirelyVoted: true,
        })) as never,
      );

    renderWithClient(<VotingPanel proposalId="42" />);
    await reviewAllPools();
    fireEvent.click(
      within(panel()).getByRole("button", {name: /confirm and sign/i}),
    );

    await waitFor(() =>
      expect(panel()).toHaveTextContent(/cast across 2 pools in one/i),
    );
    await waitFor(() =>
      expect(
        screen.getAllByText(/already used all its voting power/i).length,
      ).toBeGreaterThan(0),
    );
    expect(panel()).toHaveTextContent(/cast across 2 pools in one/i);

    // Dismissing returns to the panel's resting state. It stays on
    // screen (the account still has two pools) but has nothing left
    // to cast, so it says so rather than offering a dead button.
    fireEvent.click(screen.getByRole("button", {name: /^done$/i}));
    expect(panel()).toHaveTextContent(
      /none of your 2 pools has voting power left/i,
    );
  });
});
