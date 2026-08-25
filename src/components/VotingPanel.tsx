// src/components/VotingPanel.tsx

import {useWallet} from "@aptos-labs/wallet-adapter-react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";
import {AddressChip} from "~/components/AddressChip";
import {getAptosClient} from "~/lib/aptos/client";
import {
  buildVoteTransactionPayload,
  type VoteTransactionPayload,
} from "~/lib/governance/build-vote-payload";
import {formatOctasToApt, parseAptToOctas} from "~/lib/governance/format";
import {getEligiblePools} from "~/lib/governance/get-eligible-pools";
import type {EligiblePool} from "~/lib/governance/types";

/**
 * Everything the review step displays AND everything needed to submit,
 * captured atomically in one object the moment "Review vote" is
 * clicked. The review UI reads EVERY field from this object — never
 * from the live `pool`/`proposalId`/`draft.direction` values — so
 * there is no field that could drift between what was reviewed and
 * what gets signed, even if the surrounding props change later (e.g.
 * a client-side route transition from one proposal to another while
 * this component instance is preserved, which TanStack Router — like
 * most React routers — can do for a dynamic-segment route without a
 * full remount).
 */
interface ReviewedVote {
  payload: VoteTransactionPayload;
  poolAddress: string;
  proposalId: string;
  amountOctas: bigint;
  shouldPass: boolean;
}

interface PoolVoteDraft {
  direction: "for" | "against" | null;
  /** Raw typed APT amount (not octas) — parsed with parseAptToOctas on
   *  every render so invalid/excessive input can be caught and shown
   *  inline before "Review vote" is even clickable. Defaults to the
   *  pool's full remaining power per design spec §6.4, editable down
   *  for a partial vote. */
  amountText: string;
  reviewing: boolean;
  reviewed: ReviewedVote | null;
  /** Error from submitting THIS pool's vote — scoped per-draft, not a
   *  single component-wide value, so an error from one
   *  proposal/pool/account can never linger visibly while reviewing or
   *  confirming a different one (round 3 review finding: a
   *  component-global submitError was not cleared on a proposalId
   *  change). */
  submitError: string | null;
}

