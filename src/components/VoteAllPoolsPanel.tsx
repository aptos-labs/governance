// src/components/VoteAllPoolsPanel.tsx

import {useWallet} from "@aptos-labs/wallet-adapter-react";
import {useQueryClient} from "@tanstack/react-query";
import {useState} from "react";
import {AddressChip} from "~/components/AddressChip";
import {getAptosClient} from "~/lib/aptos/client";
import {
  BATCH_VOTE_FUNCTION_ID,
  buildBatchVoteTransactionPayload,
} from "~/lib/governance/build-batch-vote-payload";
import type {VoteTransactionPayload} from "~/lib/governance/build-vote-payload";
import {formatOctasToApt} from "~/lib/governance/format";
import type {EligiblePool} from "~/lib/governance/types";

/**
 * The frozen snapshot of everything the review step shows AND
 * everything that gets signed, captured in one instant when "Review
 * vote" is clicked — the same discipline the per-pool flow in
 * VotingPanel uses, for the same reason: the review UI reads only from
 * this object, never from the live `pools`/`proposalId`/`direction`
 * values, so nothing displayed can drift from what is submitted if the
 * surrounding props change mid-flow (a background pool refetch, a
 * client-side proposal navigation).
 */
interface ReviewedBatch {
  payload: VoteTransactionPayload;
  proposalId: string;
  shouldPass: boolean;
  totalOctas: bigint;
  pools: Array<{poolAddress: string; amountOctas: bigint}>;
}

