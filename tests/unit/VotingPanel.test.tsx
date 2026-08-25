// tests/unit/VotingPanel.test.tsx
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
import {getEligiblePools} from "~/lib/governance/get-eligible-pools";

vi.mock("@aptos-labs/wallet-adapter-react", async () => {
  const actual = await vi.importActual("@aptos-labs/wallet-adapter-react");
  return {...actual, useWallet: vi.fn()};
});
vi.mock("~/lib/governance/get-eligible-pools");

const mockedUseWallet = vi.mocked(useWallet);
const mockedGetEligiblePools = vi.mocked(getEligiblePools);

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("VotingPanel", () => {
  const signAndSubmitTransaction = vi.fn();

  beforeEach(() => {
    signAndSubmitTransaction.mockReset();
  });

  afterEach(cleanup);

  it("shows a connect-wallet prompt when disconnected", () => {
    mockedUseWallet.mockReturnValue({
      connected: false,
      account: null,
      signAndSubmitTransaction,
    } as never);

    renderWithClient(<VotingPanel proposalId="42" />);
    expect(screen.getByText(/connect a wallet to vote/i)).toBeInTheDocument();
  });

  it("shows 'no voting power' when connected but no eligible pools exist", async () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction,
    } as never);
    mockedGetEligiblePools.mockResolvedValue([]);

    renderWithClient(<VotingPanel proposalId="42" />);
    await waitFor(() =>
      expect(
        screen.getByText(/no voting power found for this address/i),
      ).toBeInTheDocument(),
    );
  });

  it("shows the review step with exact parameters and does NOT sign until confirmed", async () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction,
    } as never);
    mockedGetEligiblePools.mockResolvedValue([
      {
        poolAddress: "0xstakepool1",
        poolKind: "stake_pool",
        remainingVotingPower: "50000000000", // 500 APT in octas, as a string (server-fn wire shape)
        hasEntirelyVoted: false,
      },
    ] as never);

    renderWithClient(<VotingPanel proposalId="42" />);

    await waitFor(() => screen.getByText(/0xstake/i));

    fireEvent.click(screen.getByRole("button", {name: /^yes$/i}));
    fireEvent.click(screen.getByRole("button", {name: /review vote/i}));

    // Review step must show the EXACT transaction parameters before any
    // signing: function, pool, proposal id, amount, direction. Each is
    // asserted individually (not just implied by the final submitted
    // payload) because a review UI that silently omitted one of these
    // would still let this test pass if only the end-state mattered.
    // The amount assertion is scoped to the "Amount:" row specifically
    // (not a bare page-wide text search) because the pool header's
    // "{power} APT available" text also matches a loose /500 APT/
    // search whenever the reviewed amount equals the full remaining
    // power — as it does here, since this test never edits the amount.
    expect(
      screen.getByText("0x1::aptos_governance::partial_vote"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/0xstakepool1/i).length).toBeGreaterThan(0);
    expect(screen.getByText("#42")).toBeInTheDocument();
    const amountRow = screen.getByText(/Amount:/i).closest("div");
    expect(amountRow).toHaveTextContent("500 APT");
    expect(screen.getByText(/yes/i)).toBeInTheDocument();

    // Critically: no signing has happened yet.
    expect(signAndSubmitTransaction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", {name: /confirm and sign/i}));

    await waitFor(() =>
      expect(signAndSubmitTransaction).toHaveBeenCalledWith({
        data: {
          function: "0x1::aptos_governance::partial_vote",
          typeArguments: [],
          functionArguments: ["0xstakepool1", "42", "50000000000", true],
        },
      }),
    );
  });

  it("defaults the amount field to full remaining power, and allows editing it down for a partial vote (design spec §6.4)", async () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction,
    } as never);
    mockedGetEligiblePools.mockResolvedValue([
      {
        poolAddress: "0xstakepool1",
        poolKind: "stake_pool",
        remainingVotingPower: "50000000000", // 500 APT
        hasEntirelyVoted: false,
      },
    ] as never);

    renderWithClient(<VotingPanel proposalId="42" />);
    await waitFor(() => screen.getByText(/0xstake/i));

    const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
    // Defaults to the pool's full remaining power, per §6.4's approved default.
    expect(amountInput.value).toBe("500");

    fireEvent.change(amountInput, {target: {value: "150"}});
    fireEvent.click(screen.getByRole("button", {name: /^yes$/i}));
    fireEvent.click(screen.getByRole("button", {name: /review vote/i}));

    // Review step reflects the edited partial amount, not the full amount.
    // Scoped to the "Amount:" row for the same reason as the test above —
    // this happens to be unambiguous today only because 150 != 500 (the
    // pool's "available" text), which is incidental, not structural.
    const amountRow = screen.getByText(/Amount:/i).closest("div");
    expect(amountRow).toHaveTextContent("150 APT");

    fireEvent.click(screen.getByRole("button", {name: /confirm and sign/i}));

    await waitFor(() =>
      expect(signAndSubmitTransaction).toHaveBeenCalledWith({
        data: {
          function: "0x1::aptos_governance::partial_vote",
          typeArguments: [],
          // 150 APT = 15,000,000,000 octas — confirms the typed partial
          // amount, not the pool's full remaining power, was submitted.
          functionArguments: ["0xstakepool1", "42", "15000000000", true],
        },
      }),
    );
  });

  it("rejects a typed amount above the pool's remaining voting power before allowing review", async () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction,
    } as never);
    mockedGetEligiblePools.mockResolvedValue([
      {
        poolAddress: "0xstakepool1",
        poolKind: "stake_pool",
        remainingVotingPower: "50000000000", // 500 APT
        hasEntirelyVoted: false,
      },
    ] as never);

    renderWithClient(<VotingPanel proposalId="42" />);
    await waitFor(() => screen.getByText(/0xstake/i));

    const amountInput = screen.getByLabelText(/amount/i);
    fireEvent.change(amountInput, {target: {value: "9999"}});
    fireEvent.click(screen.getByRole("button", {name: /^yes$/i}));

    expect(screen.getByRole("button", {name: /review vote/i})).toBeDisabled();
    expect(
      screen.getByText(/exceeds available voting power/i),
    ).toBeInTheDocument();
  });

  it("never carries a reviewed/confirmable vote across a proposalId prop change (round-2 review finding)", async () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction,
    } as never);
    // Same pool address is eligible on both proposals — this is the
    // scenario where a naive per-pool-address-only draft key would
    // leak a frozen review from one proposal into the other.
    mockedGetEligiblePools.mockResolvedValue([
      {
        poolAddress: "0xstakepool1",
        poolKind: "stake_pool",
        remainingVotingPower: "50000000000",
        hasEntirelyVoted: false,
      },
    ] as never);

    const client = new QueryClient({
      defaultOptions: {queries: {retry: false}},
    });
    const {rerender} = render(
      <QueryClientProvider client={client}>
        <VotingPanel proposalId="42" />
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByText(/0xstake/i));
    fireEvent.click(screen.getByRole("button", {name: /^yes$/i}));
    fireEvent.click(screen.getByRole("button", {name: /review vote/i}));
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {name: /confirm and sign/i}),
    ).toBeInTheDocument();

    // Simulate a client-side route transition to a different proposal
    // (e.g. TanStack Router reusing this component instance across a
    // dynamic-segment change) WITHOUT unmounting — this is exactly the
    // scenario the round-2 review flagged. The eligible-pools query is
    // keyed by proposalId, so this immediately re-enters a loading
    // state for the new proposal — there is no render in between where
    // stale pool/review data is shown next to the new proposalId.
    rerender(
      <QueryClientProvider client={client}>
        <VotingPanel proposalId="43" />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/checking your voting power/i)).toBeInTheDocument();
    expect(screen.queryByText("#42")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {name: /confirm and sign/i}),
    ).not.toBeInTheDocument();

    // Once proposal 43's pools load, the SAME pool address starts from
    // a fresh (non-reviewing) draft, not the frozen review carried over
    // from proposal 42 — confirming the draft key is scoped per
    // proposal, not just per pool address.
    await waitFor(() => screen.getByText(/0xstake/i));
    expect(
      screen.getByRole("button", {name: /review vote/i}),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {name: /confirm and sign/i}),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("#42")).not.toBeInTheDocument();

    // Completing a fresh review + confirm now under proposal 43
    // submits "43", never a leftover "42".
    fireEvent.click(screen.getByRole("button", {name: /^yes$/i}));
    fireEvent.click(screen.getByRole("button", {name: /review vote/i}));
    expect(screen.getByText("#43")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: /confirm and sign/i}));

    await waitFor(() =>
      expect(signAndSubmitTransaction).toHaveBeenCalledWith({
        data: {
          function: "0x1::aptos_governance::partial_vote",
          typeArguments: [],
          functionArguments: ["0xstakepool1", "43", "50000000000", true],
        },
      }),
    );
  });

  it("never carries a reviewed/confirmable vote across a connected-account change (round-3 review finding)", async () => {
    // Same pool address is eligible for BOTH accounts — this is the
    // scenario where a draft key omitting the account address would
    // leak a frozen review from wallet A into wallet B.
    mockedGetEligiblePools.mockResolvedValue([
      {
        poolAddress: "0xstakepool1",
        poolKind: "stake_pool",
        remainingVotingPower: "50000000000",
        hasEntirelyVoted: false,
      },
    ] as never);

    const client = new QueryClient({
      defaultOptions: {queries: {retry: false}},
    });

    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xwalletA"},
      signAndSubmitTransaction,
    } as never);
    const {rerender} = render(
      <QueryClientProvider client={client}>
        <VotingPanel proposalId="42" />
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByText(/0xstake/i));
    fireEvent.click(screen.getByRole("button", {name: /^yes$/i}));
    fireEvent.click(screen.getByRole("button", {name: /review vote/i}));
    expect(
      screen.getByRole("button", {name: /confirm and sign/i}),
    ).toBeInTheDocument();

    // Simulate switching connected wallets WITHOUT unmounting this
    // component instance — the eligible-pools query is keyed by the
    // account address, so this immediately re-enters a loading state
    // for wallet B's pools, with no render in between showing wallet
    // A's frozen review next to wallet B's connection.
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xwalletB"},
      signAndSubmitTransaction,
    } as never);
    rerender(
      <QueryClientProvider client={client}>
        <VotingPanel proposalId="42" />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/checking your voting power/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {name: /confirm and sign/i}),
    ).not.toBeInTheDocument();

    // Once wallet B's pools load, the SAME pool address starts from a
    // fresh (non-reviewing) draft, not wallet A's frozen review —
    // confirming the draft key is scoped per connected account, not
    // just per proposal + pool address.
    await waitFor(() => screen.getByText(/0xstake/i));
    expect(
      screen.getByRole("button", {name: /review vote/i}),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {name: /confirm and sign/i}),
    ).not.toBeInTheDocument();
  });

  it("clears a pool's error only for that pool, not for other pools, and re-clears it on a fresh review (round-3 review finding)", async () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction: vi
        .fn()
        .mockRejectedValue(new Error("User rejected the request")),
    } as never);
    mockedGetEligiblePools.mockResolvedValue([
      {
        poolAddress: "0xstakepool1",
        poolKind: "stake_pool",
        remainingVotingPower: "50000000000",
        hasEntirelyVoted: false,
      },
      {
        poolAddress: "0xstakepool2",
        poolKind: "stake_pool",
        remainingVotingPower: "10000000000",
        hasEntirelyVoted: false,
      },
    ] as never);

    renderWithClient(<VotingPanel proposalId="42" />);
    await waitFor(() => screen.getByText(/0xstakepool1/i));

    // Fail pool 1's vote.
    const pool1Card = screen.getByText(/0xstakepool1/i).closest("div")!
      .parentElement!;
    fireEvent.click(within(pool1Card).getByRole("button", {name: /^yes$/i}));
    fireEvent.click(
      within(pool1Card).getByRole("button", {name: /review vote/i}),
    );
    fireEvent.click(
      within(pool1Card).getByRole("button", {name: /confirm and sign/i}),
    );
    await waitFor(() =>
      expect(screen.getByText(/user rejected/i)).toBeInTheDocument(),
    );

    // Pool 2's own UI must never show pool 1's error — errors are
    // scoped per pool/draft, not rendered once for the whole panel.
    const pool2Card = screen.getByText(/0xstakepool2/i).closest("div")!
      .parentElement!;
    expect(
      within(pool2Card).queryByText(/user rejected/i),
    ).not.toBeInTheDocument();

    // Now actually exercise the "re-clears on a fresh review" half of
    // this test's name. After a failed submit, pool 1 is still in its
    // "reviewing" view (Back/Confirm and sign, not Yes/No) — go Back
    // to the not-reviewing view first, still showing the stale error,
    // then start a fresh review and confirm the error is cleared
    // rather than lingering underneath the new review.
    fireEvent.click(within(pool1Card).getByRole("button", {name: /back/i}));
    expect(within(pool1Card).getByText(/user rejected/i)).toBeInTheDocument();

    fireEvent.click(within(pool1Card).getByRole("button", {name: /^yes$/i}));
    fireEvent.click(
      within(pool1Card).getByRole("button", {name: /review vote/i}),
    );
    expect(
      within(pool1Card).queryByText(/user rejected/i),
    ).not.toBeInTheDocument();
  });

  it("shows a specific message when the wallet rejects the transaction", async () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {address: "0xvoter"},
      signAndSubmitTransaction: vi
        .fn()
        .mockRejectedValue(new Error("User rejected the request")),
    } as never);
    mockedGetEligiblePools.mockResolvedValue([
      {
        poolAddress: "0xstakepool1",
        poolKind: "stake_pool",
        remainingVotingPower: "50000000000",
        hasEntirelyVoted: false,
      },
    ] as never);

    renderWithClient(<VotingPanel proposalId="42" />);
    await waitFor(() => screen.getByText(/0xstake/i));

    fireEvent.click(screen.getByRole("button", {name: /^yes$/i}));
    fireEvent.click(screen.getByRole("button", {name: /review vote/i}));
    fireEvent.click(screen.getByRole("button", {name: /confirm and sign/i}));

    await waitFor(() =>
      expect(screen.getByText(/user rejected/i)).toBeInTheDocument(),
    );
  });
});
