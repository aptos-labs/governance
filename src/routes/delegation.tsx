// src/routes/delegation.tsx

import {useWallet} from "@aptos-labs/wallet-adapter-react";
import {useQuery} from "@tanstack/react-query";
import {createFileRoute, Link} from "@tanstack/react-router";
import {formatOctasToApt, truncateAddress} from "~/lib/governance/format";
import {getMyDelegation} from "~/lib/governance/get-my-delegation";

export const Route = createFileRoute("/delegation")({
  component: MyDelegation,
});

function MyDelegation() {
  const {connected, account} = useWallet();

  const query = useQuery({
    queryKey: ["my-delegation", account?.address],
    queryFn: () =>
      getMyDelegation({data: {voterAddress: account!.address.toString()}}),
    enabled: connected && !!account,
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-serif text-4xl font-semibold">My Delegation</h1>

      {!connected && (
        <p className="mt-4 text-[var(--color-text-secondary)]">
          Connect a wallet to see the pools you control.
        </p>
      )}

      {connected && query.isLoading && (
        <p className="mt-4 text-[var(--color-text-secondary)]">Loading...</p>
      )}

      {connected && query.data && query.data.pools.length === 0 && (
        <p className="mt-4 text-[var(--color-text-secondary)]">
          No pools found for this address.
        </p>
      )}

      {connected && query.data && query.data.pools.length > 0 && (
        <div className="mt-6 space-y-6">
          {query.data.pools.map((pool) => (
            <div
              key={pool.poolAddress}
              className="rounded-xl border border-[var(--color-border-light)] p-5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">
                  {truncateAddress(pool.poolAddress)}
                </span>
                <span className="text-xs uppercase text-[var(--color-text-secondary)]">
                  {pool.poolKind === "stake_pool"
                    ? "Stake pool"
                    : "Delegation pool"}
                </span>
              </div>
              <p className="mt-1 text-sm">
                {formatOctasToApt(BigInt(pool.votingPower))} APT voting power
              </p>

              {pool.history.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm">
                  {pool.history.map((h) => (
                    <li key={h.proposalId}>
                      <Link
                        to="/proposal/$proposalId"
                        params={{proposalId: h.proposalId}}
                        className="underline"
                      >
                        Proposal #{h.proposalId}
                      </Link>
                      : voted {h.shouldPass ? "Yes" : "No"} with{" "}
                      {formatOctasToApt(BigInt(h.numVotes))} APT
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                  No vote history found for this pool yet.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