export function VoteAllPoolsPanel({
  pools,
  proposalId,
  accountAddress,
}: {
  /** EVERY pool this address can vote through on this proposal,
   *  including ones with nothing left to cast. The panel needs the
   *  full list because its visibility is decided by how many pools
   *  the account has, while what it submits is decided by how much
   *  power those pools have left — two different questions. */
  pools: EligiblePool[];
  proposalId: string;
  accountAddress: string;
}) {
  const {signAndSubmitTransaction} = useWallet();
  const queryClient = useQueryClient();

  const [direction, setDirection] = useState<"for" | "against" | null>(null);
  const [reviewed, setReviewed] = useState<ReviewedBatch | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [votedBatch, setVotedBatch] = useState<ReviewedBatch | null>(null);

  // Shown whenever the account has more than one pool, whether or not
  // those pools still have power to cast. Deliberately NOT gated on
  // remaining power: a multi-pool voter who sees this control on one
  // proposal should see it on every proposal, rather than having it
  // vanish once some or all of their pools have voted and be left
  // wondering where it went. With nothing left to cast it renders in
  // a disabled state that says so. `votedBatch` keeps a completed
  // run's confirmation on screen even if the pool list itself shrinks
  // underneath it.
  if (pools.length < 2 && !votedBatch) {
    return null;
  }

  // What the batch can actually act on. A pool with no power left is
  // skipped rather than sent: buildBatchVoteTransactionPayload rejects
  // a zero amount, and the contract would skip it on chain anyway.
  const votablePools = pools.filter(
    (pool) => !pool.hasEntirelyVoted && pool.remainingVotingPower > 0n,
  );
  const hasVotablePower = votablePools.length > 0;

  const totalOctas = votablePools.reduce(
    (sum, pool) => sum + pool.remainingVotingPower,
    0n,
  );

  async function submitBatch(batch: ReviewedBatch) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const {hash} = await signAndSubmitTransaction(batch.payload);
      await getAptosClient().waitForTransaction({transactionHash: hash});
      setVotedBatch(batch);
      setReviewed(null);
      // Invalidate against the proposal/account this vote was actually
      // submitted under (taken from the frozen snapshot and the props
      // this keyed instance was mounted with), never a live value that
      // could have moved on while the transaction was in flight.
      queryClient.invalidateQueries({
        queryKey: ["proposal", batch.proposalId],
      });
      queryClient.invalidateQueries({queryKey: ["proposal-votes"]});
      queryClient.invalidateQueries({queryKey: ["proposals"]});
      queryClient.invalidateQueries({
        queryKey: ["eligible-pools", accountAddress, batch.proposalId],
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (votedBatch) {
    return (
      <section
        data-testid="vote-all-pools"
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-4"
      >
        <h3 className="text-sm font-semibold">
          Voted {votedBatch.shouldPass ? "Yes" : "No"} with all voting power
        </h3>
        <p aria-live="polite" className="mt-1 text-xs">
          {formatOctasToApt(votedBatch.totalOctas, 8)} APT cast across{" "}
          {votedBatch.pools.length} pools in one transaction.
        </p>
        <button
          type="button"
          onClick={() => {
            setVotedBatch(null);
            setDirection(null);
            setSubmitError(null);
          }}
          className="mt-3 rounded-full border border-[var(--color-border)] px-4 py-1.5 text-sm"
        >
          Done
        </button>
      </section>
    );
  }

  if (reviewed) {
    return (
      <section
        data-testid="vote-all-pools"
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-4"
      >
        <h3 className="text-sm font-semibold">
          Review: {reviewed.shouldPass ? "Yes" : "No"} with all voting power
        </h3>
        <dl className="mt-2 space-y-1 text-sm">
          <div>
            <dt className="inline text-[var(--color-text-secondary)]">
              Function:{" "}
            </dt>
            <dd className="mt-0.5 break-all font-mono text-xs">
              {reviewed.payload.data.function}
            </dd>
          </div>
          <div>
            <dt className="inline text-[var(--color-text-secondary)]">
              Proposal:{" "}
            </dt>
            <dd className="inline font-mono">#{reviewed.proposalId}</dd>
          </div>
          <div>
            <dt className="inline text-[var(--color-text-secondary)]">
              Direction:{" "}
            </dt>
            <dd className="inline">{reviewed.shouldPass ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="inline text-[var(--color-text-secondary)]">
              Total amount:{" "}
            </dt>
            <dd className="inline">
              {formatOctasToApt(reviewed.totalOctas, 8)} APT
            </dd>
          </div>
        </dl>

        <ul className="mt-3 space-y-1.5">
          {reviewed.pools.map((pool) => (
            <li
              key={pool.poolAddress}
              className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs"
            >
              <AddressChip address={pool.poolAddress} />
              <span className="min-w-0 break-all text-[var(--color-text-secondary)]">
                {formatOctasToApt(pool.amountOctas, 8)} APT
              </span>
            </li>
          ))}
        </ul>

        {submitError && (
          <p role="alert" className="mt-3 text-sm text-[var(--color-error)]">
            {submitError}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => setReviewed(null)}
            className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-sm disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submitBatch(reviewed)}
            className="rounded-full bg-[var(--color-text-primary)] px-4 py-1.5 text-sm font-semibold text-[var(--color-canvas)] disabled:opacity-40"
          >
            {submitting ? "Confirming..." : "Confirm and sign"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      data-testid="vote-all-pools"
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-4"
    >
      <h3 className="text-sm font-semibold">Vote with all voting power</h3>
      {hasVotablePower ? (
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          Cast the full {formatOctasToApt(totalOctas)} APT available across{" "}
          {votablePools.length}
          {votablePools.length === pools.length
            ? ` of your pools`
            : ` of your ${pools.length} pools`}{" "}
          in a single transaction — one signature, not one per pool.
          {votablePools.length === pools.length
            ? ""
            : " The rest have no voting power left on this proposal."}
        </p>
      ) : (
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
          None of your {pools.length} pools has voting power left on this
          proposal.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!hasVotablePower}
          onClick={() => setDirection("for")}
          style={
            direction === "for"
              ? {
                  backgroundColor: "var(--color-status-passed-fill)",
                  color: "var(--color-status-passed-text)",
                }
              : undefined
          }
          aria-pressed={direction === "for"}
          className={`rounded-full px-4 py-1 text-sm disabled:opacity-40 ${direction === "for" ? "" : "border border-[var(--color-border)]"}`}
        >
          Yes to all
        </button>
        <button
          type="button"
          disabled={!hasVotablePower}
          onClick={() => setDirection("against")}
          style={
            direction === "against"
              ? {
                  backgroundColor: "var(--color-status-failed-fill)",
                  color: "var(--color-status-failed-text)",
                }
              : undefined
          }
          aria-pressed={direction === "against"}
          className={`rounded-full px-4 py-1 text-sm disabled:opacity-40 ${direction === "against" ? "" : "border border-[var(--color-border)]"}`}
        >
          No to all
        </button>
      </div>

      {submitError && (
        <p role="alert" className="mt-3 text-sm text-[var(--color-error)]">
          {submitError}
        </p>
      )}

      <button
        type="button"
        disabled={!direction || !hasVotablePower}
        onClick={() => {
          if (!direction || !hasVotablePower) return;
          try {
            const shouldPass = direction === "for";
            const payload = buildBatchVoteTransactionPayload(
              votablePools,
              proposalId,
              totalOctas,
              shouldPass,
            );
            setReviewed({
              payload,
              proposalId,
              shouldPass,
              totalOctas,
              // Per-pool amounts are shown for review only. Each pool
              // casts its own full remaining power here because the
              // budget is the exact sum of all of them, so the
              // contract's greedy fill gives every pool its whole
              // share before the budget runs out.
              pools: votablePools.map((pool) => ({
                poolAddress: pool.poolAddress,
                amountOctas: pool.remainingVotingPower,
              })),
            });
            setSubmitError(null);
          } catch (error) {
            setSubmitError(
              error instanceof Error ? error.message : String(error),
            );
          }
        }}
        className="mt-3 w-full rounded-full bg-[var(--color-text-primary)] py-2 text-sm font-semibold text-[var(--color-canvas)] disabled:opacity-40"
      >
        {hasVotablePower
          ? `Review vote across all ${votablePools.length} pools`
          : "No voting power left"}
      </button>

      <p className="mt-2 break-all font-mono text-[10px] text-[var(--color-text-secondary)]">
        via {BATCH_VOTE_FUNCTION_ID}
      </p>
    </section>
  );
}
