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

  it("is not offered when the other pools have no power left to cast", async () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction: vi.fn(),
    } as never);
    mockedGetEligiblePools.mockResolvedValue([
      TWO_POOLS[0],
      {...TWO_POOLS[1], remainingVotingPower: "0", hasEntirelyVoted: true},
    ] as never);

    renderWithClient(<VotingPanel proposalId="42" />);
    await waitFor(() => screen.getByText(/0xstakepool1/i));

    // Only one pool can actually still vote, so the shortcut would just
    // duplicate that pool's own controls.
    expect(screen.queryByTestId("vote-all-pools")).not.toBeInTheDocument();
  });

  it("submits one full-power transaction per pool, in order, from a single confirmation", async () => {
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

    const panel = screen.getByTestId("vote-all-pools");
    // Combined power across both pools is surfaced before any click.
    expect(panel).toHaveTextContent("750 APT");

    fireEvent.click(within(panel).getByRole("button", {name: /yes to all/i}));
    fireEvent.click(
      within(panel).getByRole("button", {name: /review vote across all/i}),
    );

    // The review step names every pool, the per-pool entry function and
    // the combined total, before anything is signed.
    const review = screen.getByTestId("vote-all-pools");
    expect(review).toHaveTextContent("0x1::aptos_governance::partial_vote");
    expect(review).toHaveTextContent("0x1::delegation_pool::vote");
    expect(review).toHaveTextContent("750 APT");
    expect(review).toHaveTextContent("#42");
    expect(signAndSubmitTransaction).not.toHaveBeenCalled();

    fireEvent.click(
      within(review).getByRole("button", {name: /confirm and sign/i}),
    );

    await waitFor(() =>
      expect(signAndSubmitTransaction).toHaveBeenCalledTimes(2),
    );

    // Each pool votes its own full remaining power through its own
    // entry function — the chain takes one pool per transaction.
    expect(signAndSubmitTransaction).toHaveBeenNthCalledWith(1, {
      data: {
        function: "0x1::aptos_governance::partial_vote",
        typeArguments: [],
        functionArguments: ["0xstakepool1", "42", "50000000000", true],
      },
    });
    expect(signAndSubmitTransaction).toHaveBeenNthCalledWith(2, {
      data: {
        function: "0x1::delegation_pool::vote",
        typeArguments: [],
        functionArguments: ["0xdelegationpool2", "42", "25000000000", true],
      },
    });

    await waitFor(() =>
      expect(screen.getByTestId("vote-all-pools")).toHaveTextContent(
        "2 of 2 pools voted",
      ),
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
    await waitFor(() => screen.getByTestId("vote-all-pools"));

    const panel = screen.getByTestId("vote-all-pools");
    fireEvent.click(within(panel).getByRole("button", {name: /no to all/i}));
    fireEvent.click(
      within(panel).getByRole("button", {name: /review vote across all/i}),
    );
    fireEvent.click(
      within(screen.getByTestId("vote-all-pools")).getByRole("button", {
        name: /confirm and sign/i,
      }),
    );

    await waitFor(() =>
      expect(signAndSubmitTransaction).toHaveBeenCalledTimes(2),
    );
    for (const call of signAndSubmitTransaction.mock.calls) {
      expect(call[0].data.functionArguments[3]).toBe(false);
    }
  });

  it("stops at the first failure, reports which pools voted, and retries only the rest", async () => {
    const signAndSubmitTransaction = vi
      .fn()
      .mockResolvedValueOnce({hash: "0xhash1"})
      .mockRejectedValueOnce(new Error("User rejected the request"));
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction,
    } as never);
    mockedGetEligiblePools.mockResolvedValue(TWO_POOLS as never);

    renderWithClient(<VotingPanel proposalId="42" />);
    await waitFor(() => screen.getByTestId("vote-all-pools"));

    fireEvent.click(
      within(screen.getByTestId("vote-all-pools")).getByRole("button", {
        name: /yes to all/i,
      }),
    );
    fireEvent.click(
      within(screen.getByTestId("vote-all-pools")).getByRole("button", {
        name: /review vote across all/i,
      }),
    );
    fireEvent.click(
      within(screen.getByTestId("vote-all-pools")).getByRole("button", {
        name: /confirm and sign/i,
      }),
    );

    await waitFor(() =>
      expect(screen.getByText(/user rejected/i)).toBeInTheDocument(),
    );

    // The partial outcome is stated per pool, not as a single opaque
    // "batch failed" — the first pool's vote really is on chain.
    expect(screen.getByTestId("vote-all-pools")).toHaveTextContent(
      "1 of 2 pools voted",
    );
    expect(
      screen.getByTestId("vote-all-status-0xstakepool1"),
    ).toHaveTextContent("Voted");
    expect(
      screen.getByTestId("vote-all-status-0xdelegationpool2"),
    ).toHaveTextContent("Failed");

    // Retrying must re-submit ONLY the pool that did not vote, never
    // the one that already did — a second transaction for pool 1 would
    // double-spend its power.
    signAndSubmitTransaction.mockResolvedValue({hash: "0xhash2"});
    fireEvent.click(
      screen.getByRole("button", {name: /retry remaining 1 pool/i}),
    );

    await waitFor(() =>
      expect(signAndSubmitTransaction).toHaveBeenCalledTimes(3),
    );
    expect(signAndSubmitTransaction).toHaveBeenNthCalledWith(3, {
      data: {
        function: "0x1::delegation_pool::vote",
        typeArguments: [],
        functionArguments: ["0xdelegationpool2", "42", "25000000000", true],
      },
    });

    await waitFor(() =>
      expect(screen.getByTestId("vote-all-pools")).toHaveTextContent(
        "2 of 2 pools voted",
      ),
    );
  });

  it("keeps the run summary visible after every pool has voted", async () => {
    const signAndSubmitTransaction = vi
      .fn()
      .mockResolvedValue({hash: "0xhash"});
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction,
    } as never);
    // First load offers both pools; every load after the run (the
    // completed batch invalidates the eligible-pools query) reports
    // them as entirely voted, which drops the votable count below two.
    // The summary must survive that, or the user never gets to read
    // the outcome of what they just signed.
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
    await waitFor(() => screen.getByTestId("vote-all-pools"));

    fireEvent.click(
      within(screen.getByTestId("vote-all-pools")).getByRole("button", {
        name: /yes to all/i,
      }),
    );
    fireEvent.click(
      within(screen.getByTestId("vote-all-pools")).getByRole("button", {
        name: /review vote across all/i,
      }),
    );
    fireEvent.click(
      within(screen.getByTestId("vote-all-pools")).getByRole("button", {
        name: /confirm and sign/i,
      }),
    );

    await waitFor(() =>
      expect(screen.getByTestId("vote-all-pools")).toHaveTextContent(
        "2 of 2 pools voted",
      ),
    );

    await waitFor(() =>
      expect(
        screen.getAllByText(/already used all its voting power/i).length,
      ).toBeGreaterThan(0),
    );
    expect(screen.getByTestId("vote-all-pools")).toHaveTextContent(
      "2 of 2 pools voted",
    );

    // Dismissing it returns to a clean panel — and with no votable
    // pools left, the shortcut correctly disappears entirely.
    fireEvent.click(screen.getByRole("button", {name: /^done$/i}));
    expect(screen.queryByTestId("vote-all-pools")).not.toBeInTheDocument();
  });
});
