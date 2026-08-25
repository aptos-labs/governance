import {useWallet} from "@aptos-labs/wallet-adapter-react";
import {useQuery} from "@tanstack/react-query";
import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {z} from "zod";
import {HeroDivider} from "~/components/HeroDivider";
import {PaginationBar} from "~/components/PaginationBar";
import {ProposalsTable} from "~/components/ProposalsTable";
import {fetchMyVotes} from "~/lib/governance/fetch-my-votes";
import {listProposals} from "~/lib/governance/fetch-proposals";
import {
  isRateLimitError,
  RATE_LIMIT_MESSAGE,
} from "~/lib/governance/rate-limit";
import type {ProposalStatus} from "~/lib/governance/types";

const STATUS_FILTERS = [
  "all",
  "active",
  "passed",
  "executed",
  "failed",
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const searchSchema = z.object({
  page: z.number().int().min(0).catch(0),
  status: z.enum(STATUS_FILTERS).catch("all"),
});

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  loaderDeps: ({search}) => ({page: search.page}),
  loader: ({deps}) => listProposals({data: {page: deps.page}}),
  component: Home,
});

function matchesFilter(status: ProposalStatus, filter: StatusFilter): boolean {
  return filter === "all" || status === filter;
}

function Home() {
  const initialData = Route.useLoaderData();
  const {page, status} = Route.useSearch();
  const navigate = useNavigate({from: "/"});

  const {data, error, isError} = useQuery({
    queryKey: ["proposals", page],
    queryFn: () => listProposals({data: {page}}),
    initialData,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const filteredItems = data.items.filter((p) =>
    matchesFilter(p.status, status),
  );

  const {connected, account} = useWallet();

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
    <main>
      <div className="grid items-center gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-base font-normal uppercase tracking-wide text-[var(--color-info)]">
            Network
          </p>
          <h1 className="text-5xl font-light tracking-tight sm:text-6xl lg:text-7xl">
            Aptos Governance
          </h1>
        </div>
      </div>
      <HeroDivider />

      <div className="mb-12 grid gap-12 sm:grid-cols-2">
        <p className="font-sans text-lg font-light">
          Welcome to Aptos Governance. Here you can view and vote on the
          proposals. Learn more about Aptos Governance{" "}
          <a
            href="https://aptos.dev/concepts/governance/"
            target="_blank"
            rel="noreferrer noopener"
            className="text-[var(--color-info)] underline"
          >
            here
          </a>
          .
        </p>
        <div>
          <p className="mb-6">
            Aptos Governance is where on chain voting occurs for AIPs (Aptos
            Improvement Proposals). To vote on a proposal, install Petra (Aptos
            Wallet), connect to the wallet and begin voting on any proposal. You
            can vote on multiple proposals. You can view all AIPs here.
          </p>
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("proposals")
                ?.scrollIntoView({behavior: "smooth"})
            }
            className="w-[300px] max-w-full rounded bg-[var(--color-accent)] px-8 py-3 text-[1.1rem] font-normal text-[#121615] hover:brightness-[0.98]"
          >
            View AIPs
          </button>
        </div>
      </div>

      <section id="proposals">
        <h2 className="mb-4 text-3xl font-light">Proposals</h2>

        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filterOption) => (
            <button
              key={filterOption}
              type="button"
              onClick={() =>
                navigate({
                  search: {page: 0, status: filterOption},
                })
              }
              className={`rounded px-3 py-1 text-sm capitalize ${
                status === filterOption
                  ? "bg-[var(--color-text-primary)] text-[var(--color-canvas)]"
                  : "border border-[var(--color-border)] text-[var(--color-text-primary)]"
              }`}
            >
              {filterOption}
            </button>
          ))}
        </div>

        {isError && (
          <div
            role="alert"
            className="mb-4 rounded border border-[var(--color-error)] p-4 text-[var(--color-error)]"
          >
            <p className="font-semibold">
              {isRateLimitError(error) ? "Rate Limited" : "Error"}
            </p>
            <p className="mt-1">
              {isRateLimitError(error) ? RATE_LIMIT_MESSAGE : String(error)}
            </p>
          </div>
        )}

        {filteredItems.length === 0 ? (
          <p className="mt-6 text-[var(--color-text-secondary)]">
            {data.items.length === 0
              ? "No Proposals"
              : `No ${status === "all" ? "" : status + " "}proposals on this page.`}
          </p>
        ) : (
          <ProposalsTable proposals={filteredItems} myVotes={myVotes} />
        )}

        <PaginationBar
          page={page}
          totalCount={data.totalCount}
          pageSize={data.pageSize}
          onPageChange={(nextPage) =>
            navigate({search: {page: nextPage, status}})
          }
        />
      </section>
    </main>
  );
}