export function VotingPanel({proposalId}: {proposalId: string}) {
  const {connected, account, signAndSubmitTransaction} = useWallet();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, PoolVoteDraft>>({});

  // Round 3 review finding: the draft key MUST include the connected
  // account address, not just proposalId + pool address. Without it, a
  // reviewed/confirmable draft created while wallet A was connected
  // could still be present (and submittable) after switching to wallet
  // B, if B's eligible pools happen to include the same pool address on
  // the same proposal. Composite-keying on all three makes every draft
  // intrinsically scoped to one (account, proposal, pool) triple.
  const accountAddress = account?.address.toString() ?? null;

  const poolsQuery = useQuery({
    queryKey: ["eligible-pools", accountAddress, proposalId],
    queryFn: async () => {
      const raw = await getEligiblePools({
        data: {voterAddress: accountAddress!, proposalId},
      });
      return raw.map((p) => ({
        ...p,
        remainingVotingPower: BigInt(p.remainingVotingPower),
      })) as EligiblePool[];
    },
    enabled: connected && !!accountAddress,
  });

  const voteMutation = useMutation({
    // Takes only the already-built, already-reviewed payload — no
    // building or clamping happens here, so there is no path by which
    // the submitted transaction can differ from what was reviewed.
    // draftKey, submittedProposalId, and submittedAccountAddress travel
    // alongside it purely so the completion handlers below know which
    // draft to update and which queries to invalidate — none of them
    // play any part in what gets signed.
    mutationFn: async (input: {
      draftKey: string;
      submittedProposalId: string;
      submittedAccountAddress: string;
      payload: VoteTransactionPayload;
    }) => {
      const {hash} = await signAndSubmitTransaction(input.payload);
      await getAptosClient().waitForTransaction({transactionHash: hash});
      return hash;
    },
    onSuccess: (_hash, variables) => {
      // Invalidate using the PROPOSAL/ACCOUNT THE VOTE WAS ACTUALLY
      // SUBMITTED UNDER (round-4 review finding), not the component's
      // current `proposalId`/`accountAddress` closure — those can have
      // already changed (proposal navigation, wallet switch) by the
      // time this async callback runs, which would invalidate the
      // wrong proposal's/account's cached data and leave the vote's
      // real context stale instead.
      queryClient.invalidateQueries({
        queryKey: ["proposal", variables.submittedProposalId],
      });
      queryClient.invalidateQueries({queryKey: ["proposal-votes"]});
      queryClient.invalidateQueries({queryKey: ["proposals"]});
      queryClient.invalidateQueries({
        queryKey: [
          "eligible-pools",
          variables.submittedAccountAddress,
          variables.submittedProposalId,
        ],
      });
      setDrafts((prev) => {
        const next = {...prev};
        delete next[variables.draftKey];
        return next;
      });
    },
    onError: (error, variables) => {
      const message = error instanceof Error ? error.message : String(error);
      setDrafts((prev) => {
        const existing = prev[variables.draftKey];
        if (!existing) return prev;
        return {
          ...prev,
          [variables.draftKey]: {...existing, submitError: message},
        };
      });
    },
  });

  if (!connected || !account) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        Connect a wallet to vote on this proposal.
      </p>
    );
  }

  if (poolsQuery.isLoading) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        Checking your voting power...
      </p>
    );
  }

  if (poolsQuery.isError) {
    return (
      <p role="alert" className="text-sm text-[var(--color-error)]">
        Couldn't check your voting power:{" "}
        {poolsQuery.error instanceof Error
          ? poolsQuery.error.message
          : String(poolsQuery.error)}
      </p>
    );
  }

  const pools = poolsQuery.data ?? [];

  if (pools.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        No voting power found for this address.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {pools.map((pool) => {
        // Composite key: account + proposal + pool. See the comment
        // above accountAddress for why the account must be included —
        // TanStack Router can preserve this component instance across
        // a proposal navigation (motivating the proposalId component),
        // and a wallet switch can happen without a remount too
        // (motivating the account component). Without both, a draft —
        // including a frozen review, an error, or a submit-in-flight
        // state — could survive into a context it was never reviewed
        // or intended for.
        const draftKey = `${accountAddress}:${proposalId}:${pool.poolAddress}`;

        // Default uses maxDecimals=8 (full octa precision), NOT the
        // display default of 2 — formatOctasToApt(x, 2) would round the
        // pre-filled value, and re-parsing that rounded string could
        // silently submit less than the pool's true full power on
        // submit without the user ever touching the field. 8 decimals
        // recovers the exact remainder with no precision loss (see
        // format.ts: maxDecimals=8 takes the whole zero-padded 8-digit
        // remainder, only stripping genuine trailing zeros).
        const draft = drafts[draftKey] ?? {
          direction: null,
          amountText: formatOctasToApt(pool.remainingVotingPower, 8),
          reviewing: false,
          reviewed: null,
          submitError: null,
        };

        const setDraft = (patch: Partial<PoolVoteDraft>) =>
          setDrafts((prev) => ({
            ...prev,
            [draftKey]: {...draft, ...patch},
          }));

        const parsedAmountOctas = parseAptToOctas(draft.amountText);
        const amountExceedsAvailable =
          parsedAmountOctas !== null &&
          parsedAmountOctas > pool.remainingVotingPower;
        const amountIsValid =
          parsedAmountOctas !== null &&
          parsedAmountOctas > 0n &&
          !amountExceedsAvailable;

        if (pool.hasEntirelyVoted) {
          return (
            <div key={pool.poolAddress} className="text-sm">
              <AddressChip address={pool.poolAddress} /> has already used all
              its voting power on this proposal.
            </div>
          );
        }

        return (
          <div
            key={pool.poolAddress}
            data-testid={`vote-pool-${pool.poolAddress}`}
            className="rounded-lg border border-[var(--color-border-light)] p-4"
          >
            <div className="flex items-center justify-between">
              <AddressChip address={pool.poolAddress} />
              <span className="text-xs text-[var(--color-text-secondary)]">
                {formatOctasToApt(pool.remainingVotingPower)} APT available
              </span>
            </div>

            {draft.submitError && (
              <p
                role="alert"
                className="mt-2 text-sm text-[var(--color-error)]"
              >
                {draft.submitError}
              </p>
            )}

            {!draft.reviewing ? (
              <>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft({direction: "for"})}
                    className={`rounded-full px-4 py-1 text-sm ${draft.direction === "for" ? "bg-[var(--color-status-passed-fill)]" : "border border-[var(--color-border)]"}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft({direction: "against"})}
                    className={`rounded-full px-4 py-1 text-sm ${draft.direction === "against" ? "bg-[var(--color-status-failed-fill)]" : "border border-[var(--color-border)]"}`}
                  >
                    No
                  </button>
                </div>

                <label
                  htmlFor={`amount-${pool.poolAddress}`}
                  className="mt-3 block text-xs text-[var(--color-text-secondary)]"
                >
                  Amount (APT)
                </label>
                <input
                  id={`amount-${pool.poolAddress}`}
                  type="text"
                  inputMode="decimal"
                  value={draft.amountText}
                  onChange={(e) => setDraft({amountText: e.target.value})}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] px-3 py-1.5 text-sm"
                />
                {amountExceedsAvailable && (
                  <p className="mt-1 text-xs text-[var(--color-error)]">
                    Amount exceeds available voting power (
                    {formatOctasToApt(pool.remainingVotingPower)} APT max).
                  </p>
                )}

                <button
                  type="button"
                  disabled={!draft.direction || !amountIsValid}
                  onClick={() => {
                    if (parsedAmountOctas === null || !draft.direction) return;
                    // Capture EVERY reviewed field — payload, pool
                    // address, proposal id, amount, direction — from
                    // the exact same local values, in the exact same
                    // instant, as one atomic snapshot. The review step
                    // below reads only from this snapshot, never from
                    // the live `pool`/`proposalId`/`draft.direction`,
                    // so nothing displayed can ever diverge from what
                    // "Confirm and sign" submits.
                    try {
                      const shouldPass = draft.direction === "for";
                      const payload = buildVoteTransactionPayload(
                        pool,
                        proposalId,
                        parsedAmountOctas,
                        shouldPass,
                      );
                      setDraft({
                        reviewing: true,
                        reviewed: {
                          payload,
                          poolAddress: pool.poolAddress,
                          proposalId,
                          amountOctas: parsedAmountOctas,
                          shouldPass,
                        },
                        submitError: null,
                      });
                    } catch (error) {
                      setDraft({
                        submitError:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      });
                    }
                  }}
                  className="mt-3 w-full rounded-full bg-[var(--color-text-primary)] py-2 text-sm font-semibold text-[var(--color-canvas)] disabled:opacity-40"
                >
                  Review vote
                </button>
              </>
            ) : (
              draft.reviewed && (
                <div
                  className="mt-3 rounded-lg p-3 text-sm"
                  style={{backgroundColor: "var(--color-border-light)"}}
                >
                  <dl className="space-y-1">
                    <div>
                      <dt className="inline text-[var(--color-text-secondary)]">
                        Function:{" "}
                      </dt>
                      <dd className="inline font-mono">
                        {draft.reviewed.payload.data.function}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-[var(--color-text-secondary)]">
                        Pool:{" "}
                      </dt>
                      <dd className="inline font-mono">
                        {draft.reviewed.poolAddress}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-[var(--color-text-secondary)]">
                        Proposal:{" "}
                      </dt>
                      <dd className="inline font-mono">
                        #{draft.reviewed.proposalId}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-[var(--color-text-secondary)]">
                        Direction:{" "}
                      </dt>
                      <dd className="inline">
                        {draft.reviewed.shouldPass ? "Yes" : "No"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-[var(--color-text-secondary)]">
                        Amount:{" "}
                      </dt>
                      <dd className="inline">
                        {formatOctasToApt(draft.reviewed.amountOctas, 8)} APT
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({reviewing: false, reviewed: null})
                      }
                      className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-sm"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={voteMutation.isPending}
                      onClick={() => {
                        setDraft({submitError: null});
                        // submittedProposalId/submittedAccountAddress
                        // come from the frozen `draft.reviewed`
                        // snapshot (proposalId) and the draftKey's own
                        // components — never from the live
                        // proposalId/accountAddress closures — so
                        // completion-time cache invalidation targets
                        // the context this vote was actually reviewed
                        // and submitted under, even if the user has
                        // since navigated elsewhere or switched wallets
                        // before the transaction resolves.
                        voteMutation.mutate({
                          draftKey,
                          submittedProposalId: draft.reviewed!.proposalId,
                          submittedAccountAddress: accountAddress!,
                          payload: draft.reviewed!.payload,
                        });
                      }}
                      className="rounded-full bg-[var(--color-text-primary)] px-4 py-1.5 text-sm font-semibold text-[var(--color-canvas)] disabled:opacity-40"
                    >
                      Confirm and sign
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
