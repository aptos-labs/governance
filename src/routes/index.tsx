// src/routes/index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ProposalCard } from "~/components/ProposalCard";
import { listProposals } from "~/lib/governance/fetch-proposals";
import { fetchMyVotes } from "~/lib/governance/fetch-my-votes";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import type { ProposalStatus } from "~/lib/governance/types";

const STATUS_FILTERS = ["all", "active", "passed", "executed", "failed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const searchSchema = z.object({
  page: z.number().int().min(0).catch(0),
  status: z.enum(STATUS_FILTERS).catch("all"),
});

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: ({ deps }) => listProposals({ data: { page: deps.page } }),
  component: Home,
});

function matchesFilter(status: ProposalStatus, filter: StatusFilter): boolean {
  return filter === "all" || status === filter;
}

function Home() {
  const initialData = Route.useLoaderData();
  const { page, status } = Route.useSearch();

  const { data } = useQuery({
    queryKey: ["proposals", page],
    queryFn: () => listProposals({ data: { page } }),
    initialData,
    refetchInterval: 30_000,
  });

  const nowSecs = BigInt(Math.floor(Date.now() / 1000));
  const filteredItems = data.items.filter((p) => matchesFilter(p.status, status));

  const { connected, account } = useWallet();

  const myVotesQuery = useQuery({
    queryKey: ["my-votes", account?.address?.toString(), page],
    queryFn: async () => {
      const proposalIds = data.items.map((p) => p.proposalId);
      if (proposalIds.length === 0) return {};
      return fetchMyVotes({
        data: {
          voterAddress: account!.address.toString(),
          proposalIds,
        },
      });
    },
    enabled: connected && !!account && data.items.length > 0,
    staleTime: 30_000,
  });

  const myVotes = myVotesQuery.data ?? {};

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-serif text-4xl font-semibold">Proposals</h1>

      <div className="mt-4 flex gap-2">
        {STATUS_FILTERS.map((filterOption) => (
          <Link
            key={filterOption}
            to="/"
            search={(prev) => ({ page: prev.page ?? 0, status: filterOption })}
            className={`rounded-full px-3 py-1 text-sm capitalize ${
              status === filterOption
                ? "bg-[var(--color-text-primary)] text-[var(--color-canvas)]"
                : "border border-[var(--color-border)] text-[var(--color-text-primary)]"
            }`}
          >
            {filterOption}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {filteredItems.map((proposal) => (
          <ProposalCard
            key={proposal.proposalId}
            proposal={proposal}
            nowSecs={nowSecs}
            myVote={myVotes[proposal.proposalId]}
          />
        ))}
      </div>
      {filteredItems.length === 0 && (
        <p className="mt-6 text-[var(--color-text-secondary)]">
          {data.items.length === 0
            ? "No proposals found on this page."
            : `No ${status === "all" ? "" : status + " "}proposals on this page.`}
        </p>
      )}

      {data.items.length > 0 && (
        <nav className="mt-8 flex items-center justify-center gap-4 text-sm">
          {page > 0 ? (
            <Link
              to="/"
              search={(prev) => ({ page: page - 1, status: prev.status ?? "all" })}
              className="rounded-full border border-[var(--color-border)] px-3 py-1"
            >
              ← Previous
            </Link>
          ) : (
            <span className="rounded-full border border-[var(--color-border-light)] px-3 py-1 text-[var(--color-text-disabled)]">
              ← Previous
            </span>
          )}
          <span className="text-[var(--color-text-secondary)]">
            Page {page + 1} of {Math.max(1, Math.ceil(data.totalCount / data.pageSize))}
          </span>
          {(page + 1) * data.pageSize < data.totalCount ? (
            <Link
              to="/"
              search={(prev) => ({ page: page + 1, status: prev.status ?? "all" })}
              className="rounded-full border border-[var(--color-border)] px-3 py-1"
            >
              Next →
            </Link>
          ) : (
            <span className="rounded-full border border-[var(--color-border-light)] px-3 py-1 text-[var(--color-text-disabled)]">
              Next →
            </span>
          )}
        </nav>
      )}
    </main>
  );
}
