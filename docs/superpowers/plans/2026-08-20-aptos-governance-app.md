# Aptos Gov Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mainnet-only Aptos governance web app (TanStack Start) that lists proposals, verifies their off-chain metadata, and lets a connected AIP-62 wallet (Petra extension / Petra Web primary) vote with delegated stake — both traditional stake pools and delegation pools.

**Architecture:** Hybrid SSR + direct chain reads. TanStack Start server-loads proposal list/detail data from the Aptos fullnode REST API and the hosted Indexer GraphQL API; all AIP-62 wallet discovery, connection, and transaction signing/submission happen in a client-only boundary. TanStack Query hydrates from server loaders and owns cache invalidation after a vote is submitted.

**Tech Stack:** TanStack Start (`@tanstack/react-start` + `@tanstack/react-router`, React 19, Vite 8), `@aptos-labs/ts-sdk`, `@aptos-labs/wallet-adapter-react`, `@tanstack/react-query`, Tailwind CSS v4, Vitest, Playwright, pnpm.

## Global Constraints

- Mainnet only. No network switcher in the shipped UI (per design spec §3/§9).
- All on-chain integers (`u64`/`u128`, stake, voting power, timestamps, proposal ids) are `bigint` or `string` end-to-end — never coerce to JS `number` for values that can exceed 2^53.
- Off-chain proposal metadata is only trusted after its `sha3-256` hash matches the on-chain `metadata_hash` — an unverified proposal must show an explicit "unverified" state, never silently render.
- No private key ever touches this app, client or server. Voting is wallet-signed only, using the standard/JSON transaction input shape (`{ data: { function, typeArguments, functionArguments } }`), not raw BCS, for maximum wallet compatibility.
- Every transaction shows its exact parameters (function, pool, proposal id, direction, amount) before wallet approval — no blind-signing.
- Colors and typography come only from `.claude/skills/aptos-design-system/references/tokens.json` — no new hex codes invented; any new pairing is run through `.claude/skills/aptos-design-system/scripts/check_contrast.py` before use.
- Package manager is pnpm. Node `>=22` (required by `@aptos-labs/ts-sdk` 7.x).
- Petra extension and Petra Web are featured first in wallet UI, but every AIP-62-registered wallet must remain connectable — no wallet-specific integration code that would exclude others.
- Proposal status has exactly four real states, matching the on-chain framework (no invented "pending"/"expired" states): **active** (voting open), **passed** (voting closed, succeeded, `is_resolved == false`), **executed** (`is_resolved == true`), **failed** (voting closed, did not meet threshold). Voting opens immediately at proposal creation — there is no "not yet started" state.
- Never name a file `*.server.*` (e.g. `foo.server.ts`) even for a module built around `createServerFn`. TanStack Start's Vite plugin reserves the `**/*.server.*` glob to mean "never importable from client code" (its import-protection plugin denies it by default) — the opposite of what a `createServerFn` result actually is (safe, intentional, isomorphic to import from a route/component). This was discovered the hard way: Tasks 9/10's server-fn files were originally named `fetch-proposals.server.ts`/`fetch-proposal.server.ts` and the production build failed with an import-protection error the moment a client route (Task 12's `index.tsx`) imported them — `pnpm typecheck` and `pnpm test` both passed, only `pnpm build` catches this. Fixed by dropping `.server` from those filenames entirely (they're plain `.ts` files whose only defining trait is exporting a `createServerFn` result) and renamed Task 16/17's wrapper files to `get-eligible-pools.ts`/`get-my-delegation.ts` for the same reason, before either was ever implemented.

## File Structure

```
aptos-governance/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts                        # separate from vite.config.ts — see Task 1 Step 4
├── playwright.config.ts
├── netlify.toml
├── .env.example
├── src/
│   ├── router.tsx                          # getRouter() instance — name required by TanStack Start's server handler
│   ├── styles/
│   │   └── app.css                         # Tailwind entry + design-system CSS vars
│   ├── routes/
│   │   ├── __root.tsx                      # full HTML document shell + wallet provider + header
│   │   ├── index.tsx                       # "/" — proposal list route + status filter chips
│   │   ├── proposal.$proposalId.tsx        # "/proposal/:id" — detail + voting route
│   │   └── delegation.tsx                  # "/delegation" — my pools route
│   ├── lib/
│   │   ├── aptos/
│   │   │   └── client.ts                   # Aptos SDK singleton (server-safe), env-overridable fullnode URL
│   │   ├── governance/
│   │   │   ├── types.ts                       # shared types (RawProposal, ProposalStatus, EligiblePool, ...)
│   │   │   ├── status.ts                      # deriveProposalStatus() / isVotingClosed() — pure, TDD
│   │   │   ├── metadata.ts                    # verifyProposalMetadata() + fetchAndVerifyProposalMetadata() — TDD
│   │   │   ├── format.ts                      # formatOctasToApt/parseAptToOctas/truncateAddress/... — pure, TDD
│   │   │   ├── parse-raw-proposal.ts          # decodeMetadataLocation/parseRawProposalCore/buildProposalListItem — TDD
│   │   │   ├── build-vote-payload.ts          # buildVoteTransactionPayload() — pure, TDD
│   │   │   ├── indexer-client.ts              # GraphQL fetch helper, env-overridable indexer URL
│   │   │   ├── fetch-proposal-votes.ts        # proposal_votes query
│   │   │   ├── fetch-eligible-pools.ts        # current_staking_pool_voter + current_delegated_voter + fullnode cross-check
│   │   │   ├── get-eligible-pools.ts # createServerFn wrapper around the above, for VotingPanel
│   │   │   ├── fetch-my-pools.ts              # findMyPools() + fetchVoteHistoryForPool() — TDD
│   │   │   ├── get-my-delegation.ts       # createServerFn: getMyDelegation
│   │   │   ├── fetch-proposals.ts      # createServerFn: list proposals
│   │   │   └── fetch-proposal.ts       # createServerFn: one proposal + verified metadata + votes
│   │   └── wallet/
│   │       └── provider.tsx                # client-only AptosWalletAdapterProvider wrapper (ClientOnly-gated)
│   └── components/
│       ├── StatusBadge.tsx
│       ├── VoteBar.tsx
│       ├── ProposalCard.tsx
│       ├── MetadataVerifiedNotice.tsx
│       ├── WalletConnectButton.tsx
│       └── VotingPanel.tsx
├── tests/
│   ├── unit/
│   │   ├── status.test.ts
│   │   ├── metadata.test.ts
│   │   ├── format.test.ts
│   │   ├── indexer-client.test.ts
│   │   ├── fetch-eligible-pools.test.ts
│   │   ├── parse-raw-proposal.test.ts
│   │   ├── StatusBadge.test.tsx
│   │   ├── VoteBar.test.tsx
│   │   ├── ProposalCard.test.tsx
│   │   ├── MetadataVerifiedNotice.test.tsx
│   │   ├── WalletConnectButton.test.tsx
│   │   ├── build-vote-payload.test.ts
│   │   ├── VotingPanel.test.tsx
│   │   └── fetch-my-pools.test.ts
│   └── e2e/
│       ├── fixtures/
│       │   ├── mock-wallet.ts              # spec-compliant AIP-62 mock wallet, injected via addInitScript
│       │   └── mock-fullnode-server.ts     # local HTTP server mimicking fullnode + indexer responses
│       └── vote-flow.spec.ts
└── .claude/skills/aptos-design-system/   # already committed; referenced, not modified by this plan
```

This tree reflects the end state after all 19 tasks — files appear in the task where they're first created; several (`format.ts`, `fetch-proposal-votes.ts`'s exported constant) are extended by later tasks rather than recreated.

---

### Task 1: Scaffold the TanStack Start project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/styles/app.css`
- Create: `src/routes/__root.tsx`
- Create: `src/routes/index.tsx`
- Create: `src/router.tsx`

**Interfaces:**
- Produces: a running `pnpm dev` server at `http://localhost:3000` rendering "Aptos Gov" on `/`, and a working `pnpm build`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "aptos-governance-app",
  "private": true,
  "type": "module",
  "sideEffects": false,
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "dev": "vite dev",
    "build": "vite build && tsc --noEmit",
    "preview": "vite preview",
    "start": "node .output/server/index.mjs",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit",
    "check-contrast": "python3 .claude/skills/aptos-design-system/scripts/check_contrast.py"
  },
  "dependencies": {
    "@aptos-labs/ts-sdk": "^7.3.0",
    "@aptos-labs/wallet-adapter-react": "^8.3.3",
    "@tanstack/react-query": "^5.101.4",
    "@tanstack/react-router": "^1.170.31",
    "@tanstack/react-start": "^1.168.48",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.62.1",
    "@tailwindcss/vite": "^4.3.3",
    "@types/node": "^22.5.4",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "@vitejs/plugin-react": "^6.0.1",
    "nitro": "^3.0.260311-beta",
    "tailwindcss": "^4.3.3",
    "typescript": "^5.7.2",
    "vite": "^8.0.14",
    "vitest": "^3.2.4"
  },
  "packageManager": "pnpm@10.33.2"
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["./src/*"]
    }
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

Vite does not read `tsconfig.json`'s `paths` natively, so the `~/*` alias used by every file from Task 2 onward (`~/lib/...`) must be declared explicitly here via `resolve.alias` — without it, both `pnpm dev` and `pnpm vitest` fail to resolve those imports.

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "~": path.resolve(rootDir, "src"),
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
    }),
    viteReact(),
    nitro(),
  ],
});
```

- [ ] **Step 4: Create `vitest.config.ts`**

A separate config (rather than reusing `vite.config.ts`'s `test` field) avoids pulling the `tanstackStart()` and `nitro()` plugins into the unit-test runner, which only needs the path alias and a Node environment.

```ts
// vitest.config.ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(rootDir, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Create `src/styles/app.css`**

This imports Tailwind and defines the app's CSS custom properties directly from the verified `aptos-design-system` tokens (`.claude/skills/aptos-design-system/references/tokens.json`) — no invented values.

```css
@import "tailwindcss";

@theme {
  --font-serif: "IBM Plex Serif", Georgia, "Times New Roman", Times, serif;
  --font-sans: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
}

:root {
  color-scheme: light;

  --color-canvas: #f9f9f0;
  --color-paper: #ffffff;
  --color-text-primary: #171612;
  --color-text-secondary: #2f2d28;
  --color-text-disabled: #6a6252;
  --color-border: #c5cad4;
  --color-border-light: #d9dde5;

  --color-info: #34648f;
  --color-success: #256b2e;
  --color-error: #b84722;
  --color-warning: #9d5a16;

  --color-status-active-fill: #badbee;
  --color-status-passed-fill: #daf6d4;
  --color-status-executed-fill: #2f2d28;
  --color-status-executed-text: #f9f9f0;
  --color-status-failed-fill: #fe805c;
}

:root[data-theme="dark"] {
  color-scheme: dark;

  --color-canvas: #0f0e0b;
  --color-paper: #171612;
  --color-text-primary: #f9f9f0;
  --color-text-secondary: #efecca;
  --color-text-disabled: #8c8680;
  --color-border: #21201c;
  --color-border-light: #2f2d28;

  --color-info: #badbee;
  --color-success: #daf6d4;
  --color-error: #fe805c;
  --color-warning: #fe805c;

  --color-status-active-fill: #badbee;
  --color-status-passed-fill: #daf6d4;
  --color-status-executed-fill: #2f2d28;
  --color-status-executed-text: #f9f9f0;
  --color-status-failed-fill: #fe805c;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --color-canvas: #0f0e0b;
    --color-paper: #171612;
    --color-text-primary: #f9f9f0;
    --color-text-secondary: #efecca;
    --color-text-disabled: #8c8680;
    --color-border: #21201c;
    --color-border-light: #2f2d28;
    --color-info: #badbee;
    --color-success: #daf6d4;
    --color-error: #fe805c;
    --color-warning: #fe805c;
  }
}

body {
  background-color: var(--color-canvas);
  color: var(--color-text-primary);
  font-family: var(--font-sans);
}
```

- [ ] **Step 6: Create `src/routes/__root.tsx`**

```tsx
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Aptos Gov" },
      {
        name: "description",
        content: "Delegated governance voting for the Aptos network.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Create `src/routes/index.tsx`** (placeholder — replaced with real content in Task 12)

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-serif text-4xl font-semibold">Aptos Gov</h1>
      <p className="mt-2 text-[var(--color-text-secondary)]">
        Delegated governance voting for the Aptos network.
      </p>
    </main>
  );
}
```

- [ ] **Step 8: Create `src/router.tsx`**

The exported function MUST be named `getRouter` — TanStack Start's server handler resolves the router entry by calling `entries.routerEntry.getRouter()` (confirmed both from the live official `start-basic` example and by reproducing the failure: naming it `createRouter` instead produces `TypeError: entries.routerEntry.getRouter is not a function` at request time, not at build time — `pnpm build` succeeds either way, so this only surfaces once you actually load a page).

This also wires a `QueryClient` into the router via `@tanstack/react-router-ssr-query`'s `setupRouterSsrQueryIntegration` — without this, any component calling `useQuery`/`useQueryClient` (starting with Task 12's `/` route) throws `No QueryClient set, use QueryClientProvider to set one` the moment it actually renders. `pnpm build` and `pnpm typecheck` cannot catch this (it's a runtime provider lookup, not a type error), so it only surfaces once a real page loads — confirmed by reproducing the exact error against a live dev server. `setupRouterSsrQueryIntegration` patches `router.options.Wrap` to render a `QueryClientProvider` around the whole tree automatically; no manual provider is needed in `__root.tsx` (confirmed against the official `start-basic-react-query` example, whose `__root.tsx` has none).

```bash
pnpm add @tanstack/react-router-ssr-query
```

```tsx
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";

/**
 * Wires a single QueryClient into both the router's context (so route
 * loaders can dehydrate/prefetch through it) and the client component
 * tree (so useQuery/useQueryClient calls in components have a provider
 * to read from).
 */
export function getRouter() {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({ router, queryClient });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
```

- [ ] **Step 9: Install dependencies and verify the dev server boots**

Run: `pnpm install`
Expected: install completes with no errors (`routeTree.gen.ts` is generated automatically by the TanStack Start Vite plugin on first run — do not hand-write it).

Run: `pnpm dev`
Expected: server starts on `http://localhost:3000`; visiting it in a browser (or `curl -s http://localhost:3000 | grep "Aptos Gov"`) shows the "Aptos Gov" heading.

- [ ] **Step 10: Verify production build**

Run: `pnpm build`
Expected: build completes with no TypeScript errors, producing `.output/`.

- [ ] **Step 11: Extend `.gitignore` and commit**

The project already has a `.gitignore` from the design-spec session with `node_modules/`, `dist/`, `.output/`, `.vercel/`, `.netlify/`, `*.local`, `.env`, `.env.local`, `.DS_Store`. Confirm with `cat .gitignore` — it should already cover everything this task needs; do not duplicate entries.

```bash
git add package.json tsconfig.json vite.config.ts vitest.config.ts src/ pnpm-lock.yaml
git commit -m "Scaffold TanStack Start app with design-system CSS tokens"
```


---

### Task 2: Aptos SDK client and shared governance types

**Files:**
- Create: `src/lib/aptos/client.ts`
- Create: `src/lib/governance/types.ts`

**Interfaces:**
- Consumes: nothing (foundational).
- Produces: `getAptosClient(): Aptos` singleton; `ProposalStatus` union; `RawProposal` (exact on-chain shape); `ProposalMetadata`; `ProposalListItem`; `EligiblePool` — every later task imports these exact names.

- [ ] **Step 1: Create `src/lib/aptos/client.ts`**

This is safe to import from both server functions and (later) the client wallet boundary — it only builds a read client, never touches wallet APIs or private keys.

```ts
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

let cachedClient: Aptos | null = null;

/**
 * Returns a singleton Aptos SDK client configured for mainnet. Reads
 * APTOS_FULLNODE_URL as an optional override (confirmed AptosConfig
 * property: `fullnode`) — per design spec §9's "env vars for
 * fullnode/indexer endpoints with a sane mainnet default" requirement.
 * This override is also what Task 18's Playwright e2e test uses to
 * point at a local mock fullnode instead of real mainnet.
 * Safe to call from server functions and from client code — this
 * only wraps read/view/submit RPC calls, never private keys.
 */
export function getAptosClient(): Aptos {
  if (!cachedClient) {
    cachedClient = new Aptos(
      new AptosConfig({
        network: Network.MAINNET,
        fullnode: process.env.APTOS_FULLNODE_URL || undefined,
        clientConfig: process.env.APTOS_BUILD_API_KEY
          ? { API_KEY: process.env.APTOS_BUILD_API_KEY }
          : undefined,
      }),
    );
  }
  return cachedClient;
}

/** Resets the cached client — test-only, so each test run can point
 *  at a fresh mock server without leaking state across test files. */
export function resetAptosClientForTests(): void {
  cachedClient = null;
}

export const APTOS_GOVERNANCE_ADDRESS = "0x1";
export const GOVERNANCE_PROPOSAL_TYPE =
  "0x1::governance_proposal::GovernanceProposal" as const;
export const VOTING_FORUM_RESOURCE_TYPE =
  `0x1::voting::VotingForum<${GOVERNANCE_PROPOSAL_TYPE}>` as const;
export const VOTING_FORUM_PROPOSAL_VALUE_TYPE =
  `0x1::voting::Proposal<${GOVERNANCE_PROPOSAL_TYPE}>` as const;
```

- [ ] **Step 2: Create `src/lib/governance/types.ts`**

These types mirror the exact on-chain JSON shape confirmed by directly querying mainnet (`GET /v1/accounts/0x1/resource/0x1::voting::VotingForum<...>` and `POST /v1/tables/:handle/item`) — every numeric field is a `string` on the wire, so every type here uses `string`, never `number`.

```ts
/**
 * Derived status — NOT an on-chain enum. The real framework
 * (aptos_framework::voting::get_proposal_state) only returns
 * PENDING/SUCCEEDED/FAILED, plus a separate `is_resolved` bool.
 * There is no "not yet started" or "expired" state: voting opens
 * immediately at proposal creation. This union is the UI-facing
 * lifecycle derived from those on-chain facts (see status.ts):
 *   active   -> voting still open
 *   passed   -> voting closed, succeeded, awaiting execution
 *   executed -> is_resolved === true
 *   failed   -> voting closed, did not meet threshold
 */
export type ProposalStatus = "active" | "passed" | "executed" | "failed";

/** One key/value entry in the on-chain SimpleMap<String, vector<u8>> metadata map. */
export interface RawProposalMetadataEntry {
  key: string;
  /** Hex-encoded (0x-prefixed) raw bytes. */
  value: string;
}

/**
 * Exact shape returned by:
 * POST /v1/tables/:votingForumHandle/item
 * with value_type "0x1::voting::Proposal<0x1::governance_proposal::GovernanceProposal>"
 *
 * Confirmed against a real mainnet proposal on 2026-08-20 — every
 * numeric field is a decimal string on the wire.
 */
export interface RawProposal {
  proposer: string;
  execution_content: { vec: Array<{ dummy_field: boolean }> };
  metadata: { data: RawProposalMetadataEntry[] };
  creation_time_secs: string;
  execution_hash: string;
  min_vote_threshold: string;
  expiration_secs: string;
  early_resolution_vote_threshold: { vec: string[] };
  yes_votes: string;
  no_votes: string;
  is_resolved: boolean;
  resolution_time_secs: string;
}

/** Off-chain metadata JSON fetched from `metadata_location`, after hash verification. */
export interface ProposalMetadata {
  title: string;
  description: string;
  source_code_url: string;
  discussion_url: string;
}

/** Result of fetching + verifying a proposal's off-chain metadata. */
export type MetadataVerificationResult =
  | { verified: true; metadata: ProposalMetadata }
  | { verified: false; reason: string; rawText?: string };

/** Normalized proposal shape the UI actually renders. */
export interface ProposalListItem {
  proposalId: string;
  proposer: string;
  status: ProposalStatus;
  creationTimeSecs: bigint;
  expirationSecs: bigint;
  resolutionTimeSecs: bigint | null;
  minVoteThreshold: bigint;
  earlyResolutionVoteThreshold: bigint | null;
  yesVotes: bigint;
  noVotes: bigint;
  executionHash: string;
  metadataLocation: string | null;
  metadataHashHex: string | null;
  metadataResult: MetadataVerificationResult;
}

export type PoolKind = "stake_pool" | "delegation_pool";

/** A pool the connected address can vote through, with its current standing on one proposal. */
export interface EligiblePool {
  poolAddress: string;
  poolKind: PoolKind;
  /** Remaining voting power this pool can still cast on the proposal in question. */
  remainingVotingPower: bigint;
  /** True if this pool has already used all its voting power on this proposal. */
  hasEntirelyVoted: boolean;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors (these are pure type/const files with no runtime logic to test yet).

- [ ] **Step 3: Commit**

```bash
git add src/lib/aptos/client.ts src/lib/governance/types.ts
git commit -m "Add Aptos SDK client singleton and shared governance types"
```

---

### Task 3: Proposal status derivation (pure, TDD)

**Files:**
- Create: `src/lib/governance/status.ts`
- Test: `tests/unit/status.test.ts`

**Interfaces:**
- Consumes: nothing beyond plain `bigint`s (deliberately decoupled from `RawProposal` so it's trivially unit-testable).
- Produces: `deriveProposalStatus(input: ProposalStatusInput): ProposalStatus`, `isVotingClosed(input: VotingClosedInput): boolean` — used by Task 6 (`fetch-proposals.ts`) and Task 8 (`fetch-proposal.ts`).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/status.test.ts
import { describe, expect, it } from "vitest";
import { deriveProposalStatus, isVotingClosed } from "~/lib/governance/status";

describe("isVotingClosed", () => {
  it("is false before expiration with no early-resolution threshold set", () => {
    expect(
      isVotingClosed({
        yesVotes: 10n,
        noVotes: 5n,
        earlyResolutionVoteThreshold: null,
        expirationSecs: 1000n,
        nowSecs: 500n,
      }),
    ).toBe(false);
  });

  it("is true once nowSecs reaches expirationSecs", () => {
    expect(
      isVotingClosed({
        yesVotes: 10n,
        noVotes: 5n,
        earlyResolutionVoteThreshold: null,
        expirationSecs: 1000n,
        nowSecs: 1000n,
      }),
    ).toBe(true);
  });

  it("is true early once yes votes reach the early-resolution threshold", () => {
    expect(
      isVotingClosed({
        yesVotes: 60n,
        noVotes: 5n,
        earlyResolutionVoteThreshold: 60n,
        expirationSecs: 1000n,
        nowSecs: 10n,
      }),
    ).toBe(true);
  });

  it("is true early once no votes reach the early-resolution threshold", () => {
    expect(
      isVotingClosed({
        yesVotes: 5n,
        noVotes: 60n,
        earlyResolutionVoteThreshold: 60n,
        expirationSecs: 1000n,
        nowSecs: 10n,
      }),
    ).toBe(true);
  });
});

describe("deriveProposalStatus", () => {
  const base = {
    isResolved: false,
    yesVotes: 0n,
    noVotes: 0n,
    minVoteThreshold: 100n,
    earlyResolutionVoteThreshold: null as bigint | null,
    expirationSecs: 1000n,
    nowSecs: 0n,
  };

  it("is active while voting is still open", () => {
    expect(deriveProposalStatus({ ...base, nowSecs: 500n })).toBe("active");
  });

  it("is passed once closed with enough yes votes over threshold", () => {
    expect(
      deriveProposalStatus({
        ...base,
        nowSecs: 1000n,
        yesVotes: 80n,
        noVotes: 20n,
        minVoteThreshold: 100n,
      }),
    ).toBe("passed");
  });

  it("is failed once closed without meeting the minimum vote threshold", () => {
    expect(
      deriveProposalStatus({
        ...base,
        nowSecs: 1000n,
        yesVotes: 10n,
        noVotes: 5n,
        minVoteThreshold: 100n,
      }),
    ).toBe("failed");
  });

  it("is failed once closed with more no votes than yes votes", () => {
    expect(
      deriveProposalStatus({
        ...base,
        nowSecs: 1000n,
        yesVotes: 40n,
        noVotes: 60n,
        minVoteThreshold: 50n,
      }),
    ).toBe("failed");
  });

  it("is executed once is_resolved is true, regardless of timing", () => {
    expect(
      deriveProposalStatus({
        ...base,
        isResolved: true,
        nowSecs: 0n,
      }),
    ).toBe("executed");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/status.test.ts`
Expected: FAIL — `Cannot find module '~/lib/governance/status'` (file does not exist yet).

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/governance/status.ts
import type { ProposalStatus } from "~/lib/governance/types";

export interface VotingClosedInput {
  yesVotes: bigint;
  noVotes: bigint;
  earlyResolutionVoteThreshold: bigint | null;
  expirationSecs: bigint;
  nowSecs: bigint;
}

/**
 * Mirrors aptos_framework::voting::is_voting_closed: true once either
 * the early-resolution threshold is reached by yes or no votes, or the
 * voting period has ended.
 */
export function isVotingClosed(input: VotingClosedInput): boolean {
  const canResolveEarly =
    input.earlyResolutionVoteThreshold !== null &&
    (input.yesVotes >= input.earlyResolutionVoteThreshold ||
      input.noVotes >= input.earlyResolutionVoteThreshold);
  const votingPeriodOver = input.nowSecs >= input.expirationSecs;
  return canResolveEarly || votingPeriodOver;
}

export interface ProposalStatusInput extends VotingClosedInput {
  isResolved: boolean;
  minVoteThreshold: bigint;
}

/**
 * Derives the UI-facing ProposalStatus from on-chain facts. Mirrors
 * aptos_framework::voting::get_proposal_state (PENDING/SUCCEEDED/FAILED)
 * with is_resolved layered on top as the "executed" terminal state.
 * There is no on-chain "not started" or "expired" state to derive.
 */
export function deriveProposalStatus(
  input: ProposalStatusInput,
): ProposalStatus {
  if (input.isResolved) {
    return "executed";
  }
  if (!isVotingClosed(input)) {
    return "active";
  }
  const succeeded =
    input.yesVotes > input.noVotes &&
    input.yesVotes + input.noVotes >= input.minVoteThreshold;
  return succeeded ? "passed" : "failed";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/status.test.ts`
Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/governance/status.ts tests/unit/status.test.ts
git commit -m "Add proposal status derivation matching on-chain voting.move logic"
```


---

### Task 4: Off-chain metadata fetch + SHA3-256 verification (pure/async, TDD)

**Files:**
- Create: `src/lib/governance/metadata.ts`
- Test: `tests/unit/metadata.test.ts`

**Interfaces:**
- Consumes: `ProposalMetadata`, `MetadataVerificationResult` from `src/lib/governance/types.ts` (Task 2).
- Produces: `verifyProposalMetadata(rawText: string, expectedHashHex: string): MetadataVerificationResult`; `fetchAndVerifyProposalMetadata(locationUrl: string, expectedHashHex: string): Promise<MetadataVerificationResult>` — used by Task 8 (`fetch-proposal.ts`).
- This is the mandatory security check from the design spec §5.3/§10: an unverified proposal must never render as if it were verified.

- [ ] **Step 1: Write the failing test**

The real on-chain `metadata_hash` field is itself hex-encoded ASCII of a lowercase hex digest (confirmed against a real mainnet proposal: the 128-hex-char on-chain value decodes to a 64-character ASCII string that IS the sha3-256 hex digest). So verification is: decode the on-chain hex-of-hex to get the expected digest string, then compare it against `sha3_256(rawBytes).hexdigest()`.

```ts
// tests/unit/metadata.test.ts
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  verifyProposalMetadata,
  fetchAndVerifyProposalMetadata,
} from "~/lib/governance/metadata";

// Real fixture: the exact bytes and on-chain hash confirmed against
// mainnet proposal id 200's metadata_location/metadata_hash on 2026-08-20.
const REAL_METADATA_TEXT = `{
  "title": "Enable transaction limits",
  "description": "Enables staking-based transaction limits (see AIP-146 for details)",
  "source_code_url": "https://github.com/aptos-foundation/mainnet-proposals/tree/main/sources/2026-06-22-enable-transaction-limits",
  "discussion_url": "https://github.com/aptos-foundation/AIPs/issues/669"
}
`;
// Hex-encoding of the ASCII sha3-256 hex digest, exactly as stored on-chain.
const REAL_ON_CHAIN_HASH_HEX =
  "0x63626330376439363530646338383336663137636439393039316638633033333166623765633333643638323562323034393066356235616635353433386138";

describe("verifyProposalMetadata", () => {
  it("verifies successfully when the hash matches", () => {
    const result = verifyProposalMetadata(
      REAL_METADATA_TEXT,
      REAL_ON_CHAIN_HASH_HEX,
    );
    expect(result.verified).toBe(true);
    if (result.verified) {
      expect(result.metadata.title).toBe("Enable transaction limits");
      expect(result.metadata.discussion_url).toBe(
        "https://github.com/aptos-foundation/AIPs/issues/669",
      );
    }
  });

  it("fails verification when the text has been tampered with", () => {
    const tampered = REAL_METADATA_TEXT.replace(
      "Enable transaction limits",
      "Malicious title",
    );
    const result = verifyProposalMetadata(tampered, REAL_ON_CHAIN_HASH_HEX);
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toMatch(/hash mismatch/i);
    }
  });

  it("fails verification when the text is not valid JSON, even if hash matched", () => {
    const notJson = "not json at all";
    // This hash is computed to genuinely MATCH notJson's real sha3-256
    // digest (hex-of-ASCII-hex-digest encoded, same scheme as the real
    // on-chain fixture above) so this test actually isolates the
    // JSON-parse failure from the hash-mismatch failure — an arbitrary
    // non-matching placeholder like "0xdeadbeef" would make the hash
    // check fail first and never exercise the JSON-parse branch at all.
    const notJsonHash =
      "0x30363663386165366266633061303334306630376161306239623638353861346635643638393531663062316331356463326336313039386662363166616361";
    const result = verifyProposalMetadata(notJson, notJsonHash);
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toMatch(/not valid JSON/i);
    }
  });

  it("fails verification when required fields are missing", () => {
    const incomplete = JSON.stringify({ title: "Only a title" });
    // Same reasoning as above: this hash genuinely matches `incomplete`'s
    // real digest so the test isolates the missing-fields branch instead
    // of tripping the hash-mismatch check first.
    const incompleteHash =
      "0x62373039623032626236316634373333303432623034313331353962616133346261653536646262633331653239343662643631303363663537336236383766";
    const result = verifyProposalMetadata(incomplete, incompleteHash);
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toMatch(/missing|invalid/i);
    }
  });
});

describe("fetchAndVerifyProposalMetadata", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns verified metadata for a matching fetch response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(REAL_METADATA_TEXT),
    }) as unknown as typeof fetch;

    const result = await fetchAndVerifyProposalMetadata(
      "https://example.com/metadata.json",
      REAL_ON_CHAIN_HASH_HEX,
    );
    expect(result.verified).toBe(true);
  });

  it("returns an unverified result (not a throw) when the fetch fails", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("network error")) as unknown as typeof fetch;

    const result = await fetchAndVerifyProposalMetadata(
      "https://example.com/missing.json",
      REAL_ON_CHAIN_HASH_HEX,
    );
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toMatch(/fetch/i);
    }
  });

  it("returns an unverified result when the response is not ok (e.g. 404)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve(""),
    }) as unknown as typeof fetch;

    const result = await fetchAndVerifyProposalMetadata(
      "https://example.com/missing.json",
      REAL_ON_CHAIN_HASH_HEX,
    );
    expect(result.verified).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/metadata.test.ts`
Expected: FAIL — `Cannot find module '~/lib/governance/metadata'`.

- [ ] **Step 3: Write minimal implementation**

Uses `@noble/hashes` for SHA3-256 (a small, audited, dependency-free-of-native-bindings package that works identically in Node and the browser — needed because this same function may run server-side today and could be reused client-side later). Add it to `package.json` dependencies first.

```bash
pnpm add @noble/hashes
```

```ts
// src/lib/governance/metadata.ts
// NOTE: @noble/hashes@2.x requires the explicit .js extension on subpath
// imports (its package.json "exports" map only defines "./sha3.js" and
// "./utils.js", not the extensionless "./sha3"/"./utils" that worked on
// older majors). Confirmed by reproducing ERR_PACKAGE_PATH_NOT_EXPORTED
// with the extensionless form and resolving cleanly with .js added.
import { sha3_256 } from "@noble/hashes/sha3.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type {
  MetadataVerificationResult,
  ProposalMetadata,
} from "~/lib/governance/types";

const MAX_METADATA_BYTES = 1_000_000; // 1 MB bound — see fetchAndVerifyProposalMetadata
const FETCH_TIMEOUT_MS = 8_000;

/**
 * Decodes the on-chain metadata_hash (hex-of-ASCII-hex-digest, confirmed
 * against a real mainnet proposal) into the plain lowercase hex digest
 * string it represents.
 */
function decodeOnChainHash(expectedHashHex: string): string {
  const clean = expectedHashHex.startsWith("0x")
    ? expectedHashHex.slice(2)
    : expectedHashHex;
  const bytes = Buffer.from(clean, "hex");
  return bytes.toString("ascii").toLowerCase();
}

function isProposalMetadata(value: unknown): value is ProposalMetadata {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === "string" &&
    typeof v.description === "string" &&
    typeof v.source_code_url === "string" &&
    typeof v.discussion_url === "string"
  );
}

/**
 * Verifies raw metadata text against the on-chain hash. Pure and
 * synchronous — no network access — so it's trivially unit-testable
 * and reusable regardless of how the text was obtained.
 */
export function verifyProposalMetadata(
  rawText: string,
  expectedHashHex: string,
): MetadataVerificationResult {
  const computedDigest = bytesToHex(sha3_256(new TextEncoder().encode(rawText)));
  const expectedDigest = decodeOnChainHash(expectedHashHex);

  if (computedDigest !== expectedDigest) {
    return {
      verified: false,
      reason: `metadata hash mismatch: computed ${computedDigest} but on-chain value is ${expectedDigest}`,
      rawText,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      verified: false,
      reason: "metadata hash matched but body is not valid JSON",
      rawText,
    };
  }

  if (!isProposalMetadata(parsed)) {
    return {
      verified: false,
      reason:
        "metadata hash matched but JSON is missing required fields (title, description, source_code_url, discussion_url)",
      rawText,
    };
  }

  return { verified: true, metadata: parsed };
}

/**
 * Fetches metadata_location with a timeout and a response-size bound
 * (defense against a malicious/huge metadata_location being used as an
 * amplification vector), then verifies it. Never throws — every failure
 * path returns { verified: false, reason } so callers always get an
 * explicit "unverified" state to show, per design spec §5.3/§10.
 */
export async function fetchAndVerifyProposalMetadata(
  locationUrl: string,
  expectedHashHex: string,
): Promise<MetadataVerificationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(locationUrl, {
      signal: controller.signal,
      redirect: "follow",
    });

    if (!response.ok) {
      return {
        verified: false,
        reason: `metadata fetch failed with HTTP ${response.status}`,
      };
    }

    const text = await response.text();
    if (text.length > MAX_METADATA_BYTES) {
      return {
        verified: false,
        reason: `metadata response exceeded ${MAX_METADATA_BYTES} byte limit`,
      };
    }

    return verifyProposalMetadata(text, expectedHashHex);
  } catch (error) {
    return {
      verified: false,
      reason: `metadata fetch threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/metadata.test.ts`
Expected: PASS — all 7 tests green. If the first test fails on the hash comparison, double check `decodeOnChainHash` — the on-chain value is hex-encoded ASCII of the digest string, not the raw digest bytes (verified directly against mainnet; do not "simplify" this to a raw-bytes comparison).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/governance/metadata.ts tests/unit/metadata.test.ts
git commit -m "Add proposal metadata fetch + sha3-256 verification"
```

---

### Task 5: Formatting utilities (pure, TDD)

**Files:**
- Create: `src/lib/governance/format.ts`
- Test: `tests/unit/format.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `formatOctasToApt(octas: bigint, maxDecimals?: number): string`; `truncateAddress(address: string, prefixLen?: number, suffixLen?: number): string` — used by `ProposalCard.tsx`, `VoteBar.tsx`, `VotingPanel.tsx` (Tasks 10–14).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/format.test.ts
import { describe, expect, it } from "vitest";
import { formatOctasToApt, truncateAddress } from "~/lib/governance/format";

describe("formatOctasToApt", () => {
  it("converts whole-APT octas with no fractional remainder", () => {
    expect(formatOctasToApt(100_000_000n)).toBe("1");
  });

  it("converts a large realistic voting-power figure", () => {
    // 369935249.51380141 APT worth of octas, truncated to 2 decimals
    expect(formatOctasToApt(36_993_524_951_380_141n, 2)).toBe(
      "369,935,249.51",
    );
  });

  it("handles zero", () => {
    expect(formatOctasToApt(0n)).toBe("0");
  });

  it("does not lose precision for values beyond Number.MAX_SAFE_INTEGER", () => {
    const hugeOctas = 90_071_992_547_409_910_000n; // far beyond 2^53
    expect(() => formatOctasToApt(hugeOctas)).not.toThrow();
    expect(formatOctasToApt(hugeOctas, 0)).toBe("900,719,925,474,099");
  });
});

describe("truncateAddress", () => {
  it("truncates a full 66-char address to prefix...suffix", () => {
    const addr =
      "0xdb009ab1a3259c4b27a0d8ff9d0e913e13e4c8b657fc73768f4e9bb811c7a1d8";
    expect(truncateAddress(addr)).toBe("0xdb00...c7a1d8");
  });

  it("returns short input unchanged", () => {
    expect(truncateAddress("0x1")).toBe("0x1");
  });

  it("respects custom prefix/suffix lengths", () => {
    const addr =
      "0xdb009ab1a3259c4b27a0d8ff9d0e913e13e4c8b657fc73768f4e9bb811c7a1d8";
    expect(truncateAddress(addr, 8, 4)).toBe("0xdb009a...c7a1d8".slice(0, 0) || truncateAddress(addr, 8, 4));
  });
});
```

Note on the last test: it's rewritten to avoid a self-referential assertion — replace it with a concrete expected value once you decide prefix/suffix semantics in Step 3. Use this simpler version instead:

```ts
  it("respects custom prefix/suffix lengths", () => {
    const addr =
      "0xdb009ab1a3259c4b27a0d8ff9d0e913e13e4c8b657fc73768f4e9bb811c7a1d8";
    expect(truncateAddress(addr, 8, 4)).toBe("0xdb009ab...a1d8");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/format.test.ts`
Expected: FAIL — `Cannot find module '~/lib/governance/format'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/governance/format.ts

const OCTAS_PER_APT = 100_000_000n;

/**
 * Formats a raw octas bigint (1 APT = 10^8 octas) as a comma-grouped
 * APT string with up to `maxDecimals` fractional digits. Pure bigint
 * arithmetic throughout — never routes through JS `number`, so this is
 * safe for values far beyond Number.MAX_SAFE_INTEGER.
 */
export function formatOctasToApt(octas: bigint, maxDecimals = 2): string {
  const whole = octas / OCTAS_PER_APT;
  const remainder = octas % OCTAS_PER_APT;

  const wholeStr = whole.toLocaleString("en-US");

  if (maxDecimals <= 0 || remainder === 0n) {
    return wholeStr;
  }

  const fractionalDigits = remainder
    .toString()
    .padStart(8, "0")
    .slice(0, maxDecimals)
    .replace(/0+$/, "");

  return fractionalDigits.length > 0
    ? `${wholeStr}.${fractionalDigits}`
    : wholeStr;
}

/**
 * Truncates a hex address to `0x` + first `prefixLen` chars + "..." +
 * last `suffixLen` chars. Returns the input unchanged if it's already
 * shorter than the truncated form would be.
 */
export function truncateAddress(
  address: string,
  prefixLen = 6,
  suffixLen = 6,
): string {
  const hasPrefix = address.startsWith("0x");
  const body = hasPrefix ? address.slice(2) : address;
  const prefix = hasPrefix ? "0x" : "";

  if (body.length <= prefixLen + suffixLen) {
    return address;
  }

  return `${prefix}${body.slice(0, prefixLen)}...${body.slice(-suffixLen)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/format.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/governance/format.ts tests/unit/format.test.ts
git commit -m "Add octas/address formatting utilities"
```


---

### Task 6: Indexer GraphQL client and proposal-votes query

**Files:**
- Create: `src/lib/governance/indexer-client.ts`
- Create: `src/lib/governance/fetch-proposal-votes.ts`
- Test: `tests/unit/indexer-client.test.ts`

**Interfaces:**
- Consumes: nothing beyond global `fetch`.
- Produces: `executeIndexerQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T>`; `fetchProposalVotes(proposalId: string): Promise<ProposalVoteRow[]>` — used by Task 10 (`fetch-proposal.ts`).

**Known risk to carry forward (do not silently resolve):** the official Aptos indexer table reference (`aptos.dev/build/indexer/indexer-api/indexer-reference.md`) has **no Governance/Proposal section at all** as of 2026-08-20 — confirmed by fetching the live page and finding zero occurrences of "governance", "voting", or "proposal". `proposal_votes` is real and used successfully by the official `aptos-labs/governance` reference app, but its column list (`proposal_id`, `staking_pool_address`, `should_pass`, `num_votes` — confirmed from that app's own query) is not part of any public schema guarantee. Treat any additional column beyond those four as unconfirmed until you've run a live introspection query against `https://api.mainnet.aptoslabs.com/v1/graphql`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/indexer-client.test.ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { executeIndexerQuery } from "~/lib/governance/indexer-client";

describe("executeIndexerQuery", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("posts the query/variables and returns the data field", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ data: { proposal_votes: [{ num_votes: "5" }] } }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const result = await executeIndexerQuery<{
      proposal_votes: Array<{ num_votes: string }>;
    }>("query Foo { proposal_votes { num_votes } }", { proposalId: "1" });

    expect(result.proposal_votes[0].num_votes).toBe("5");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.mainnet.aptoslabs.com/v1/graphql",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws a descriptive error when the GraphQL response contains errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          errors: [{ message: "field 'bogus' not found" }],
        }),
    }) as unknown as typeof fetch;

    await expect(
      executeIndexerQuery("query Foo { bogus }"),
    ).rejects.toThrow(/bogus/);
  });

  it("throws a descriptive error on a non-OK HTTP response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;

    await expect(executeIndexerQuery("query Foo { x }")).rejects.toThrow(
      /429/,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/indexer-client.test.ts`
Expected: FAIL — `Cannot find module '~/lib/governance/indexer-client'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/governance/indexer-client.ts

/** Overridable per design spec §9 — defaults to the hosted mainnet
 *  endpoint; Task 18's e2e test points this at a local mock instead. */
const INDEXER_URL =
  process.env.APTOS_INDEXER_URL || "https://api.mainnet.aptoslabs.com/v1/graphql";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/**
 * POSTs a GraphQL query to the hosted Aptos mainnet Indexer API and
 * returns its `data` field. Throws with the GraphQL error message(s)
 * on a GraphQL-level error, or the HTTP status on a transport error —
 * callers should catch and convert to a UI-facing "stale/unavailable"
 * state rather than letting this bubble as an unhandled rejection.
 */
export async function executeIndexerQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (process.env.APTOS_BUILD_API_KEY) {
    headers.Authorization = `Bearer ${process.env.APTOS_BUILD_API_KEY}`;
  }

  const response = await fetch(INDEXER_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Indexer request failed with HTTP ${response.status}`);
  }

  const body = (await response.json()) as GraphQLResponse<T>;

  if (body.errors && body.errors.length > 0) {
    throw new Error(
      `Indexer GraphQL error(s): ${body.errors.map((e) => e.message).join("; ")}`,
    );
  }

  if (!body.data) {
    throw new Error("Indexer response had no data and no errors");
  }

  return body.data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/indexer-client.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Create `src/lib/governance/fetch-proposal-votes.ts`** (no separate test — thin query wrapper over the already-tested client; exercised end-to-end in Task 16's Playwright test)

```ts
// src/lib/governance/fetch-proposal-votes.ts
import { executeIndexerQuery } from "~/lib/governance/indexer-client";

export interface ProposalVoteRow {
  stakingPoolAddress: string;
  shouldPass: boolean;
  numVotes: bigint;
}

interface ProposalVotesQueryResult {
  proposal_votes: Array<{
    staking_pool_address: string;
    should_pass: boolean;
    num_votes: string;
  }>;
}

const PROPOSAL_VOTES_QUERY = `
  query ProposalVotes($proposalId: bigint, $limit: Int, $offset: Int) {
    proposal_votes(
      where: { proposal_id: { _eq: $proposalId } }
      order_by: { num_votes: desc }
      limit: $limit
      offset: $offset
    ) {
      staking_pool_address
      should_pass
      num_votes
    }
  }
`;

/** Default page size for fetchProposalVotes — exported so callers (e.g.
 *  the proposal detail route's "load more" logic in Task 13) can detect
 *  a full page without duplicating this number. */
export const PROPOSAL_VOTES_PAGE_SIZE = 25;

/**
 * Fetches the paginated per-pool vote breakdown for one proposal.
 * Uses only the four columns (proposal_id, staking_pool_address,
 * should_pass, num_votes) confirmed against the official governance
 * reference app's own query — see the risk note on Task 6 above about
 * this table's absence from the public indexer schema reference.
 */
export async function fetchProposalVotes(
  proposalId: string,
  limit = PROPOSAL_VOTES_PAGE_SIZE,
  offset = 0,
): Promise<ProposalVoteRow[]> {
  const result = await executeIndexerQuery<ProposalVotesQueryResult>(
    PROPOSAL_VOTES_QUERY,
    { proposalId, limit, offset },
  );

  return result.proposal_votes.map((row) => ({
    stakingPoolAddress: row.staking_pool_address,
    shouldPass: row.should_pass,
    numVotes: BigInt(row.num_votes),
  }));
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/governance/indexer-client.ts src/lib/governance/fetch-proposal-votes.ts tests/unit/indexer-client.test.ts
git commit -m "Add Indexer GraphQL client and proposal-votes query"
```

---

### Task 7: Eligible-pool discovery (indexer + fullnode cross-check, TDD)

**Files:**
- Create: `src/lib/governance/fetch-eligible-pools.ts`
- Test: `tests/unit/fetch-eligible-pools.test.ts`

**Interfaces:**
- Consumes: `EligiblePool`, `PoolKind` from `src/lib/governance/types.ts` (Task 2); `getAptosClient` from `src/lib/aptos/client.ts` (Task 2); `executeIndexerQuery` from `src/lib/governance/indexer-client.ts` (Task 6).
- Produces: `findEligiblePools(voterAddress: string, proposalId: string): Promise<EligiblePool[]>` — used by Task 14 (`VotingPanel.tsx`).

This is the core of "discover every pool this address can vote through" (design spec §6.4). It combines two **confirmed** indexer tables (`current_staking_pool_voter`, `current_delegated_voter` — exact columns pulled directly from the official `indexer-reference.md` page on 2026-08-20) with fullnode view-function cross-checks so voting eligibility is never based on indexer data alone (the indexer can lag; the design spec requires fullnode reads to win for anything voting-eligibility-related).

For delegation pools, "has this voter already used all their power" is derived **exactly** (not approximated) from two confirmed `#[view]` functions: `calculate_and_update_voter_total_voting_power` (total power ever available to this voter through this pool) and `calculate_and_update_remaining_voting_power` (power left for this specific proposal). If total power is positive but remaining is zero, the voter has used all of it on this proposal; if total power is itself zero, the pool currently grants this voter no power at all (either no stake, or the underlying stake pool is ineligible/ has already been fully used at the pool level) and the UI should say so generically rather than claim a specific cause.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/fetch-eligible-pools.test.ts
import { describe, expect, it, vi } from "vitest";
import { findEligiblePools } from "~/lib/governance/fetch-eligible-pools";
import * as indexerClient from "~/lib/governance/indexer-client";
import { getAptosClient } from "~/lib/aptos/client";

vi.mock("~/lib/governance/indexer-client");
vi.mock("~/lib/aptos/client");

const VOTER = "0xvoter";
const PROPOSAL_ID = "42";

describe("findEligiblePools", () => {
  it("returns a stake pool with its remaining power and voted flag", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockImplementation(
      async (query: string) => {
        if (query.includes("current_staking_pool_voter")) {
          return {
            current_staking_pool_voter: [
              { staking_pool_address: "0xstakepool1" },
            ],
          } as never;
        }
        return { current_delegated_voter: [] } as never;
      },
    );

    const mockView = vi.fn(async ({ payload }: { payload: { function: string } }) => {
      if (payload.function === "0x1::aptos_governance::get_remaining_voting_power") {
        return [500n];
      }
      if (payload.function === "0x1::aptos_governance::has_entirely_voted") {
        return [false];
      }
      throw new Error(`unexpected view call: ${payload.function}`);
    });
    vi.mocked(getAptosClient).mockReturnValue({ view: mockView } as never);

    const pools = await findEligiblePools(VOTER, PROPOSAL_ID);

    expect(pools).toEqual([
      {
        poolAddress: "0xstakepool1",
        poolKind: "stake_pool",
        remainingVotingPower: 500n,
        hasEntirelyVoted: false,
      },
    ]);
  });

  it("derives hasEntirelyVoted=true for a delegation pool with zero remaining but nonzero total power", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockImplementation(
      async (query: string) => {
        if (query.includes("current_staking_pool_voter")) {
          return { current_staking_pool_voter: [] } as never;
        }
        return {
          current_delegated_voter: [
            { delegation_pool_address: "0xdelegpool1" },
          ],
        } as never;
      },
    );

    const mockView = vi.fn(async ({ payload }: { payload: { function: string } }) => {
      if (
        payload.function ===
        "0x1::delegation_pool::calculate_and_update_remaining_voting_power"
      ) {
        return [0n];
      }
      if (
        payload.function ===
        "0x1::delegation_pool::calculate_and_update_voter_total_voting_power"
      ) {
        return [1000n];
      }
      throw new Error(`unexpected view call: ${payload.function}`);
    });
    vi.mocked(getAptosClient).mockReturnValue({ view: mockView } as never);

    const pools = await findEligiblePools(VOTER, PROPOSAL_ID);

    expect(pools).toEqual([
      {
        poolAddress: "0xdelegpool1",
        poolKind: "delegation_pool",
        remainingVotingPower: 0n,
        hasEntirelyVoted: true,
      },
    ]);
  });

  it("marks hasEntirelyVoted=false for a delegation pool with zero total power (no stake / ineligible)", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockImplementation(
      async (query: string) => {
        if (query.includes("current_staking_pool_voter")) {
          return { current_staking_pool_voter: [] } as never;
        }
        return {
          current_delegated_voter: [
            { delegation_pool_address: "0xdelegpool2" },
          ],
        } as never;
      },
    );

    const mockView = vi.fn(async ({ payload }: { payload: { function: string } }) => {
      if (
        payload.function ===
        "0x1::delegation_pool::calculate_and_update_remaining_voting_power"
      ) {
        return [0n];
      }
      if (
        payload.function ===
        "0x1::delegation_pool::calculate_and_update_voter_total_voting_power"
      ) {
        return [0n];
      }
      throw new Error(`unexpected view call: ${payload.function}`);
    });
    vi.mocked(getAptosClient).mockReturnValue({ view: mockView } as never);

    const pools = await findEligiblePools(VOTER, PROPOSAL_ID);

    expect(pools[0].hasEntirelyVoted).toBe(false);
    expect(pools[0].remainingVotingPower).toBe(0n);
  });

  it("returns an empty array when the voter controls no pools", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockResolvedValue({
      current_staking_pool_voter: [],
      current_delegated_voter: [],
    } as never);

    const pools = await findEligiblePools(VOTER, PROPOSAL_ID);
    expect(pools).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/fetch-eligible-pools.test.ts`
Expected: FAIL — `Cannot find module '~/lib/governance/fetch-eligible-pools'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/governance/fetch-eligible-pools.ts
import { getAptosClient } from "~/lib/aptos/client";
import { executeIndexerQuery } from "~/lib/governance/indexer-client";
import type { EligiblePool } from "~/lib/governance/types";

const STAKING_POOL_VOTER_QUERY = `
  query StakingPoolVoter($voter: String) {
    current_staking_pool_voter(where: { voter_address: { _eq: $voter } }) {
      staking_pool_address
    }
  }
`;

const DELEGATED_VOTER_QUERY = `
  query DelegatedVoter($voter: String) {
    current_delegated_voter(where: { voter: { _eq: $voter } }) {
      delegation_pool_address
    }
  }
`;

interface StakingPoolVoterResult {
  current_staking_pool_voter: Array<{ staking_pool_address: string }>;
}

interface DelegatedVoterResult {
  current_delegated_voter: Array<{ delegation_pool_address: string }>;
}

async function findEligibleStakePools(
  voterAddress: string,
  proposalId: string,
): Promise<EligiblePool[]> {
  const aptos = getAptosClient();
  const { current_staking_pool_voter } =
    await executeIndexerQuery<StakingPoolVoterResult>(
      STAKING_POOL_VOTER_QUERY,
      { voter: voterAddress },
    );

  return Promise.all(
    current_staking_pool_voter.map(async (row) => {
      const poolAddress = row.staking_pool_address;

      const [remainingPowerResult, hasVotedResult] = await Promise.all([
        aptos.view<[string]>({
          payload: {
            function: "0x1::aptos_governance::get_remaining_voting_power",
            typeArguments: [],
            functionArguments: [poolAddress, proposalId],
          },
        }),
        aptos.view<[boolean]>({
          payload: {
            function: "0x1::aptos_governance::has_entirely_voted",
            typeArguments: [],
            functionArguments: [poolAddress, proposalId],
          },
        }),
      ]);

      return {
        poolAddress,
        poolKind: "stake_pool" as const,
        remainingVotingPower: BigInt(remainingPowerResult[0]),
        hasEntirelyVoted: hasVotedResult[0],
      };
    }),
  );
}

async function findEligibleDelegationPools(
  voterAddress: string,
  proposalId: string,
): Promise<EligiblePool[]> {
  const aptos = getAptosClient();
  const { current_delegated_voter } =
    await executeIndexerQuery<DelegatedVoterResult>(DELEGATED_VOTER_QUERY, {
      voter: voterAddress,
    });

  return Promise.all(
    current_delegated_voter.map(async (row) => {
      const poolAddress = row.delegation_pool_address;

      const [remainingPowerResult, totalPowerResult] = await Promise.all([
        aptos.view<[string]>({
          payload: {
            function:
              "0x1::delegation_pool::calculate_and_update_remaining_voting_power",
            typeArguments: [],
            functionArguments: [poolAddress, voterAddress, proposalId],
          },
        }),
        aptos.view<[string]>({
          payload: {
            function:
              "0x1::delegation_pool::calculate_and_update_voter_total_voting_power",
            typeArguments: [],
            functionArguments: [poolAddress, voterAddress],
          },
        }),
      ]);

      const remainingVotingPower = BigInt(remainingPowerResult[0]);
      const totalVotingPower = BigInt(totalPowerResult[0]);

      // Exact derivation (not a guess): if this voter ever had power through
      // this pool and now has none left, they've used it all on this
      // proposal. If they never had any, the UI should show a generic
      // "no voting power available" rather than claim a specific cause.
      const hasEntirelyVoted =
        totalVotingPower > 0n && remainingVotingPower === 0n;

      return {
        poolAddress,
        poolKind: "delegation_pool" as const,
        remainingVotingPower,
        hasEntirelyVoted,
      };
    }),
  );
}

/**
 * Finds every pool (traditional stake pool with delegated voter, and/or
 * delegation pool) that `voterAddress` can currently vote through on
 * `proposalId`, with fullnode-verified remaining power and voted status
 * for each — per design spec §6.4, indexer data alone is never treated
 * as authoritative for voting eligibility.
 */
export async function findEligiblePools(
  voterAddress: string,
  proposalId: string,
): Promise<EligiblePool[]> {
  const [stakePools, delegationPools] = await Promise.all([
    findEligibleStakePools(voterAddress, proposalId),
    findEligibleDelegationPools(voterAddress, proposalId),
  ]);

  return [...stakePools, ...delegationPools];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/fetch-eligible-pools.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/governance/fetch-eligible-pools.ts tests/unit/fetch-eligible-pools.test.ts
git commit -m "Add eligible-pool discovery with fullnode-verified voting power"
```


---

### Task 8: Parse raw on-chain proposal into typed fields (pure, TDD)

**Files:**
- Create: `src/lib/governance/parse-raw-proposal.ts`
- Test: `tests/unit/parse-raw-proposal.test.ts`

**Interfaces:**
- Consumes: `RawProposal`, `ProposalListItem`, `MetadataVerificationResult` from `src/lib/governance/types.ts` (Task 2); `deriveProposalStatus` from `src/lib/governance/status.ts` (Task 3).
- Produces: `decodeMetadataLocation(hexValue: string): string`; `parseRawProposalCore(proposalId: string, raw: RawProposal): ParsedProposalCore`; `buildProposalListItem(core, metadataResult, nowSecs): ProposalListItem` — used by Task 9 (`fetch-proposals.ts`) and Task 10 (`fetch-proposal.ts`).

The test fixture below is the **exact, real JSON** returned by `POST https://api.mainnet.aptoslabs.com/v1/tables/0x38ff67f17cf7998cd41ed5267b52cff7af37d06a22e8b390ce44b69680fc0e97/item` for mainnet proposal id 200, fetched and independently hash-verified on 2026-08-20 — not a synthetic fixture.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/parse-raw-proposal.test.ts
import { describe, expect, it } from "vitest";
import {
  decodeMetadataLocation,
  parseRawProposalCore,
  buildProposalListItem,
} from "~/lib/governance/parse-raw-proposal";
import type { RawProposal } from "~/lib/governance/types";

const REAL_RAW_PROPOSAL: RawProposal = {
  creation_time_secs: "1782168501",
  early_resolution_vote_threshold: { vec: ["60229252106793881"] },
  execution_content: { vec: [{ dummy_field: false }] },
  execution_hash:
    "0x1d7165849ba6d59630992eafb972ac83c997a65670192a93d95503f8c8e35447",
  expiration_secs: "1782427701",
  is_resolved: true,
  metadata: {
    data: [
      {
        key: "metadata_location",
        value:
          "0x68747470733a2f2f7261772e67697468756275736572636f6e74656e742e636f6d2f6170746f732d666f756e646174696f6e2f6d61696e6e65742d70726f706f73616c732f726566732f68656164732f6d61696e2f6d657461646174612f323032362d30362d32322d656e61626c652d7472616e73616374696f6e2d6c696d6974732f656e61626c652d7472616e73616374696f6e2d6c696d6974732e6a736f6e",
      },
      {
        key: "metadata_hash",
        value:
          "0x63626330376439363530646338383336663137636439393039316638633033333166623765633333643638323562323034393066356235616635353433386138",
      },
      { key: "IS_MULTI_STEP_PROPOSAL_KEY", value: "0x01" },
      { key: "IS_MULTI_STEP_PROPOSAL_IN_EXECUTION", value: "0x00" },
      { key: "RESOLVABLE_TIME_METADATA_KEY", value: "0x36a83d6a00000000" },
    ],
  },
  min_vote_threshold: "30000000000000000",
  no_votes: "144947835464",
  proposer:
    "0xdb009ab1a3259c4b27a0d8ff9d0e913e13e4c8b657fc73768f4e9bb811c7a1d8",
  resolution_time_secs: "1782509324",
  yes_votes: "36993524951380141",
};

describe("decodeMetadataLocation", () => {
  it("decodes the real hex-encoded metadata_location to its URL", () => {
    const entry = REAL_RAW_PROPOSAL.metadata.data.find(
      (e) => e.key === "metadata_location",
    )!;
    expect(decodeMetadataLocation(entry.value)).toBe(
      "https://raw.githubusercontent.com/aptos-foundation/mainnet-proposals/refs/heads/main/metadata/2026-06-22-enable-transaction-limits/enable-transaction-limits.json",
    );
  });
});

describe("parseRawProposalCore", () => {
  it("converts every numeric field to bigint and extracts metadata fields", () => {
    const core = parseRawProposalCore("200", REAL_RAW_PROPOSAL);

    expect(core.proposalId).toBe("200");
    expect(core.proposer).toBe(
      "0xdb009ab1a3259c4b27a0d8ff9d0e913e13e4c8b657fc73768f4e9bb811c7a1d8",
    );
    expect(core.isResolved).toBe(true);
    expect(core.creationTimeSecs).toBe(1782168501n);
    expect(core.expirationSecs).toBe(1782427701n);
    expect(core.resolutionTimeSecs).toBe(1782509324n);
    expect(core.minVoteThreshold).toBe(30000000000000000n);
    expect(core.earlyResolutionVoteThreshold).toBe(60229252106793881n);
    expect(core.yesVotes).toBe(36993524951380141n);
    expect(core.noVotes).toBe(144947835464n);
    expect(core.metadataLocation).toBe(
      "https://raw.githubusercontent.com/aptos-foundation/mainnet-proposals/refs/heads/main/metadata/2026-06-22-enable-transaction-limits/enable-transaction-limits.json",
    );
    expect(core.metadataHashHex).toBe(
      "0x63626330376439363530646338383336663137636439393039316638633033333166623765633333643638323562323034393066356235616635353433386138",
    );
  });

  it("returns resolutionTimeSecs=null for an unresolved proposal", () => {
    const unresolved: RawProposal = {
      ...REAL_RAW_PROPOSAL,
      is_resolved: false,
      resolution_time_secs: "0",
    };
    expect(parseRawProposalCore("201", unresolved).resolutionTimeSecs).toBeNull();
  });

  it("returns earlyResolutionVoteThreshold=null when the option vec is empty", () => {
    const noThreshold: RawProposal = {
      ...REAL_RAW_PROPOSAL,
      early_resolution_vote_threshold: { vec: [] },
    };
    expect(
      parseRawProposalCore("202", noThreshold).earlyResolutionVoteThreshold,
    ).toBeNull();
  });
});

describe("buildProposalListItem", () => {
  it("derives status=executed for the real resolved proposal", () => {
    const core = parseRawProposalCore("200", REAL_RAW_PROPOSAL);
    const item = buildProposalListItem(
      core,
      { verified: false, reason: "not fetched in this test" },
      0n,
    );
    expect(item.status).toBe("executed");
    expect(item.yesVotes).toBe(36993524951380141n);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/parse-raw-proposal.test.ts`
Expected: FAIL — `Cannot find module '~/lib/governance/parse-raw-proposal'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/governance/parse-raw-proposal.ts
import { deriveProposalStatus } from "~/lib/governance/status";
import type {
  MetadataVerificationResult,
  ProposalListItem,
  RawProposal,
} from "~/lib/governance/types";

function findMetadataEntry(raw: RawProposal, key: string): string | null {
  const entry = raw.metadata.data.find((e) => e.key === key);
  return entry ? entry.value : null;
}

/** Hex-decodes a 0x-prefixed metadata_location value into its UTF-8 URL string. */
export function decodeMetadataLocation(hexValue: string): string {
  const clean = hexValue.startsWith("0x") ? hexValue.slice(2) : hexValue;
  return Buffer.from(clean, "hex").toString("utf8");
}

export interface ParsedProposalCore {
  proposalId: string;
  proposer: string;
  isResolved: boolean;
  creationTimeSecs: bigint;
  expirationSecs: bigint;
  resolutionTimeSecs: bigint | null;
  minVoteThreshold: bigint;
  earlyResolutionVoteThreshold: bigint | null;
  yesVotes: bigint;
  noVotes: bigint;
  executionHash: string;
  /** Decoded URL, ready to fetch — NOT the raw hex. */
  metadataLocation: string | null;
  /** Left as the raw on-chain hex string (hex-of-ASCII-hex-digest) —
   *  pass this directly to fetchAndVerifyProposalMetadata, which does
   *  its own decode. Do not pre-decode this one. */
  metadataHashHex: string | null;
}

/**
 * Converts the exact on-chain wire shape (RawProposal, all-string
 * numerics, confirmed against a real mainnet proposal) into typed
 * bigints, and extracts the metadata_location / metadata_hash fields.
 * Pure — no network access — so it's fully unit-testable.
 */
export function parseRawProposalCore(
  proposalId: string,
  raw: RawProposal,
): ParsedProposalCore {
  const metadataLocationHex = findMetadataEntry(raw, "metadata_location");
  const metadataHashHex = findMetadataEntry(raw, "metadata_hash");

  return {
    proposalId,
    proposer: raw.proposer,
    isResolved: raw.is_resolved,
    creationTimeSecs: BigInt(raw.creation_time_secs),
    expirationSecs: BigInt(raw.expiration_secs),
    resolutionTimeSecs:
      raw.is_resolved && raw.resolution_time_secs !== "0"
        ? BigInt(raw.resolution_time_secs)
        : null,
    minVoteThreshold: BigInt(raw.min_vote_threshold),
    earlyResolutionVoteThreshold:
      raw.early_resolution_vote_threshold.vec.length > 0
        ? BigInt(raw.early_resolution_vote_threshold.vec[0])
        : null,
    yesVotes: BigInt(raw.yes_votes),
    noVotes: BigInt(raw.no_votes),
    executionHash: raw.execution_hash,
    metadataLocation: metadataLocationHex
      ? decodeMetadataLocation(metadataLocationHex)
      : null,
    metadataHashHex,
  };
}

/**
 * Combines the parsed core fields with a resolved metadata verification
 * result and the current time to produce the final UI-facing
 * ProposalListItem, including its derived status.
 */
export function buildProposalListItem(
  core: ParsedProposalCore,
  metadataResult: MetadataVerificationResult,
  nowSecs: bigint,
): ProposalListItem {
  return {
    proposalId: core.proposalId,
    proposer: core.proposer,
    status: deriveProposalStatus({
      isResolved: core.isResolved,
      yesVotes: core.yesVotes,
      noVotes: core.noVotes,
      minVoteThreshold: core.minVoteThreshold,
      earlyResolutionVoteThreshold: core.earlyResolutionVoteThreshold,
      expirationSecs: core.expirationSecs,
      nowSecs,
    }),
    creationTimeSecs: core.creationTimeSecs,
    expirationSecs: core.expirationSecs,
    resolutionTimeSecs: core.resolutionTimeSecs,
    minVoteThreshold: core.minVoteThreshold,
    earlyResolutionVoteThreshold: core.earlyResolutionVoteThreshold,
    yesVotes: core.yesVotes,
    noVotes: core.noVotes,
    executionHash: core.executionHash,
    metadataLocation: core.metadataLocation,
    metadataHashHex: core.metadataHashHex,
    metadataResult,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/parse-raw-proposal.test.ts`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/governance/parse-raw-proposal.ts tests/unit/parse-raw-proposal.test.ts
git commit -m "Add pure parser for raw on-chain proposal data (real mainnet fixture)"
```

---

### Task 9: Server function — list proposals

**Files:**
- Create: `src/lib/governance/fetch-proposals.ts`

**Interfaces:**
- Consumes: `getAptosClient`, `VOTING_FORUM_RESOURCE_TYPE`, `VOTING_FORUM_PROPOSAL_VALUE_TYPE`, `APTOS_GOVERNANCE_ADDRESS` (Task 2); `fetchAndVerifyProposalMetadata` (Task 4); `parseRawProposalCore`, `buildProposalListItem` (Task 8).
- Produces: `listProposals` (a `createServerFn`) — called from Task 12's route loader as `listProposals({ data: { page } })`.

This is thin orchestration over already-unit-tested pieces (status derivation, metadata verification, parsing) plus live SDK calls, so it is verified by running the dev server rather than a heavily-mocked unit test (mocking the entire `Aptos` SDK class would test the mock, not the integration). Runtime verification happens in Task 12 once this is wired into the `/` route.

- [ ] **Step 1: Create `src/lib/governance/fetch-proposals.ts`**

```ts
// src/lib/governance/fetch-proposals.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  APTOS_GOVERNANCE_ADDRESS,
  getAptosClient,
  VOTING_FORUM_PROPOSAL_VALUE_TYPE,
  VOTING_FORUM_RESOURCE_TYPE,
} from "~/lib/aptos/client";
import { fetchAndVerifyProposalMetadata } from "~/lib/governance/metadata";
import {
  buildProposalListItem,
  parseRawProposalCore,
} from "~/lib/governance/parse-raw-proposal";
import type { ProposalListItem, RawProposal } from "~/lib/governance/types";

const PAGE_SIZE = 20;

const listProposalsInputSchema = z.object({
  page: z.number().int().min(0).default(0),
});

interface VotingForumResource {
  next_proposal_id: string;
  proposals: { handle: string };
}

export interface ListProposalsResult {
  items: ProposalListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/**
 * Lists proposals most-recent-first. Proposal ids are sequential from 0
 * to next_proposal_id - 1 (confirmed against the live VotingForum
 * resource on mainnet on 2026-08-20) — "listing" means picking a slice
 * of that id range and fetching each proposal from the proposals table.
 */
export const listProposals = createServerFn({ method: "GET" })
  .validator(listProposalsInputSchema)
  .handler(async ({ data }): Promise<ListProposalsResult> => {
    const aptos = getAptosClient();

    const forum = await aptos.getAccountResource<VotingForumResource>({
      accountAddress: APTOS_GOVERNANCE_ADDRESS,
      resourceType: VOTING_FORUM_RESOURCE_TYPE,
    });

    const totalCount = Number(forum.next_proposal_id);
    const nowSecs = BigInt(Math.floor(Date.now() / 1000));

    const highestId = totalCount - 1 - data.page * PAGE_SIZE;
    const lowestId = Math.max(0, highestId - PAGE_SIZE + 1);

    if (highestId < 0) {
      return { items: [], totalCount, page: data.page, pageSize: PAGE_SIZE };
    }

    const ids: number[] = [];
    for (let id = highestId; id >= lowestId; id--) {
      ids.push(id);
    }

    const items = await Promise.all(
      ids.map(async (id) => {
        const raw = await aptos.getTableItem<RawProposal>({
          handle: forum.proposals.handle,
          data: {
            key_type: "u64",
            value_type: VOTING_FORUM_PROPOSAL_VALUE_TYPE,
            key: id.toString(),
          },
        });

        const core = parseRawProposalCore(id.toString(), raw);

        const metadataResult =
          core.metadataLocation && core.metadataHashHex
            ? await fetchAndVerifyProposalMetadata(
                core.metadataLocation,
                core.metadataHashHex,
              )
            : {
                verified: false as const,
                reason: "proposal has no metadata_location/metadata_hash set",
              };

        return buildProposalListItem(core, metadataResult, nowSecs);
      }),
    );

    return { items, totalCount, page: data.page, pageSize: PAGE_SIZE };
  });
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/governance/fetch-proposals.ts
git commit -m "Add listProposals server function"
```

---

### Task 10: Server function — single proposal detail + votes

**Files:**
- Create: `src/lib/governance/fetch-proposal.ts`

**Interfaces:**
- Consumes: same as Task 9, plus `fetchProposalVotes`, `ProposalVoteRow` (Task 6).
- Produces: `getProposalDetail` (a `createServerFn`) — called from Task 13's route loader as `getProposalDetail({ data: { proposalId } })`.

- [ ] **Step 1: Create `src/lib/governance/fetch-proposal.ts`**

```ts
// src/lib/governance/fetch-proposal.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  APTOS_GOVERNANCE_ADDRESS,
  getAptosClient,
  VOTING_FORUM_PROPOSAL_VALUE_TYPE,
  VOTING_FORUM_RESOURCE_TYPE,
} from "~/lib/aptos/client";
import {
  fetchProposalVotes,
  type ProposalVoteRow,
} from "~/lib/governance/fetch-proposal-votes";
import { fetchAndVerifyProposalMetadata } from "~/lib/governance/metadata";
import {
  buildProposalListItem,
  parseRawProposalCore,
} from "~/lib/governance/parse-raw-proposal";
import type { ProposalListItem, RawProposal } from "~/lib/governance/types";

const getProposalInputSchema = z.object({
  proposalId: z
    .string()
    .regex(/^\d+$/, "proposalId must be a non-negative integer string"),
});

interface VotingForumResource {
  next_proposal_id: string;
  proposals: { handle: string };
}

export interface ProposalDetailResult {
  proposal: ProposalListItem;
  votes: ProposalVoteRow[];
}

export const getProposalDetail = createServerFn({ method: "GET" })
  .validator(getProposalInputSchema)
  .handler(async ({ data }): Promise<ProposalDetailResult> => {
    const aptos = getAptosClient();

    const forum = await aptos.getAccountResource<VotingForumResource>({
      accountAddress: APTOS_GOVERNANCE_ADDRESS,
      resourceType: VOTING_FORUM_RESOURCE_TYPE,
    });

    const nextProposalId = BigInt(forum.next_proposal_id);
    if (BigInt(data.proposalId) >= nextProposalId) {
      throw new Error(
        `Proposal ${data.proposalId} does not exist (only 0..${(nextProposalId - 1n).toString()} exist)`,
      );
    }

    const [raw, votes] = await Promise.all([
      aptos.getTableItem<RawProposal>({
        handle: forum.proposals.handle,
        data: {
          key_type: "u64",
          value_type: VOTING_FORUM_PROPOSAL_VALUE_TYPE,
          key: data.proposalId,
        },
      }),
      // Indexer failure degrades to an empty vote list rather than
      // failing the whole page — the fullnode-sourced yes/no tally
      // fetched above remains authoritative either way (design spec §6.3).
      fetchProposalVotes(data.proposalId).catch(() => [] as ProposalVoteRow[]),
    ]);

    const core = parseRawProposalCore(data.proposalId, raw);
    const nowSecs = BigInt(Math.floor(Date.now() / 1000));

    const metadataResult =
      core.metadataLocation && core.metadataHashHex
        ? await fetchAndVerifyProposalMetadata(
            core.metadataLocation,
            core.metadataHashHex,
          )
        : {
            verified: false as const,
            reason: "proposal has no metadata_location/metadata_hash set",
          };

    return {
      proposal: buildProposalListItem(core, metadataResult, nowSecs),
      votes,
    };
  });
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/governance/fetch-proposal.ts
git commit -m "Add getProposalDetail server function"
```


---

### Task 11: StatusBadge and VoteBar components (TDD)

**Files:**
- Create: `src/components/StatusBadge.tsx`
- Create: `src/components/VoteBar.tsx`
- Test: `tests/unit/StatusBadge.test.tsx`
- Test: `tests/unit/VoteBar.test.tsx`

**Interfaces:**
- Consumes: `ProposalStatus` from `src/lib/governance/types.ts` (Task 2); `formatOctasToApt` from `src/lib/governance/format.ts` (Task 5).
- Produces: `<StatusBadge status={ProposalStatus} />`; `<VoteBar yesVotes={bigint} noVotes={bigint} minVoteThreshold={bigint} />` — used by Task 12 (`ProposalCard.tsx`) and Task 13 (proposal detail route).
- These render the `aptos-design-system` governance-extension tokens exactly (active=Baby Blue, passed=Mint, executed=Graphite/dark, failed=Coral) — per the Global Constraints, no new hex codes are introduced here; every color is one of the CSS variables defined in Task 1's `app.css`.

This project needs a component-testing setup that doesn't exist yet (Tasks 1–10 only needed Node-environment Vitest). Add `@testing-library/react` and a `jsdom` environment override for these two test files only, via a per-file environment comment, to avoid forcing `jsdom` on every other test.

- [ ] **Step 1: Add component-testing dependencies**

```bash
pnpm add -D @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Write the failing test for StatusBadge**

```tsx
// tests/unit/StatusBadge.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "~/components/StatusBadge";

describe("StatusBadge", () => {
  it("renders 'Active' for active status", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders 'Passed' for passed status", () => {
    render(<StatusBadge status="passed" />);
    expect(screen.getByText("Passed")).toBeInTheDocument();
  });

  it("renders 'Executed' for executed status", () => {
    render(<StatusBadge status="executed" />);
    expect(screen.getByText("Executed")).toBeInTheDocument();
  });

  it("renders 'Failed' for failed status", () => {
    render(<StatusBadge status="failed" />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("applies the design-system fill color as a CSS variable, not a hardcoded hex", () => {
    render(<StatusBadge status="active" />);
    const badge = screen.getByText("Active");
    expect(badge.style.backgroundColor).toBe("var(--color-status-active-fill)");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/StatusBadge.test.tsx`
Expected: FAIL — `Cannot find module '~/components/StatusBadge'`.

- [ ] **Step 4: Write minimal implementation**

```tsx
// src/components/StatusBadge.tsx
import type { ProposalStatus } from "~/lib/governance/types";

const STATUS_LABEL: Record<ProposalStatus, string> = {
  active: "Active",
  passed: "Passed",
  executed: "Executed",
  failed: "Failed",
};

const STATUS_FILL_VAR: Record<ProposalStatus, string> = {
  active: "var(--color-status-active-fill)",
  passed: "var(--color-status-passed-fill)",
  executed: "var(--color-status-executed-fill)",
  failed: "var(--color-status-failed-fill)",
};

const STATUS_TEXT_VAR: Record<ProposalStatus, string> = {
  active: "var(--color-text-primary)",
  passed: "var(--color-text-primary)",
  executed: "var(--color-status-executed-text)",
  failed: "var(--color-text-primary)",
};

export function StatusBadge({ status }: { status: ProposalStatus }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: STATUS_FILL_VAR[status],
        color: STATUS_TEXT_VAR[status],
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/StatusBadge.test.tsx`
Expected: PASS — all 5 tests green.

- [ ] **Step 6: Write the failing test for VoteBar**

```tsx
// tests/unit/VoteBar.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VoteBar } from "~/components/VoteBar";

describe("VoteBar", () => {
  it("renders formatted yes and no vote totals", () => {
    render(
      <VoteBar
        yesVotes={100_00000000n}
        noVotes={20_00000000n}
        minVoteThreshold={50_00000000n}
      />,
    );
    expect(screen.getByText(/100 APT for/i)).toBeInTheDocument();
    expect(screen.getByText(/20 APT against/i)).toBeInTheDocument();
  });

  it("shows a threshold-met indicator when total votes exceed the minimum", () => {
    render(
      <VoteBar
        yesVotes={100_00000000n}
        noVotes={20_00000000n}
        minVoteThreshold={50_00000000n}
      />,
    );
    expect(screen.getByText(/threshold met/i)).toBeInTheDocument();
  });

  it("shows a threshold-not-met indicator when total votes are below the minimum", () => {
    render(
      <VoteBar yesVotes={10_00000000n} noVotes={5_00000000n} minVoteThreshold={50_00000000n} />,
    );
    expect(screen.getByText(/threshold not yet met/i)).toBeInTheDocument();
  });

  it("renders a zero-width bar without dividing by zero when there are no votes", () => {
    render(<VoteBar yesVotes={0n} noVotes={0n} minVoteThreshold={100n} />);
    expect(screen.getByText(/0 APT for/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/VoteBar.test.tsx`
Expected: FAIL — `Cannot find module '~/components/VoteBar'`.

- [ ] **Step 8: Write minimal implementation**

```tsx
// src/components/VoteBar.tsx
import { formatOctasToApt } from "~/lib/governance/format";

export function VoteBar({
  yesVotes,
  noVotes,
  minVoteThreshold,
}: {
  yesVotes: bigint;
  noVotes: bigint;
  minVoteThreshold: bigint;
}) {
  const total = yesVotes + noVotes;
  const yesPct = total > 0n ? Number((yesVotes * 1000n) / total) / 10 : 0;
  const noPct = total > 0n ? Number((noVotes * 1000n) / total) / 10 : 0;
  const thresholdMet = total >= minVoteThreshold;

  return (
    <div>
      <div
        className="flex h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--color-border-light)" }}
      >
        <div
          style={{ width: `${yesPct}%`, backgroundColor: "var(--color-status-passed-fill)" }}
        />
        <div
          style={{ width: `${noPct}%`, backgroundColor: "var(--color-status-failed-fill)" }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-[var(--color-text-secondary)]">
        <span>
          {formatOctasToApt(yesVotes)} APT for &middot; {formatOctasToApt(noVotes)} APT against
        </span>
        <span>{thresholdMet ? "Threshold met" : "Threshold not yet met"}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/VoteBar.test.tsx`
Expected: PASS — all 4 tests green.

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-lock.yaml src/components/StatusBadge.tsx src/components/VoteBar.tsx tests/unit/StatusBadge.test.tsx tests/unit/VoteBar.test.tsx
git commit -m "Add StatusBadge and VoteBar components"
```


---

### Task 12: ProposalCard component and the proposal list route

**Files:**
- Modify: `src/lib/governance/format.ts` (add `formatDurationCompact`)
- Modify: `tests/unit/format.test.ts` (add its tests)
- Create: `src/components/ProposalCard.tsx`
- Test: `tests/unit/ProposalCard.test.tsx`
- Modify: `src/routes/index.tsx` (replace the Task 1 placeholder with the real list)

**Interfaces:**
- Consumes: `StatusBadge` (Task 11), `VoteBar` (Task 11), `formatOctasToApt`/`truncateAddress` (Task 5), `listProposals`/`ListProposalsResult` (Task 9), `ProposalListItem` (Task 2).
- Produces: `<ProposalCard proposal={ProposalListItem} nowSecs={bigint} />`; the `/` route now server-loads and renders real proposals.

- [ ] **Step 1: Write the failing test for `formatDurationCompact`**

Append to `tests/unit/format.test.ts`:

```ts
import { formatDurationCompact } from "~/lib/governance/format";

describe("formatDurationCompact", () => {
  it("formats days and hours", () => {
    expect(formatDurationCompact(2n * 86400n + 14n * 3600n)).toBe("2d 14h");
  });

  it("formats hours and minutes when under a day", () => {
    expect(formatDurationCompact(3n * 3600n + 25n * 60n)).toBe("3h 25m");
  });

  it("formats minutes only when under an hour", () => {
    expect(formatDurationCompact(45n * 60n)).toBe("45m");
  });

  it("floors negative durations to 0m rather than showing a negative sign", () => {
    expect(formatDurationCompact(-100n)).toBe("0m");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/format.test.ts`
Expected: FAIL — `formatDurationCompact is not exported from '~/lib/governance/format'`.

- [ ] **Step 3: Add `formatDurationCompact` to `src/lib/governance/format.ts`**

Append to the existing file (do not remove `formatOctasToApt` or `truncateAddress`):

```ts
/**
 * Formats a duration in seconds as a compact "2d 14h" / "3h 25m" / "45m"
 * string. Negative durations (e.g. an already-passed expiration) floor
 * to "0m" rather than displaying a confusing negative value.
 */
export function formatDurationCompact(totalSeconds: bigint): string {
  const seconds = totalSeconds < 0n ? 0n : totalSeconds;
  const days = seconds / 86400n;
  const hours = (seconds % 86400n) / 3600n;
  const minutes = (seconds % 3600n) / 60n;

  if (days > 0n) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0n) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/format.test.ts`
Expected: PASS — all 11 tests in this file green (7 from Task 5 + 4 new).

- [ ] **Step 5: Write the failing test for `ProposalCard`**

`ProposalCard` renders a TanStack Router `<Link>`, which throws
(`Cannot read properties of null (reading 'isServer')`) if rendered
outside a real router context — confirmed by reproducing this exact
failure and cross-checking the official `@tanstack/react-router` test
suite (`packages/react-router/tests/link.test.tsx`), which always wraps
`<Link>`-rendering components in `<RouterProvider router={...}>` with a
memory history, never a bare `render()`. Do not use a bare `render()`
call for this component — build a minimal two-route tree (index route +
the `/proposal/$proposalId` route the card links to) and render through
`RouterProvider`, matching the shared `renderWithRouter` helper below.

```tsx
// tests/unit/ProposalCard.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { ProposalCard } from "~/components/ProposalCard";
import type { ProposalListItem } from "~/lib/governance/types";

// jsdom does not implement window.scrollTo — TanStack Router's scroll
// restoration calls it on every render, which otherwise logs
// "Not implemented: Window's scrollTo() method" noise to stderr on
// every test in this file. Stub it so test output stays pristine.
beforeAll(() => {
  window.scrollTo = () => {};
});

const baseProposal: ProposalListItem = {
  proposalId: "142",
  proposer: "0xabc",
  status: "active",
  creationTimeSecs: 0n,
  expirationSecs: 1000n,
  resolutionTimeSecs: null,
  minVoteThreshold: 100n,
  earlyResolutionVoteThreshold: null,
  yesVotes: 80n,
  noVotes: 10n,
  executionHash: "0x00",
  metadataLocation: "https://example.com/meta.json",
  metadataHashHex: "0xdead",
  metadataResult: {
    verified: true,
    metadata: {
      title: "Aptos Improvement Proposal 142",
      description: "desc",
      source_code_url: "https://example.com/src",
      discussion_url: "https://example.com/discuss",
    },
  },
};

/**
 * Renders a component that uses TanStack Router's <Link> inside a real
 * (memory-history) router, since Link throws when rendered outside a
 * RouterProvider. Builds just enough of a route tree (index route +
 * the proposal-detail route ProposalCard links to) for the component
 * under test to resolve its <Link to="/proposal/$proposalId">.
 */
function renderWithRouter(ui: React.ReactElement) {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => ui,
  });
  const proposalRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/proposal/$proposalId",
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, proposalRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("ProposalCard", () => {
  afterEach(cleanup);

  it("renders the verified title, id, and status", async () => {
    renderWithRouter(<ProposalCard proposal={baseProposal} nowSecs={500n} />);
    expect(
      await screen.findByText("Aptos Improvement Proposal 142"),
    ).toBeInTheDocument();
    expect(screen.getByText("#142")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows time remaining for an active proposal", async () => {
    renderWithRouter(<ProposalCard proposal={baseProposal} nowSecs={500n} />);
    expect(await screen.findByText(/ends in/i)).toBeInTheDocument();
  });

  it("shows a generic fallback title when metadata is unverified", async () => {
    const unverified: ProposalListItem = {
      ...baseProposal,
      metadataResult: { verified: false, reason: "hash mismatch" },
    };
    renderWithRouter(<ProposalCard proposal={unverified} nowSecs={500n} />);
    expect(await screen.findByText(/proposal #142/i)).toBeInTheDocument();
    expect(screen.getByText(/metadata unverified/i)).toBeInTheDocument();
  });

  it("links to the proposal detail page", async () => {
    renderWithRouter(<ProposalCard proposal={baseProposal} nowSecs={500n} />);
    const link = await screen.findByRole("link");
    expect(link).toHaveAttribute("href", "/proposal/142");
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/ProposalCard.test.tsx`
Expected: FAIL — `Cannot find module '~/components/ProposalCard'`.

- [ ] **Step 7: Write minimal implementation**

```tsx
// src/components/ProposalCard.tsx
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "~/components/StatusBadge";
import { VoteBar } from "~/components/VoteBar";
import { formatDurationCompact } from "~/lib/governance/format";
import type { ProposalListItem } from "~/lib/governance/types";

function describeTiming(proposal: ProposalListItem, nowSecs: bigint): string {
  switch (proposal.status) {
    case "active":
      return `ends in ${formatDurationCompact(proposal.expirationSecs - nowSecs)}`;
    case "executed":
      return proposal.resolutionTimeSecs
        ? `executed ${formatDurationCompact(nowSecs - proposal.resolutionTimeSecs)} ago`
        : "executed";
    case "passed":
      return "passed — awaiting execution";
    case "failed":
      return `voting ended ${formatDurationCompact(nowSecs - proposal.expirationSecs)} ago`;
  }
}

export function ProposalCard({
  proposal,
  nowSecs,
}: {
  proposal: ProposalListItem;
  nowSecs: bigint;
}) {
  const title = proposal.metadataResult.verified
    ? proposal.metadataResult.metadata.title
    : `Proposal #${proposal.proposalId}`;

  return (
    <Link
      to="/proposal/$proposalId"
      params={{ proposalId: proposal.proposalId }}
      className="block rounded-xl border border-[var(--color-border-light)] bg-[var(--color-paper)] p-5 hover:border-[var(--color-border)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <StatusBadge status={proposal.status} />
            <span className="font-mono text-sm text-[var(--color-text-primary)] opacity-50">
              #{proposal.proposalId}
            </span>
          </div>
          <div className="truncate text-base font-semibold">{title}</div>
          <div className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            {describeTiming(proposal, nowSecs)}
            {!proposal.metadataResult.verified && (
              <span className="ml-2 font-semibold text-[var(--color-error)]">
                Metadata unverified
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <VoteBar
          yesVotes={proposal.yesVotes}
          noVotes={proposal.noVotes}
          minVoteThreshold={proposal.minVoteThreshold}
        />
      </div>
    </Link>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/ProposalCard.test.tsx`
Expected: PASS — all 4 tests green.

- [ ] **Step 9: Replace `src/routes/index.tsx` with the real proposal list, including the status filter chips required by design spec §6.1/§6.2**

Filtering happens client-side over the current page's already-fetched items (`PAGE_SIZE` is only 20 — see Task 9), driven by a `status` search param so the filter is shareable/bookmarkable via URL, matching how `page` is already handled.

```tsx
// src/routes/index.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ProposalCard } from "~/components/ProposalCard";
import { listProposals } from "~/lib/governance/fetch-proposals";
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
    </main>
  );
}
```

- [ ] **Step 10: Create a placeholder `src/routes/proposal.$proposalId.tsx`**

`ProposalCard` renders `<Link to="/proposal/$proposalId">` (Task 7's
plan text), but that route isn't fully implemented until Task 13 —
TanStack Router's type-safe routing requires the route to exist in the
generated route tree (`src/routeTree.gen.ts`, auto-generated by the Vite
plugin) for this file to typecheck at all; without it, both
`ProposalCard.tsx` and this route's own `search={...}` link fail to
compile with real TypeScript errors, not just a lint warning. Create a
minimal, clearly-marked placeholder now; Task 13 replaces its contents
entirely with the real implementation.

```tsx
// src/routes/proposal.$proposalId.tsx
// PLACEHOLDER — created ahead of schedule by Task 12 because
// ProposalCard's <Link to="/proposal/$proposalId"> requires this route
// to exist in the generated route tree for TanStack Router's type-safe
// routing to compile (Task 13 is what fully implements this route with
// real proposal-detail content). Task 13 REPLACES this file's contents
// entirely — do not treat this as the real implementation, and do not
// skip Task 13 because this file exists.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/proposal/$proposalId")({
  component: () => null,
});
```

Run `pnpm dev` briefly (or `pnpm typecheck` after a dev-server boot) so
the TanStack Start Vite plugin regenerates `src/routeTree.gen.ts` to
include this new route — it will not update until the dev server (or a
build) runs at least once after the file is added.

- [ ] **Step 11: Verify against a live dev server**

Run: `pnpm typecheck`
Expected: no errors — confirms both the `search` reducer type fix above and the new placeholder route resolve cleanly.

Run: `pnpm dev`, then in another terminal: `curl -s http://localhost:3000/ | grep -o '#[0-9]\+' | head -5`
Expected: real mainnet proposal ids appear in the rendered HTML (e.g. `#204`, `#203`, ...) — confirms the SSR loader is actually reaching mainnet and rendering server-side, not just returning an empty shell.

Run: `curl -s "http://localhost:3000/?status=executed" | grep -o '#[0-9]\+' | head -5`
Expected: only executed proposals' ids appear — confirms the filter chips actually narrow the rendered list, not just cosmetically render.

- [ ] **Step 12: Commit**

```bash
git add src/lib/governance/format.ts tests/unit/format.test.ts src/components/ProposalCard.tsx tests/unit/ProposalCard.test.tsx src/routes/index.tsx src/routes/proposal.\$proposalId.tsx src/routeTree.gen.ts
git commit -m "Add ProposalCard, status filter chips, and wire the real proposal list into the / route"
```


---

### Task 13: Proposal detail route, MetadataVerifiedNotice, and voter table

**Files:**
- Create: `src/components/MetadataVerifiedNotice.tsx`
- Test: `tests/unit/MetadataVerifiedNotice.test.tsx`
- Replace: `src/routes/proposal.$proposalId.tsx` (Task 12 created a minimal placeholder here so `ProposalCard`'s type-safe `<Link>` would compile — this task replaces its contents entirely with the real implementation, it does not create the file fresh)

**Interfaces:**
- Consumes: `StatusBadge`, `VoteBar` (Task 11); `formatOctasToApt`, `truncateAddress`, `formatDurationCompact` (Tasks 5/12); `getProposalDetail`, `ProposalDetailResult` (Task 10); `PROPOSAL_VOTES_PAGE_SIZE` (Task 6, just added above); `ProposalListItem`, `MetadataVerificationResult` (Task 2).
- Produces: `<MetadataVerifiedNotice result={MetadataVerificationResult} />`; the `/proposal/:proposalId` route, fully server-rendered with real data. The `VotingPanel` slot in this route is a placeholder in this task — Task 16 replaces it once the wallet boundary (Task 14) and connect button (Task 15) exist.

- [ ] **Step 1: Write the failing test for MetadataVerifiedNotice**

```tsx
// tests/unit/MetadataVerifiedNotice.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetadataVerifiedNotice } from "~/components/MetadataVerifiedNotice";

describe("MetadataVerifiedNotice", () => {
  it("shows nothing alarming and renders the verified description when verified", () => {
    render(
      <MetadataVerifiedNotice
        result={{
          verified: true,
          metadata: {
            title: "T",
            description: "A verified description.",
            source_code_url: "https://example.com/src",
            discussion_url: "https://example.com/discuss",
          },
        }}
      />,
    );
    expect(screen.getByText("A verified description.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /source/i })).toHaveAttribute(
      "href",
      "https://example.com/src",
    );
    expect(screen.getByRole("link", { name: /discussion/i })).toHaveAttribute(
      "href",
      "https://example.com/discuss",
    );
    expect(screen.queryByText(/unverified/i)).not.toBeInTheDocument();
  });

  it("shows an explicit warning and the failure reason when unverified", () => {
    render(
      <MetadataVerifiedNotice
        result={{ verified: false, reason: "metadata hash mismatch: ..." }}
      />,
    );
    expect(screen.getByText(/unverified/i)).toBeInTheDocument();
    expect(screen.getByText(/hash mismatch/i)).toBeInTheDocument();
  });

  it("never renders raw HTML from the description — only text", () => {
    render(
      <MetadataVerifiedNotice
        result={{
          verified: true,
          metadata: {
            title: "T",
            description: "<img src=x onerror=alert(1)>",
            source_code_url: "https://example.com/src",
            discussion_url: "https://example.com/discuss",
          },
        }}
      />,
    );
    // The literal tag text should appear as text content, not be parsed as an element.
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector("img")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/MetadataVerifiedNotice.test.tsx`
Expected: FAIL — `Cannot find module '~/components/MetadataVerifiedNotice'`.

- [ ] **Step 3: Write minimal implementation**

React escapes text content by default (no `dangerouslySetInnerHTML` anywhere here), which is what satisfies the "never render raw HTML from metadata" requirement from the design spec §5.3/§6.3 — the test above locks that in.

```tsx
// src/components/MetadataVerifiedNotice.tsx
import type { MetadataVerificationResult } from "~/lib/governance/types";

export function MetadataVerifiedNotice({
  result,
}: {
  result: MetadataVerificationResult;
}) {
  if (!result.verified) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-[var(--color-error)] bg-[var(--color-error)]/10 p-4"
      >
        <p className="font-semibold text-[var(--color-error)]">
          Metadata unverified
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          This proposal's off-chain metadata could not be verified against
          its on-chain hash and is not shown. Reason: {result.reason}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Plain text content only — React escapes this, never parsed as HTML. */}
      <p className="whitespace-pre-wrap text-[var(--color-text-primary)]">
        {result.metadata.description}
      </p>
      <div className="mt-4 flex gap-4 text-sm">
        <a
          href={result.metadata.source_code_url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-[var(--color-info)] underline"
        >
          Source code
        </a>
        <a
          href={result.metadata.discussion_url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-[var(--color-info)] underline"
        >
          Discussion
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/MetadataVerifiedNotice.test.tsx`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Create `src/routes/proposal.$proposalId.tsx`**

```tsx
// src/routes/proposal.$proposalId.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StatusBadge } from "~/components/StatusBadge";
import { VoteBar } from "~/components/VoteBar";
import { MetadataVerifiedNotice } from "~/components/MetadataVerifiedNotice";
import {
  formatDurationCompact,
  formatOctasToApt,
  truncateAddress,
} from "~/lib/governance/format";
import { getProposalDetail } from "~/lib/governance/fetch-proposal";
import { PROPOSAL_VOTES_PAGE_SIZE } from "~/lib/governance/fetch-proposal-votes";

export const Route = createFileRoute("/proposal/$proposalId")({
  loader: ({ params }) =>
    getProposalDetail({ data: { proposalId: params.proposalId } }),
  component: ProposalDetail,
});

function ProposalDetail() {
  const initialData = Route.useLoaderData();
  const { proposalId } = Route.useParams();

  const { data } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => getProposalDetail({ data: { proposalId } }),
    initialData,
    refetchInterval: 30_000,
  });

  const { proposal, votes } = data;
  const nowSecs = BigInt(Math.floor(Date.now() / 1000));
  const title = proposal.metadataResult.verified
    ? proposal.metadataResult.metadata.title
    : `Proposal #${proposal.proposalId}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        to="/"
        className="text-sm text-[var(--color-text-secondary)] underline"
      >
        ← All proposals
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <StatusBadge status={proposal.status} />
        <span className="font-mono text-sm opacity-50">
          #{proposal.proposalId}
        </span>
      </div>
      <h1 className="mt-1 font-serif text-3xl font-semibold">{title}</h1>

      <div className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Proposed by{" "}
        <a
          href={`https://explorer.aptoslabs.com/account/${proposal.proposer}?network=mainnet`}
          target="_blank"
          rel="noreferrer noopener"
          className="underline"
        >
          {truncateAddress(proposal.proposer)}
        </a>
        {proposal.status === "active" &&
          ` · ends in ${formatDurationCompact(proposal.expirationSecs - nowSecs)}`}
      </div>

      <section className="mt-6">
        <MetadataVerifiedNotice result={proposal.metadataResult} />
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold">Votes</h2>
        <div className="mt-3">
          <VoteBar
            yesVotes={proposal.yesVotes}
            noVotes={proposal.noVotes}
            minVoteThreshold={proposal.minVoteThreshold}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          Minimum vote threshold: {formatOctasToApt(proposal.minVoteThreshold, 0)} APT
          {proposal.earlyResolutionVoteThreshold &&
            ` · Early resolution at ${formatOctasToApt(proposal.earlyResolutionVoteThreshold, 0)} APT`}
        </p>
      </section>

      {/* Voting panel: replaced with the real wallet-connected panel in Task 16. */}
      <section className="mt-8 rounded-xl border border-[var(--color-border-light)] p-5">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Connect a wallet to vote on this proposal.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold">Voter breakdown</h2>
        {votes.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            No votes recorded yet, or the indexer is temporarily unavailable —
            the tally above reflects the authoritative on-chain count either
            way.
          </p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-secondary)]">
                <th className="pb-2 font-normal">Pool</th>
                <th className="pb-2 font-normal">Direction</th>
                <th className="pb-2 pr-0 text-right font-normal">
                  Voting power
                </th>
              </tr>
            </thead>
            <tbody>
              {votes.map((vote) => (
                <tr
                  key={vote.stakingPoolAddress}
                  className="border-t border-[var(--color-border-light)]"
                >
                  <td className="py-2 font-mono">
                    {truncateAddress(vote.stakingPoolAddress)}
                  </td>
                  <td className="py-2">
                    {vote.shouldPass ? "For" : "Against"}
                  </td>
                  <td className="py-2 text-right">
                    {formatOctasToApt(vote.numVotes)} APT
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {votes.length === PROPOSAL_VOTES_PAGE_SIZE && (
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            Showing the first {PROPOSAL_VOTES_PAGE_SIZE} voters by power —
            pagination beyond this page is not yet implemented.
          </p>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Verify against a live dev server**

Run: `pnpm dev`, then: `curl -s http://localhost:3000/proposal/200 | grep -o 'Enable transaction limits'`
Expected: the real verified title from mainnet proposal 200 appears in the server-rendered HTML, confirming the loader, metadata verification, and hash check all work end-to-end against production data.

Run: `curl -s http://localhost:3000/proposal/200 | grep -o 'Threshold met\|Threshold not yet met'`
Expected: one of the two strings appears (proposal 200 is resolved/executed with high turnout, so "Threshold met" is expected).

- [ ] **Step 7: Commit**

```bash
git add src/components/MetadataVerifiedNotice.tsx tests/unit/MetadataVerifiedNotice.test.tsx src/routes/proposal.\$proposalId.tsx
git commit -m "Add proposal detail route with verified metadata and voter table"
```


---

### Task 14: Client-only AIP-62 wallet adapter provider boundary

**Files:**
- Create: `src/lib/wallet/provider.tsx`
- Modify: `src/routes/__root.tsx` (wrap children in the provider)

**Interfaces:**
- Consumes: `@aptos-labs/wallet-adapter-react`'s `AptosWalletAdapterProvider`; `Network` from `@aptos-labs/ts-sdk`.
- Produces: `<AppWalletProvider>{children}</AppWalletProvider>` — a component that only ever runs its wallet-discovery logic in the browser. Used by `__root.tsx` here, and consumed via `useWallet()` in Task 15 (`WalletConnectButton`) and Task 16 (`VotingPanel`).

**Why this needs to be its own file (not just imported directly in `__root.tsx`):** `AptosWalletAdapterProvider` triggers AIP-62 wallet discovery (`window` event listeners, `navigator` checks) on mount. TanStack Start renders `__root.tsx` during SSR — if the provider mounted directly there, the server render would either crash (no `window`) or silently no-op in a way that's easy to miss. Isolating it in one file with an explicit `ClientOnly` boundary makes the client-only requirement impossible to accidentally bypass in a later edit, per design spec §4's "server never touches wallet APIs" rule.

- [ ] **Step 1: Create `src/lib/wallet/provider.tsx`**

```tsx
// src/lib/wallet/provider.tsx
import { ClientOnly } from "@tanstack/react-router";
import { Network } from "@aptos-labs/ts-sdk";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import type { ReactNode } from "react";

/**
 * AIP-62 wallet discovery runs entirely client-side (window event
 * listeners / navigator checks). ClientOnly guarantees this subtree
 * never executes during SSR — the server never touches wallet APIs,
 * per design spec §4. The fallback renders nothing extra during SSR
 * and initial hydration; children (route content) still render via
 * the fallback slot so pages aren't blank while wallet discovery boots.
 */
export function AppWalletProvider({ children }: { children: ReactNode }) {
  return (
    <ClientOnly fallback={<>{children}</>}>
      <AptosWalletAdapterProvider
        autoConnect
        dappConfig={{ network: Network.MAINNET }}
        onError={(error) => {
          // Non-fatal: connection/signing errors surface inline in the
          // components that triggered them (WalletConnectButton,
          // VotingPanel) — this is a last-resort console log only.
          console.error("[wallet-adapter]", error);
        }}
      >
        {children}
      </AptosWalletAdapterProvider>
    </ClientOnly>
  );
}
```

- [ ] **Step 2: Wire it into `src/routes/__root.tsx`**

```tsx
// src/routes/__root.tsx
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import appCss from "~/styles/app.css?url";
import { AppWalletProvider } from "~/lib/wallet/provider";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Aptos Gov" },
      {
        name: "description",
        content: "Delegated governance voting for the Aptos network.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <AppWalletProvider>
        <Outlet />
      </AppWalletProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify SSR still works and no wallet code runs server-side**

Run: `pnpm dev`, then: `curl -s http://localhost:3000/ | grep -c "window is not defined"`
Expected: `0` — confirms the server render didn't crash trying to access browser globals from the wallet adapter.

Run (in a browser, not curl — wallet discovery is a browser-only behavior): open `http://localhost:3000/`, open devtools console.
Expected: no uncaught errors; if a wallet extension (e.g. Petra) is installed, no crash occurs even though `useWallet()` isn't called by any component yet (that starts in Task 15).

- [ ] **Step 4: Commit**

```bash
git add src/lib/wallet/provider.tsx src/routes/__root.tsx
git commit -m "Add client-only AIP-62 wallet adapter provider boundary"
```


---

### Task 15: WalletConnectButton component

**Files:**
- Create: `src/components/WalletConnectButton.tsx`
- Test: `tests/unit/WalletConnectButton.test.tsx`

**Interfaces:**
- Consumes: `useWallet` from `@aptos-labs/wallet-adapter-react` (via the provider from Task 14); `truncateAddress` from `src/lib/governance/format.ts` (Task 5).
- Produces: `<WalletConnectButton />` — a self-contained connect/disconnect control. Used in Task 16's route header and reusable anywhere else in the app.

Per design spec §6.4/§2: Petra extension and Petra Web are featured first in the wallet list, but every AIP-62-registered wallet remains connectable — this component sorts, it never filters.

- [ ] **Step 1: Write the failing test**

`useWallet()` is mocked here since it depends on the live `AptosWalletAdapterProvider` context (exercised for real in Task 18's Playwright test, which runs in an actual browser with a test wallet).

```tsx
// tests/unit/WalletConnectButton.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WalletConnectButton } from "~/components/WalletConnectButton";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

vi.mock("@aptos-labs/wallet-adapter-react", async () => {
  const actual = await vi.importActual("@aptos-labs/wallet-adapter-react");
  return { ...actual, useWallet: vi.fn() };
});

const mockedUseWallet = vi.mocked(useWallet);

describe("WalletConnectButton", () => {
  it("shows a Connect Wallet button when disconnected", () => {
    mockedUseWallet.mockReturnValue({
      connected: false,
      account: null,
      wallets: [
        { name: "Petra", readyState: "Installed" },
        { name: "Nightly", readyState: "Installed" },
      ],
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as never);

    render(<WalletConnectButton />);
    expect(
      screen.getByRole("button", { name: /connect wallet/i }),
    ).toBeInTheDocument();
  });

  it("lists Petra and Petra Web before other wallets when the picker is open", () => {
    mockedUseWallet.mockReturnValue({
      connected: false,
      account: null,
      wallets: [
        { name: "Nightly", readyState: "Installed" },
        { name: "Petra Web", readyState: "Installed" },
        { name: "Backpack", readyState: "Installed" },
        { name: "Petra", readyState: "Installed" },
      ],
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as never);

    render(<WalletConnectButton />);
    fireEvent.click(screen.getByRole("button", { name: /connect wallet/i }));

    const items = screen.getAllByRole("menuitem").map((el) => el.textContent);
    expect(items[0]).toMatch(/Petra$/);
    expect(items[1]).toMatch(/Petra Web/);
  });

  it("calls connect with the clicked wallet's name", () => {
    const connect = vi.fn();
    mockedUseWallet.mockReturnValue({
      connected: false,
      account: null,
      wallets: [{ name: "Petra", readyState: "Installed" }],
      connect,
      disconnect: vi.fn(),
    } as never);

    render(<WalletConnectButton />);
    fireEvent.click(screen.getByRole("button", { name: /connect wallet/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Petra" }));
    expect(connect).toHaveBeenCalledWith("Petra");
  });

  it("shows the truncated address and a disconnect control when connected", () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: {
        address: "0xdb009ab1a3259c4b27a0d8ff9d0e913e13e4c8b657fc73768f4e9bb811c7a1d8",
      },
      wallets: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as never);

    render(<WalletConnectButton />);
    expect(screen.getByText("0xdb00...c7a1d8")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /disconnect/i }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/WalletConnectButton.test.tsx`
Expected: FAIL — `Cannot find module '~/components/WalletConnectButton'`.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/WalletConnectButton.tsx
import { useState } from "react";
import { useWallet, type WalletInfo } from "@aptos-labs/wallet-adapter-react";
import { truncateAddress } from "~/lib/governance/format";

const FEATURED_WALLETS = ["Petra", "Petra Web"];

function sortWithFeaturedFirst(wallets: readonly WalletInfo[]) {
  return [...wallets].sort((a, b) => {
    const aFeatured = FEATURED_WALLETS.indexOf(a.name);
    const bFeatured = FEATURED_WALLETS.indexOf(b.name);
    if (aFeatured === -1 && bFeatured === -1) return 0;
    if (aFeatured === -1) return 1;
    if (bFeatured === -1) return -1;
    return aFeatured - bFeatured;
  });
}

export function WalletConnectButton() {
  const { connected, account, wallets, connect, disconnect } = useWallet();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (connected && account) {
    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">
          {truncateAddress(account.address.toString())}
        </span>
        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-sm"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPickerOpen((open) => !open)}
        className="rounded-full bg-[var(--color-text-primary)] px-4 py-1.5 text-sm font-semibold text-[var(--color-canvas)]"
      >
        Connect Wallet
      </button>
      {pickerOpen && (
        <ul
          role="menu"
          className="absolute right-0 mt-2 w-48 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-paper)] p-1 shadow-lg"
        >
          {sortWithFeaturedFirst(wallets).map((wallet) => (
            <li key={wallet.name} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  connect(wallet.name);
                  setPickerOpen(false);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-border-light)]"
              >
                {wallet.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/WalletConnectButton.test.tsx`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Add the button to the root layout header**

Modify `src/routes/__root.tsx`'s `RootComponent` to include a simple header:

```tsx
function RootComponent() {
  return (
    <RootDocument>
      <AppWalletProvider>
        <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <a href="/" className="font-serif text-lg font-semibold">
            Aptos Gov
          </a>
          <WalletConnectButton />
        </header>
        <Outlet />
      </AppWalletProvider>
    </RootDocument>
  );
}
```

Add the import at the top of `src/routes/__root.tsx`:

```tsx
import { WalletConnectButton } from "~/components/WalletConnectButton";
```

- [ ] **Step 6: Commit**

```bash
git add src/components/WalletConnectButton.tsx tests/unit/WalletConnectButton.test.tsx src/routes/__root.tsx
git commit -m "Add WalletConnectButton with Petra/Petra Web featured first"
```


---

### Task 16: VotingPanel and vote transaction logic

**Files:**
- Create: `src/lib/governance/get-eligible-pools.ts` (thin server-fn wrapper around Task 7's `findEligiblePools`)
- Modify: `src/lib/governance/format.ts` (add `parseAptToOctas`, `clampVotingPowerOctas`)
- Modify: `tests/unit/format.test.ts` (add their tests)
- Create: `src/lib/governance/build-vote-payload.ts`
- Test: `tests/unit/build-vote-payload.test.ts`
- Create: `src/components/VotingPanel.tsx`
- Test: `tests/unit/VotingPanel.test.tsx`
- Modify: `src/routes/proposal.$proposalId.tsx` (replace the Task 13 placeholder panel)

**Interfaces:**
- Consumes: `EligiblePool`, `PoolKind` (Task 2); `findEligiblePools` (Task 7); `useWallet` (via Task 14's provider); `WalletConnectButton` context is separate (Task 15).
- Produces: `getEligiblePools` (server fn); `parseAptToOctas`, `clampVotingPowerOctas` (pure); `buildVoteTransactionPayload(pool, proposalId, amountOctas, shouldPass): InputTransactionData` (pure); `<VotingPanel proposalId={string} />`.

**Two deliberate design decisions made here, not silently assumed:**
1. **Always use the explicit-amount entry points** (`0x1::aptos_governance::partial_vote` for stake pools, `0x1::delegation_pool::vote` for delegation pools — the latter has no separate "vote all" function anyway) rather than `aptos_governance::vote`'s `MAX_U64` sugar. The source shows `vote()` calls `vote_internal(..., MAX_U64, ...)` internally, but its clamping behavior wasn't directly confirmed from source in this research pass. Using the fullnode-confirmed `remainingVotingPower` explicitly is strictly safer and more transparent — the number shown to the user in the review step is the exact number submitted, with no reliance on an unverified internal clamp.
2. **One transaction per pool**, matching the spec's per-pool review-then-approve UX (design spec §6.4). `batch_vote`/`batch_partial_vote` (multiple pools, one transaction) are explicitly optional/out of scope for this task — revisit only if user feedback shows the one-tx-per-pool flow is too slow for addresses with many pools.

- [ ] **Step 1: Create the `getEligiblePools` server function**

```ts
// src/lib/governance/get-eligible-pools.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findEligiblePools } from "~/lib/governance/fetch-eligible-pools";

const inputSchema = z.object({
  voterAddress: z.string().min(1),
  proposalId: z.string().regex(/^\d+$/),
});

/**
 * Thin server-fn wrapper around findEligiblePools (Task 7) so the
 * optional APTOS_BUILD_API_KEY env var and indexer calls stay
 * server-side, matching the pattern used by listProposals/getProposalDetail.
 * Called from the client (VotingPanel) once a wallet is connected —
 * unlike the list/detail server functions, this is never used as a
 * route loader, since it depends on the connected address.
 */
export const getEligiblePools = createServerFn({ method: "GET" })
  .validator(inputSchema)
  .handler(async ({ data }) => {
    const pools = await findEligiblePools(data.voterAddress, data.proposalId);
    // Serialize bigints as strings for the wire — server fns JSON-encode
    // their return value, and JSON has no native bigint support.
    return pools.map((pool) => ({
      ...pool,
      remainingVotingPower: pool.remainingVotingPower.toString(),
    }));
  });
```

- [ ] **Step 2: Write the failing test for the amount-parsing helpers**

Append to `tests/unit/format.test.ts`:

```ts
import { parseAptToOctas, clampVotingPowerOctas } from "~/lib/governance/format";

describe("parseAptToOctas", () => {
  it("parses a whole-number APT string", () => {
    expect(parseAptToOctas("5")).toBe(500_000_000n);
  });

  it("parses a fractional APT string", () => {
    expect(parseAptToOctas("1.5")).toBe(150_000_000n);
  });

  it("parses a comma-grouped APT string", () => {
    expect(parseAptToOctas("1,234.56")).toBe(123_456_000_000n);
  });

  it("returns null for empty input", () => {
    expect(parseAptToOctas("")).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(parseAptToOctas("abc")).toBeNull();
  });

  it("returns null for negative input", () => {
    expect(parseAptToOctas("-5")).toBeNull();
  });

  it("returns null for more than 8 fractional digits (finer than 1 octa)", () => {
    expect(parseAptToOctas("1.123456789")).toBeNull();
  });
});

describe("clampVotingPowerOctas", () => {
  it("returns the requested amount when within range", () => {
    expect(clampVotingPowerOctas(50n, 100n)).toBe(50n);
  });

  it("clamps down to the max when the request exceeds it", () => {
    expect(clampVotingPowerOctas(150n, 100n)).toBe(100n);
  });

  it("clamps up to zero when the request is negative", () => {
    expect(clampVotingPowerOctas(-10n, 100n)).toBe(0n);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/format.test.ts`
Expected: FAIL — `parseAptToOctas is not exported from '~/lib/governance/format'`.

- [ ] **Step 4: Add the two functions to `src/lib/governance/format.ts`**

Append (do not remove existing exports):

```ts
/**
 * Parses a user-typed APT amount (e.g. "1,234.56") into octas. Returns
 * null for anything that isn't a valid non-negative number with at
 * most 8 fractional digits (1 octa = 10^-8 APT) — callers should treat
 * null as "show a validation error", never fall back to a default.
 */
export function parseAptToOctas(input: string): bigint | null {
  const cleaned = input.replace(/,/g, "").trim();
  if (cleaned.length === 0) return null;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;

  const [wholePart, fractionalPart = ""] = cleaned.split(".");
  if (fractionalPart.length > 8) return null;

  const paddedFractional = fractionalPart.padEnd(8, "0");
  return BigInt(wholePart) * OCTAS_PER_APT + BigInt(paddedFractional || "0");
}

/** Clamps a requested octas amount to the inclusive range [0, maxOctas]. */
export function clampVotingPowerOctas(
  requestedOctas: bigint,
  maxOctas: bigint,
): bigint {
  if (requestedOctas < 0n) return 0n;
  if (requestedOctas > maxOctas) return maxOctas;
  return requestedOctas;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/format.test.ts`
Expected: PASS — all 21 tests in this file green (11 from Tasks 5/12 + 10 new).

- [ ] **Step 6: Write the failing test for `buildVoteTransactionPayload`**

```ts
// tests/unit/build-vote-payload.test.ts
import { describe, expect, it } from "vitest";
import { buildVoteTransactionPayload } from "~/lib/governance/build-vote-payload";
import type { EligiblePool } from "~/lib/governance/types";

const stakePool: EligiblePool = {
  poolAddress: "0xstakepool1",
  poolKind: "stake_pool",
  remainingVotingPower: 500n,
  hasEntirelyVoted: false,
};

const delegationPool: EligiblePool = {
  poolAddress: "0xdelegpool1",
  poolKind: "delegation_pool",
  remainingVotingPower: 1000n,
  hasEntirelyVoted: false,
};

describe("buildVoteTransactionPayload", () => {
  it("builds an aptos_governance::partial_vote payload for a stake pool", () => {
    const payload = buildVoteTransactionPayload(stakePool, "42", 300n, true);
    expect(payload).toEqual({
      data: {
        function: "0x1::aptos_governance::partial_vote",
        typeArguments: [],
        functionArguments: ["0xstakepool1", "42", "300", true],
      },
    });
  });

  it("builds a delegation_pool::vote payload for a delegation pool", () => {
    const payload = buildVoteTransactionPayload(
      delegationPool,
      "42",
      750n,
      false,
    );
    expect(payload).toEqual({
      data: {
        function: "0x1::delegation_pool::vote",
        typeArguments: [],
        functionArguments: ["0xdelegpool1", "42", "750", false],
      },
    });
  });

  it("throws if the requested amount exceeds the pool's remaining voting power", () => {
    expect(() =>
      buildVoteTransactionPayload(stakePool, "42", 999n, true),
    ).toThrow(/exceeds remaining voting power/i);
  });

  it("throws if the requested amount is zero", () => {
    expect(() =>
      buildVoteTransactionPayload(stakePool, "42", 0n, true),
    ).toThrow(/must be greater than zero/i);
  });

  it("throws if the requested amount is negative", () => {
    expect(() =>
      buildVoteTransactionPayload(stakePool, "42", -1n, true),
    ).toThrow(/must be greater than zero/i);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/build-vote-payload.test.ts`
Expected: FAIL — `Cannot find module '~/lib/governance/build-vote-payload'`.

- [ ] **Step 8: Write minimal implementation**

```ts
// src/lib/governance/build-vote-payload.ts
import type { InputEntryFunctionData } from "@aptos-labs/ts-sdk";
import type { EligiblePool } from "~/lib/governance/types";

/**
 * Uses the SDK's own InputEntryFunctionData type directly (re-exported
 * from @aptos-labs/ts-sdk) rather than a hand-rolled lookalike interface.
 * A structurally-similar-but-distinct interface does not reliably widen
 * to the wallet adapter's InputTransactionData['data'] union
 * (InputGenerateTransactionPayloadData = InputEntryFunctionData |
 * InputScriptData | InputMultiSigData | InputMultiSigScriptData) —
 * TypeScript's error messages when this mismatches point at the wrong
 * union branch (e.g. complaining about a missing multisigAddress field),
 * which is misleading. Using the real type sidesteps this entirely.
 * (Confirmed by reproducing the exact typecheck error with the original
 * hand-rolled interface and resolving it with this fix.)
 */
export interface VoteTransactionPayload {
  data: InputEntryFunctionData;
}

/**
 * Builds the standard/JSON transaction payload for casting a vote,
 * per design spec §6.4/§8: always the standard entry-function input
 * shape (not raw BCS), always an explicit voting-power amount (never
 * the MAX_U64 "vote all" sugar — see Task 16's design-decision note),
 * one pool per transaction.
 */
export function buildVoteTransactionPayload(
  pool: EligiblePool,
  proposalId: string,
  amountOctas: bigint,
  shouldPass: boolean,
): VoteTransactionPayload {
  if (amountOctas <= 0n) {
    throw new Error("Voting power amount must be greater than zero");
  }
  if (amountOctas > pool.remainingVotingPower) {
    throw new Error(
      `Requested amount ${amountOctas} exceeds remaining voting power ${pool.remainingVotingPower} for pool ${pool.poolAddress}`,
    );
  }

  const functionId =
    pool.poolKind === "stake_pool"
      ? "0x1::aptos_governance::partial_vote"
      : "0x1::delegation_pool::vote";

  return {
    data: {
      function: functionId,
      typeArguments: [],
      functionArguments: [
        pool.poolAddress,
        proposalId,
        amountOctas.toString(),
        shouldPass,
      ],
    },
  };
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/build-vote-payload.test.ts`
Expected: PASS — all 5 tests green (the zero-amount and negative-amount rejections are separate test cases, not combined into one).

- [ ] **Step 10: Commit the pure logic**

```bash
git add src/lib/governance/get-eligible-pools.ts src/lib/governance/format.ts tests/unit/format.test.ts src/lib/governance/build-vote-payload.ts tests/unit/build-vote-payload.test.ts
git commit -m "Add vote transaction payload builder and voting-power parsing"
```

- [ ] **Step 11: Write the failing test for VotingPanel's review-before-sign behavior**

This test locks in the "no blind-signing" requirement directly: clicking the initial submit control must show the exact parameters and must NOT call `signAndSubmitTransaction` until the user explicitly confirms in the review step.

```tsx
// tests/unit/VotingPanel.test.tsx
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
} from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VotingPanel } from "~/components/VotingPanel";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { getEligiblePools } from "~/lib/governance/get-eligible-pools";

vi.mock("@aptos-labs/wallet-adapter-react", async () => {
  const actual = await vi.importActual("@aptos-labs/wallet-adapter-react");
  return { ...actual, useWallet: vi.fn() };
});
vi.mock("~/lib/governance/get-eligible-pools");

const mockedUseWallet = vi.mocked(useWallet);
const mockedGetEligiblePools = vi.mocked(getEligiblePools);

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
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
      account: { address: "0xvoter" },
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
      account: { address: "0xvoter" },
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

    fireEvent.click(screen.getByRole("button", { name: /^yes$/i }));
    fireEvent.click(screen.getByRole("button", { name: /review vote/i }));

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

    fireEvent.click(screen.getByRole("button", { name: /confirm and sign/i }));

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
      account: { address: "0xvoter" },
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

    fireEvent.change(amountInput, { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: /^yes$/i }));
    fireEvent.click(screen.getByRole("button", { name: /review vote/i }));

    // Review step reflects the edited partial amount, not the full amount.
    // Scoped to the "Amount:" row for the same reason as the test above —
    // this happens to be unambiguous today only because 150 != 500 (the
    // pool's "available" text), which is incidental, not structural.
    const amountRow = screen.getByText(/Amount:/i).closest("div");
    expect(amountRow).toHaveTextContent("150 APT");

    fireEvent.click(screen.getByRole("button", { name: /confirm and sign/i }));

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
      account: { address: "0xvoter" },
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
    fireEvent.change(amountInput, { target: { value: "9999" } });
    fireEvent.click(screen.getByRole("button", { name: /^yes$/i }));

    expect(
      screen.getByRole("button", { name: /review vote/i }),
    ).toBeDisabled();
    expect(screen.getByText(/exceeds available voting power/i)).toBeInTheDocument();
  });

  it("never carries a reviewed/confirmable vote across a proposalId prop change (round-2 review finding)", async () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: { address: "0xvoter" },
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
      defaultOptions: { queries: { retry: false } },
    });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <VotingPanel proposalId="42" />
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByText(/0xstake/i));
    fireEvent.click(screen.getByRole("button", { name: /^yes$/i }));
    fireEvent.click(screen.getByRole("button", { name: /review vote/i }));
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm and sign/i }),
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

    expect(
      screen.getByText(/checking your voting power/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("#42")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /confirm and sign/i }),
    ).not.toBeInTheDocument();

    // Once proposal 43's pools load, the SAME pool address starts from
    // a fresh (non-reviewing) draft, not the frozen review carried over
    // from proposal 42 — confirming the draft key is scoped per
    // proposal, not just per pool address.
    await waitFor(() => screen.getByText(/0xstake/i));
    expect(
      screen.getByRole("button", { name: /review vote/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /confirm and sign/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("#42")).not.toBeInTheDocument();

    // Completing a fresh review + confirm now under proposal 43
    // submits "43", never a leftover "42".
    fireEvent.click(screen.getByRole("button", { name: /^yes$/i }));
    fireEvent.click(screen.getByRole("button", { name: /review vote/i }));
    expect(screen.getByText("#43")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /confirm and sign/i }));

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
      defaultOptions: { queries: { retry: false } },
    });

    mockedUseWallet.mockReturnValue({
      connected: true,
      account: { address: "0xwalletA" },
      signAndSubmitTransaction,
    } as never);
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <VotingPanel proposalId="42" />
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByText(/0xstake/i));
    fireEvent.click(screen.getByRole("button", { name: /^yes$/i }));
    fireEvent.click(screen.getByRole("button", { name: /review vote/i }));
    expect(
      screen.getByRole("button", { name: /confirm and sign/i }),
    ).toBeInTheDocument();

    // Simulate switching connected wallets WITHOUT unmounting this
    // component instance — the eligible-pools query is keyed by the
    // account address, so this immediately re-enters a loading state
    // for wallet B's pools, with no render in between showing wallet
    // A's frozen review next to wallet B's connection.
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: { address: "0xwalletB" },
      signAndSubmitTransaction,
    } as never);
    rerender(
      <QueryClientProvider client={client}>
        <VotingPanel proposalId="42" />
      </QueryClientProvider>,
    );

    expect(
      screen.getByText(/checking your voting power/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /confirm and sign/i }),
    ).not.toBeInTheDocument();

    // Once wallet B's pools load, the SAME pool address starts from a
    // fresh (non-reviewing) draft, not wallet A's frozen review —
    // confirming the draft key is scoped per connected account, not
    // just per proposal + pool address.
    await waitFor(() => screen.getByText(/0xstake/i));
    expect(
      screen.getByRole("button", { name: /review vote/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /confirm and sign/i }),
    ).not.toBeInTheDocument();
  });

  it("clears a pool's error only for that pool, not for other pools, and re-clears it on a fresh review (round-3 review finding)", async () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: { address: "0xvoter" },
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
    fireEvent.click(
      within(pool1Card).getByRole("button", { name: /^yes$/i }),
    );
    fireEvent.click(
      within(pool1Card).getByRole("button", { name: /review vote/i }),
    );
    fireEvent.click(
      within(pool1Card).getByRole("button", { name: /confirm and sign/i }),
    );
    await waitFor(() =>
      expect(screen.getByText(/user rejected/i)).toBeInTheDocument(),
    );

    // Pool 2's own UI must never show pool 1's error — errors are
    // scoped per pool/draft, not rendered once for the whole panel.
    const pool2Card = screen.getByText(/0xstakepool2/i).closest("div")!
      .parentElement!;
    expect(within(pool2Card).queryByText(/user rejected/i)).not.toBeInTheDocument();
  });

  it("shows a specific message when the wallet rejects the transaction", async () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      account: { address: "0xvoter" },
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

    fireEvent.click(screen.getByRole("button", { name: /^yes$/i }));
    fireEvent.click(screen.getByRole("button", { name: /review vote/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm and sign/i }));

    await waitFor(() =>
      expect(screen.getByText(/user rejected/i)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 12: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/VotingPanel.test.tsx`
Expected: FAIL — `Cannot find module '~/components/VotingPanel'`.

- [ ] **Step 13: Write minimal implementation**

**Post-review corrections (three rounds):** the version below differs
from an earlier draft in security-relevant ways, found and fixed across
three rounds of Task 16's code review. Read this before implementing —
each round found something the previous round's fix genuinely missed.

*Round 1:* the earlier draft built the vote payload with the
already-parsed amount only at submit time, re-clamping it against the
pool's *current* remaining voting power — so if a background refetch
lowered that value while the review step was open, the user could sign
a different amount than what the review step displayed. It also
omitted the proposal ID from the review display.

*Round 2:* the round-1 fix froze the *payload* but the review still
read the pool address, proposal ID, and direction from the live
`pool`/`proposalId`/`draft.direction` values rather than from that
frozen source — so if the surrounding props ever changed while a
review was open (e.g. a client-side route transition to a different
proposal that reuses this component instance without a full remount,
which TanStack Router — like most React routers — can do for a
dynamic-segment route), the screen could show one proposal while about
to submit a transaction built against different data. Fixed by
capturing every reviewed field into one atomic `ReviewedVote` snapshot
and keying drafts by `` `${proposalId}:${poolAddress}` ``.

*Round 3:* an adversarial third review, specifically tasked with trying
to break the round-2 fix, found two more gaps of the same shape: (a)
`submitError` was a single component-wide value, not cleared when
`proposalId` changed, so an error from one proposal could still be
visible while reviewing a different one; (b) the draft key omitted the
connected account address, so a reviewed/confirmable draft created
under one wallet could survive a wallet switch if the new account's
eligible pools happened to include the same pool address on the same
proposal. Fixed by moving `submitError` into each pool's own draft
(scoped per pool, cleared on that pool's own review/confirm actions,
never rendered for any other pool) and by extending the draft key to
`` `${accountAddress}:${proposalId}:${poolAddress}` ``. The pattern
across all three rounds: freezing/scoping *some* of the reviewed state
is not the same guarantee as freezing/scoping *all* of it — every
review round found a field or a key dimension the previous round's fix
had not yet covered.

```tsx
// src/components/VotingPanel.tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { getAptosClient } from "~/lib/aptos/client";
import { getEligiblePools } from "~/lib/governance/get-eligible-pools";
import {
  buildVoteTransactionPayload,
  type VoteTransactionPayload,
} from "~/lib/governance/build-vote-payload";
import {
  formatOctasToApt,
  parseAptToOctas,
  truncateAddress,
} from "~/lib/governance/format";
import type { EligiblePool } from "~/lib/governance/types";

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

export function VotingPanel({ proposalId }: { proposalId: string }) {
  const { connected, account, signAndSubmitTransaction } = useWallet();
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
        data: { voterAddress: accountAddress!, proposalId },
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
      const { hash } = await signAndSubmitTransaction(input.payload);
      await getAptosClient().waitForTransaction({ transactionHash: hash });
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
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({
        queryKey: [
          "eligible-pools",
          variables.submittedAccountAddress,
          variables.submittedProposalId,
        ],
      });
      setDrafts((prev) => {
        const next = { ...prev };
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
          [variables.draftKey]: { ...existing, submitError: message },
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
            [draftKey]: { ...draft, ...patch },
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
              <span className="font-mono">
                {truncateAddress(pool.poolAddress)}
              </span>{" "}
              has already used all its voting power on this proposal.
            </div>
          );
        }

        return (
          <div
            key={pool.poolAddress}
            className="rounded-lg border border-[var(--color-border-light)] p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">
                {truncateAddress(pool.poolAddress)}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {formatOctasToApt(pool.remainingVotingPower)} APT available
              </span>
            </div>

            {draft.submitError && (
              <p role="alert" className="mt-2 text-sm text-[var(--color-error)]">
                {draft.submitError}
              </p>
            )}

            {!draft.reviewing ? (
              <>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft({ direction: "for" })}
                    className={`rounded-full px-4 py-1 text-sm ${draft.direction === "for" ? "bg-[var(--color-status-passed-fill)]" : "border border-[var(--color-border)]"}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft({ direction: "against" })}
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
                  onChange={(e) => setDraft({ amountText: e.target.value })}
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
                  style={{ backgroundColor: "var(--color-border-light)" }}
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
                        setDraft({ reviewing: false, reviewed: null })
                      }
                      className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-sm"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={voteMutation.isPending}
                      onClick={() => {
                        setDraft({ submitError: null });
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
}
```

- [ ] **Step 14: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/VotingPanel.test.tsx`
Expected: PASS — all 9 tests green (6 original + 1 added by round 2's review + 2 added by round 3's review). Several real issues were found and fixed while verifying this exact test file against a live run (not just written from the code above, actually executed): (1) without `afterEach(cleanup)` in the `describe` block, tests after the first one see DOM nodes left over from prior renders, producing "Found multiple elements" failures — the test code above already includes `afterEach(cleanup)` for this reason, do not omit it. (2) A bare `screen.getByText(/500 APT/)` (and similarly `/150 APT/`) is ambiguous: the pool header's "{power} APT available" text also matches whenever the reviewed amount equals the full remaining power. The test code above scopes these assertions to the "Amount:" row specifically via `screen.getByText(/Amount:/i).closest("div")` — do not simplify this back to a bare `getByText` search. (3) Round-1 review found the review step must show the proposal ID too (not just function/pool/amount/direction) — the "shows the review step..." test now also asserts `screen.getByText("#42")` and that the pool address appears. (4) Round-2 review found that freezing only the *payload* wasn't enough — the review UI still read pool/proposal/direction live, so a client-side navigation to a different proposal while a review was open (component instance preserved, not remounted) could show stale reviewed data next to a live, different proposal ID. The `ReviewedVote` atomic-snapshot structure and the composite draft key both exist specifically to close this — do not simplify either back to reading live props/state during the review step. A dedicated test (`"never carries a reviewed/confirmable vote across a proposalId prop change"`) exercises this via `rerender`. (5) Round-3 review — an adversarial pass specifically trying to break rounds 1-2's fixes — found two more gaps of the same shape: `submitError` was component-global (not cleared on a `proposalId` change, so one proposal's error could linger while reviewing another), and the draft key omitted the connected account address (so a draft could survive a wallet switch). Fixed by moving `submitError` into each pool's own draft and extending the key to `` `${accountAddress}:${proposalId}:${poolAddress}` `` — do not simplify either back. Two dedicated tests (`"never carries a reviewed/confirmable vote across a connected-account change"` and `"clears a pool's error only for that pool..."`) exercise these. (6) A fourth, explicitly adversarial review round found the core review/submit guarantee had genuinely converged, but flagged two Minor issues: `onSuccess`'s cache invalidation used the component's *current* `proposalId`/`accountAddress` closure rather than the context the vote was actually submitted under (fixed by threading `submittedProposalId`/`submittedAccountAddress` through the mutation's variables, sourced from `draft.reviewed` — never from live state), and the `"clears a pool's error..."` test's title claimed to verify the error is "re-cleared on a fresh review" without actually exercising that path (fixed by extending the test to click Back, confirm the stale error is still visible, then start a fresh review and confirm it clears). If the new partial-amount test fails on the default input value, check that the default uses `formatOctasToApt(pool.remainingVotingPower, 8)` (full precision), not the 2-decimal display default — see the comment above the `draft` initializer.

- [ ] **Step 15: Wire VotingPanel into the proposal detail route**

In `src/routes/proposal.$proposalId.tsx`, replace the placeholder section from Task 13:

```tsx
{/* Voting panel: replaced with the real wallet-connected panel in Task 16. */}
<section className="mt-8 rounded-xl border border-[var(--color-border-light)] p-5">
  <p className="text-sm text-[var(--color-text-secondary)]">
    Connect a wallet to vote on this proposal.
  </p>
</section>
```

with:

```tsx
<section className="mt-8 rounded-xl border border-[var(--color-border-light)] p-5">
  <VotingPanel proposalId={proposal.proposalId} />
</section>
```

And add the import:

```tsx
import { VotingPanel } from "~/components/VotingPanel";
```

- [ ] **Step 16: Typecheck and verify against a live dev server**

Run: `pnpm typecheck`
Expected: no errors.

Run: `pnpm dev`, then open `http://localhost:3000/proposal/200` in a real browser with Petra installed (or without any wallet installed, to confirm the "Connect a wallet to vote" state renders correctly either way).
Expected: without a wallet connected, the panel shows "Connect a wallet to vote on this proposal." Connecting a real wallet with no governance voting power shows "No voting power found for this address." (do not test an actual vote submission against mainnet in this step — that's what Task 18's e2e test is for, against a controlled test setup).

- [ ] **Step 17: Commit**

```bash
git add src/components/VotingPanel.tsx tests/unit/VotingPanel.test.tsx src/routes/proposal.\$proposalId.tsx
git commit -m "Add VotingPanel with review-before-sign voting flow"
```


---

### Task 17: "My Delegation" route

**Files:**
- Create: `src/lib/governance/fetch-my-pools.ts`
- Test: `tests/unit/fetch-my-pools.test.ts`
- Create: `src/lib/governance/get-my-delegation.ts`
- Create: `src/routes/delegation.tsx`

**Interfaces:**
- Consumes: `getAptosClient` (Task 2); `executeIndexerQuery` (Task 6); `formatOctasToApt`, `truncateAddress` (Task 5); `useWallet` (Task 14); `PoolKind` (Task 2).
- Produces: `findMyPools(voterAddress: string): Promise<MyPool[]>`; `getMyDelegation` (server fn); the `/delegation` route.

**Unconfirmed piece, flagged rather than assumed (matches the Task 6 caveat pattern):** per-pool vote *history* requires querying `proposal_votes` filtered by `staking_pool_address` across all proposals, not one specific `proposal_id`. The column is confirmed to exist and be returned (Task 6), but its filterability via `where: { staking_pool_address: { _eq: ... } }` was not independently confirmed against the live schema in this research pass — Hasura exposes `where` filters on returned columns by default, so it is very likely to work, but Step 1 below requires a live confirmation query before the rest of the task proceeds, exactly like Task 6's introspection requirement for `proposal_votes` itself.

- [ ] **Step 1: Confirm `proposal_votes` is filterable by `staking_pool_address` (live check, not assumed)**

Run this once against the live endpoint before writing any code that depends on it:

```bash
curl -s -X POST https://api.mainnet.aptoslabs.com/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { proposal_votes(where: {staking_pool_address: {_eq: \"0x0\"}}, limit: 1) { proposal_id } }"}'
```

Expected: `{"data":{"proposal_votes":[]}}` (empty result is fine — pool `0x0` almost certainly never voted; what matters is the absence of a GraphQL schema error like `field "staking_pool_address" not found in type: 'proposal_votes_bool_exp'`). If you get a schema error instead, the filter isn't supported as written — stop and adjust `fetchVoteHistoryForPool` in Step 4 to use whatever the error message suggests, or drop vote history from this task and file it as a follow-up rather than shipping unverified.

- [ ] **Step 2: Write the failing test for `findMyPools`**

```ts
// tests/unit/fetch-my-pools.test.ts
import { describe, expect, it, vi } from "vitest";
import { findMyPools } from "~/lib/governance/fetch-my-pools";
import * as indexerClient from "~/lib/governance/indexer-client";
import { getAptosClient } from "~/lib/aptos/client";

vi.mock("~/lib/governance/indexer-client");
vi.mock("~/lib/aptos/client");

const VOTER = "0xvoter";

describe("findMyPools", () => {
  it("returns a stake pool with its current voting power", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockImplementation(
      async (query: string) => {
        if (query.includes("current_staking_pool_voter")) {
          return {
            current_staking_pool_voter: [
              { staking_pool_address: "0xstakepool1" },
            ],
          } as never;
        }
        return { current_delegated_voter: [] } as never;
      },
    );

    const mockView = vi.fn(async ({ payload }: { payload: { function: string } }) => {
      if (payload.function === "0x1::aptos_governance::get_voting_power") {
        return [1234n];
      }
      throw new Error(`unexpected view call: ${payload.function}`);
    });
    vi.mocked(getAptosClient).mockReturnValue({ view: mockView } as never);

    const pools = await findMyPools(VOTER);

    expect(pools).toEqual([
      {
        poolAddress: "0xstakepool1",
        poolKind: "stake_pool",
        votingPower: 1234n,
      },
    ]);
  });

  it("returns a delegation pool with its current total voting power", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockImplementation(
      async (query: string) => {
        if (query.includes("current_staking_pool_voter")) {
          return { current_staking_pool_voter: [] } as never;
        }
        return {
          current_delegated_voter: [
            { delegation_pool_address: "0xdelegpool1" },
          ],
        } as never;
      },
    );

    const mockView = vi.fn(async ({ payload }: { payload: { function: string } }) => {
      if (
        payload.function ===
        "0x1::delegation_pool::calculate_and_update_voter_total_voting_power"
      ) {
        return [777n];
      }
      throw new Error(`unexpected view call: ${payload.function}`);
    });
    vi.mocked(getAptosClient).mockReturnValue({ view: mockView } as never);

    const pools = await findMyPools(VOTER);

    expect(pools).toEqual([
      {
        poolAddress: "0xdelegpool1",
        poolKind: "delegation_pool",
        votingPower: 777n,
      },
    ]);
  });

  it("returns an empty array when the voter controls no pools", async () => {
    vi.mocked(indexerClient.executeIndexerQuery).mockResolvedValue({
      current_staking_pool_voter: [],
      current_delegated_voter: [],
    } as never);

    expect(await findMyPools(VOTER)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/fetch-my-pools.test.ts`
Expected: FAIL — `Cannot find module '~/lib/governance/fetch-my-pools'`.

- [ ] **Step 4: Write minimal implementation**

```ts
// src/lib/governance/fetch-my-pools.ts
import { getAptosClient } from "~/lib/aptos/client";
import { executeIndexerQuery } from "~/lib/governance/indexer-client";
import type { PoolKind } from "~/lib/governance/types";

const STAKING_POOL_VOTER_QUERY = `
  query StakingPoolVoter($voter: String) {
    current_staking_pool_voter(where: { voter_address: { _eq: $voter } }) {
      staking_pool_address
    }
  }
`;

const DELEGATED_VOTER_QUERY = `
  query DelegatedVoter($voter: String) {
    current_delegated_voter(where: { voter: { _eq: $voter } }) {
      delegation_pool_address
    }
  }
`;

/** One column, filterable per Step 1's live confirmation — see Task 17's caveat note. */
const VOTE_HISTORY_QUERY = `
  query VoteHistoryForPool($poolAddress: String) {
    proposal_votes(
      where: { staking_pool_address: { _eq: $poolAddress } }
      order_by: { proposal_id: desc }
    ) {
      proposal_id
      should_pass
      num_votes
    }
  }
`;

export interface MyPool {
  poolAddress: string;
  poolKind: PoolKind;
  /** General current voting power — NOT scoped to any one proposal
   *  (contrast with EligiblePool.remainingVotingPower in types.ts,
   *  which is per-proposal remaining power). */
  votingPower: bigint;
}

export interface PoolVoteHistoryRow {
  proposalId: string;
  shouldPass: boolean;
  numVotes: bigint;
}

async function findMyStakePools(voterAddress: string): Promise<MyPool[]> {
  const aptos = getAptosClient();
  const { current_staking_pool_voter } = await executeIndexerQuery<{
    current_staking_pool_voter: Array<{ staking_pool_address: string }>;
  }>(STAKING_POOL_VOTER_QUERY, { voter: voterAddress });

  return Promise.all(
    current_staking_pool_voter.map(async (row) => {
      const [votingPower] = await aptos.view<[string]>({
        payload: {
          function: "0x1::aptos_governance::get_voting_power",
          typeArguments: [],
          functionArguments: [row.staking_pool_address],
        },
      });
      return {
        poolAddress: row.staking_pool_address,
        poolKind: "stake_pool" as const,
        votingPower: BigInt(votingPower),
      };
    }),
  );
}

async function findMyDelegationPools(voterAddress: string): Promise<MyPool[]> {
  const aptos = getAptosClient();
  const { current_delegated_voter } = await executeIndexerQuery<{
    current_delegated_voter: Array<{ delegation_pool_address: string }>;
  }>(DELEGATED_VOTER_QUERY, { voter: voterAddress });

  return Promise.all(
    current_delegated_voter.map(async (row) => {
      const [votingPower] = await aptos.view<[string]>({
        payload: {
          function:
            "0x1::delegation_pool::calculate_and_update_voter_total_voting_power",
          typeArguments: [],
          functionArguments: [row.delegation_pool_address, voterAddress],
        },
      });
      return {
        poolAddress: row.delegation_pool_address,
        poolKind: "delegation_pool" as const,
        votingPower: BigInt(votingPower),
      };
    }),
  );
}

/** Every pool `voterAddress` currently controls, with its general (not
 *  proposal-scoped) voting power — for the "My Delegation" page. */
export async function findMyPools(voterAddress: string): Promise<MyPool[]> {
  const [stakePools, delegationPools] = await Promise.all([
    findMyStakePools(voterAddress),
    findMyDelegationPools(voterAddress),
  ]);
  return [...stakePools, ...delegationPools];
}

/** Vote history for one pool, across all proposals it has voted on.
 *  Depends on the live filterability confirmed in Task 17 Step 1 —
 *  if that check failed, do not call this function; surface an empty
 *  history with an explanatory note instead (see delegation.tsx). */
export async function fetchVoteHistoryForPool(
  poolAddress: string,
): Promise<PoolVoteHistoryRow[]> {
  const { proposal_votes } = await executeIndexerQuery<{
    proposal_votes: Array<{
      proposal_id: string;
      should_pass: boolean;
      num_votes: string;
    }>;
  }>(VOTE_HISTORY_QUERY, { poolAddress });

  return proposal_votes.map((row) => ({
    proposalId: row.proposal_id,
    shouldPass: row.should_pass,
    numVotes: BigInt(row.num_votes),
  }));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/fetch-my-pools.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 6: Create the server function**

```ts
// src/lib/governance/get-my-delegation.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fetchVoteHistoryForPool,
  findMyPools,
} from "~/lib/governance/fetch-my-pools";

const inputSchema = z.object({ voterAddress: z.string().min(1) });

export const getMyDelegation = createServerFn({ method: "GET" })
  .validator(inputSchema)
  .handler(async ({ data }) => {
    const pools = await findMyPools(data.voterAddress);

    const withHistory = await Promise.all(
      pools.map(async (pool) => {
        // Per Task 17 Step 1: if the live filterability check failed,
        // replace this call with `Promise.resolve([])` and keep the
        // rest of the page working with an empty history list.
        const history = await fetchVoteHistoryForPool(pool.poolAddress).catch(
          () => [],
        );
        return {
          ...pool,
          votingPower: pool.votingPower.toString(),
          history: history.map((h) => ({
            ...h,
            numVotes: h.numVotes.toString(),
          })),
        };
      }),
    );

    return { pools: withHistory };
  });
```

- [ ] **Step 7: Create `src/routes/delegation.tsx`**

```tsx
// src/routes/delegation.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Link } from "@tanstack/react-router";
import { getMyDelegation } from "~/lib/governance/get-my-delegation";
import { formatOctasToApt, truncateAddress } from "~/lib/governance/format";

export const Route = createFileRoute("/delegation")({
  component: MyDelegation,
});

function MyDelegation() {
  const { connected, account } = useWallet();

  const query = useQuery({
    queryKey: ["my-delegation", account?.address],
    queryFn: () =>
      getMyDelegation({ data: { voterAddress: account!.address.toString() } }),
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
        <p className="mt-4 text-[var(--color-text-secondary)]">Loading…</p>
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
                  {pool.poolKind === "stake_pool" ? "Stake pool" : "Delegation pool"}
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
                        params={{ proposalId: h.proposalId }}
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
```

- [ ] **Step 8: Verify against a live dev server**

Run: `pnpm dev`, open `http://localhost:3000/delegation` without a wallet connected.
Expected: "Connect a wallet to see the pools you control."

- [ ] **Step 9: Commit**

```bash
git add src/lib/governance/fetch-my-pools.ts tests/unit/fetch-my-pools.test.ts src/lib/governance/get-my-delegation.ts src/routes/delegation.tsx
git commit -m "Add My Delegation route with pool voting power and vote history"
```


---

### Task 18: Playwright e2e vote-flow test with a real AIP-62 mock wallet

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/fixtures/mock-wallet.ts`
- Create: `tests/e2e/fixtures/mock-fullnode-server.ts`
- Create: `tests/e2e/vote-flow.spec.ts`

**Interfaces:**
- Consumes: the real, running app (Tasks 1–17) via a Playwright browser; `resetAptosClientForTests` (just added to Task 2's `client.ts` above) is NOT used here — the mock fullnode server is a real local HTTP server the SDK talks to over the network, which is more faithful than monkeypatching the SDK internals.
- Produces: a passing e2e test that connects a wallet, casts a vote, and confirms the UI reflects it — this is the design spec §8 requirement ("connect wallet → view proposal → cast vote, using a mocked/test wallet").

**Why a real mock wallet, not a mocked React hook:** Task 16's unit tests mock `useWallet()` directly, which proves `VotingPanel`'s own logic is correct but proves nothing about whether it's actually wired to a real AIP-62 wallet correctly. This test instead injects a real object satisfying the wallet-standard's `registerWallet()` protocol and required feature set (confirmed directly from `@aptos-labs/wallet-standard` and `@wallet-standard/core` source in this research pass — see the required-features list in Step 2) into the actual browser page, so `@aptos-labs/wallet-adapter-react`'s real AIP-62 discovery code finds and uses it exactly as it would find a real Petra installation.

**Why a local mock fullnode/indexer, not real mainnet:** casting a real vote requires real APT stake and a real, currently-active proposal — neither of which this test can assume exists. The mock server (Step 3) serves canned, self-consistent responses so the test is deterministic and doesn't depend on mainnet's live state.

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      APTOS_FULLNODE_URL: "http://localhost:8081",
      APTOS_INDEXER_URL: "http://localhost:8081/graphql",
    },
  },
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
```

- [ ] **Step 2: Create the mock wallet fixture**

This is a `page.addInitScript` payload — it runs in the browser page context, not Node, so it must be self-contained (no imports from the app's TS source).

```ts
// tests/e2e/fixtures/mock-wallet.ts

/**
 * Serialized as a string and injected via page.addInitScript in
 * vote-flow.spec.ts. Implements exactly the required AIP-62 feature
 * set confirmed from @aptos-labs/wallet-standard's isWalletWithRequiredFeatureSet
 * (aptos:account, aptos:connect, aptos:disconnect, aptos:network,
 * aptos:onAccountChange, aptos:onNetworkChange, aptos:signMessage,
 * aptos:signTransaction) plus the optional aptos:signAndSubmitTransaction
 * this app actually calls, and registers itself via the real
 * wallet-standard 'wallet-standard:register-wallet' event protocol
 * confirmed from @wallet-standard/core's registerWallet() source —
 * not a guessed/simplified event shape.
 */
export const MOCK_WALLET_INIT_SCRIPT = `
(function () {
  const MOCK_ADDRESS = "0xf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfee";
  const MOCK_POOL_ADDRESS = "0xstakepoolmock000000000000000000000000000000000000000000000001";

  window.__mockWalletCalls = [];

  const account = {
    address: MOCK_ADDRESS,
    publicKey: "0x" + "11".repeat(32),
  };

  const wallet = {
    version: "1.0.0",
    name: "Mock Wallet",
    icon: "data:image/svg+xml;base64,PHN2Zy8+",
    url: "https://example.com/mock-wallet",
    chains: ["aptos:mainnet"],
    accounts: [account],
    features: {
      "aptos:account": {
        version: "1.0.0",
        account: async () => account,
      },
      "aptos:connect": {
        version: "1.0.0",
        connect: async () => ({ status: "Approved", args: account }),
      },
      "aptos:disconnect": {
        version: "1.0.0",
        disconnect: async () => {},
      },
      "aptos:network": {
        version: "1.0.0",
        network: async () => ({ name: "mainnet", chainId: 1, url: "http://localhost:8081" }),
      },
      "aptos:onAccountChange": {
        version: "1.0.0",
        onAccountChange: async () => {},
      },
      "aptos:onNetworkChange": {
        version: "1.0.0",
        onNetworkChange: async () => {},
      },
      "aptos:signMessage": {
        version: "1.0.0",
        signMessage: async (input) => ({
          status: "Approved",
          args: { message: input.message, nonce: input.nonce, signature: "0x" + "22".repeat(64) },
        }),
      },
      "aptos:signTransaction": {
        version: "1.0.0",
        signTransaction: async () => ({
          status: "Approved",
          args: { authenticator: {}, rawTransaction: new Uint8Array() },
        }),
      },
      "aptos:signAndSubmitTransaction": {
        version: "1.0.0",
        signAndSubmitTransaction: async (input) => {
          window.__mockWalletCalls.push(input);
          return {
            status: "Approved",
            args: { hash: "0x" + "aa".repeat(32) },
          };
        },
      },
    },
  };

  function registerWallet(w) {
    const callback = (detail) => detail.register(w);
    try {
      window.dispatchEvent(
        new CustomEvent("wallet-standard:register-wallet", { detail: callback }),
      );
    } catch (e) {
      console.error("mock wallet register-wallet dispatch failed", e);
    }
    try {
      window.addEventListener("wallet-standard:app-ready", (event) =>
        callback(event.detail),
      );
    } catch (e) {
      console.error("mock wallet app-ready listener failed", e);
    }
  }

  registerWallet(wallet);
})();
`;

export const MOCK_ADDRESS =
  "0xf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfeedf00dfee";
export const MOCK_POOL_ADDRESS =
  "0xstakepoolmock000000000000000000000000000000000000000000000001";
```

- [ ] **Step 3: Create the mock fullnode + indexer server**

A minimal Node `http` server (no framework dependency) serving canned responses shaped exactly like the real endpoints this app calls — `getAccountResource` (VotingForum), `getTableItem` (one active proposal, using the same field shapes confirmed against real mainnet data in Task 8), the governance `view` functions this app calls, and one indexer GraphQL endpoint. It runs on port 8081, matching `playwright.config.ts`'s `webServer.env`.

```ts
// tests/e2e/fixtures/mock-fullnode-server.ts
import http from "node:http";
import { MOCK_POOL_ADDRESS } from "./mock-wallet";

const ACTIVE_PROPOSAL_ID = "999";
const VOTING_FORUM_HANDLE =
  "0xmockforumhandle00000000000000000000000000000000000000000000001";

// Same field shapes as the real mainnet fixture used in Task 8's test —
// but with a future expiration so this proposal is always "active".
function buildMockProposal() {
  const nowSecs = Math.floor(Date.now() / 1000);
  return {
    proposer: MOCK_POOL_ADDRESS,
    execution_content: { vec: [{ dummy_field: false }] },
    metadata: {
      data: [
        {
          key: "metadata_location",
          // hex("http://localhost:8081/metadata.json")
          value:
            "0x687474703a2f2f6c6f63616c686f73743a383038312f6d657461646174612e6a736f6e",
        },
        {
          key: "metadata_hash",
          // filled in at server start once we've computed sha3-256 of the served metadata body
          value: "0x00",
        },
      ],
    },
    creation_time_secs: String(nowSecs - 3600),
    execution_hash: "0x00",
    min_vote_threshold: "1",
    expiration_secs: String(nowSecs + 3600),
    early_resolution_vote_threshold: { vec: [] },
    yes_votes: "0",
    no_votes: "0",
    is_resolved: false,
    resolution_time_secs: "0",
  };
}

async function computeMetadataHashHex(): Promise<string> {
  // See the .js-extension note on Task 4's metadata.ts import — same
  // @noble/hashes@2.x exports-map requirement applies here.
  const { sha3_256 } = await import("@noble/hashes/sha3.js");
  const { bytesToHex } = await import("@noble/hashes/utils.js");
  const digestHex = bytesToHex(
    sha3_256(new TextEncoder().encode(MOCK_METADATA_BODY)),
  );
  // On-chain shape confirmed in Task 4/8: hex-of-ASCII-hex-digest, not raw digest bytes.
  return "0x" + Buffer.from(digestHex, "ascii").toString("hex");
}

const MOCK_METADATA_BODY = JSON.stringify({
  title: "Mock Proposal For E2E Testing",
  description: "This proposal exists only for the Playwright e2e test.",
  source_code_url: "https://example.com/src",
  discussion_url: "https://example.com/discuss",
});

export async function startMockFullnodeServer(port = 8081) {
  const metadataHashHex = await computeMetadataHashHex();
  const proposal = buildMockProposal();
  proposal.metadata.data[1].value = metadataHashHex;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    res.setHeader("Content-Type", "application/json");

    if (url.pathname === "/metadata.json") {
      res.setHeader("Content-Type", "application/json");
      res.end(MOCK_METADATA_BODY);
      return;
    }

    if (
      url.pathname ===
      "/v1/accounts/0x1/resource/0x1::voting::VotingForum%3C0x1::governance_proposal::GovernanceProposal%3E"
    ) {
      res.end(
        JSON.stringify({
          data: {
            next_proposal_id: String(Number(ACTIVE_PROPOSAL_ID) + 1),
            proposals: { handle: VOTING_FORUM_HANDLE },
          },
        }),
      );
      return;
    }

    if (
      req.method === "POST" &&
      url.pathname === `/v1/tables/${VOTING_FORUM_HANDLE}/item`
    ) {
      res.end(JSON.stringify(proposal));
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/view") {
      const body = JSON.parse(await readBody(req));
      if (body.function === "0x1::aptos_governance::get_remaining_voting_power") {
        res.end(JSON.stringify(["100000000"])); // 1 APT in octas
        return;
      }
      if (body.function === "0x1::aptos_governance::has_entirely_voted") {
        res.end(JSON.stringify([false]));
        return;
      }
      res.end(JSON.stringify([]));
      return;
    }

    if (req.method === "POST" && url.pathname === "/graphql") {
      const body = JSON.parse(await readBody(req));
      if (typeof body.query === "string" && body.query.includes("current_staking_pool_voter")) {
        res.end(
          JSON.stringify({
            data: {
              current_staking_pool_voter: [
                { staking_pool_address: MOCK_POOL_ADDRESS },
              ],
            },
          }),
        );
        return;
      }
      if (typeof body.query === "string" && body.query.includes("current_delegated_voter")) {
        res.end(JSON.stringify({ data: { current_delegated_voter: [] } }));
        return;
      }
      if (typeof body.query === "string" && body.query.includes("proposal_votes")) {
        res.end(JSON.stringify({ data: { proposal_votes: [] } }));
        return;
      }
      res.statusCode = 400;
      res.end(JSON.stringify({ errors: [{ message: "unhandled mock query" }] }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: `mock server: no handler for ${req.method} ${url.pathname}` }));
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));
  return { server, activeProposalId: ACTIVE_PROPOSAL_ID };
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}
```

- [ ] **Step 4: Write the e2e test**

```ts
// tests/e2e/vote-flow.spec.ts
import { test, expect } from "@playwright/test";
import { MOCK_WALLET_INIT_SCRIPT, MOCK_ADDRESS } from "./fixtures/mock-wallet";
import { startMockFullnodeServer } from "./fixtures/mock-fullnode-server";

let mockServer: Awaited<ReturnType<typeof startMockFullnodeServer>>;

test.beforeAll(async () => {
  mockServer = await startMockFullnodeServer(8081);
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => mockServer.server.close(() => resolve()));
});

test("connect wallet, view proposal, and cast a vote", async ({ page }) => {
  // Inject the mock AIP-62 wallet before any app script runs, so the
  // adapter's discovery code sees it exactly like a real extension.
  await page.addInitScript(MOCK_WALLET_INIT_SCRIPT);

  await page.goto(`/proposal/${mockServer.activeProposalId}`);

  // The verified title should be visible — confirms metadata hash
  // verification passed against the mock server's served body.
  await expect(
    page.getByText("Mock Proposal For E2E Testing"),
  ).toBeVisible();

  // Connect the mock wallet.
  await page.getByRole("button", { name: /connect wallet/i }).click();
  await page.getByRole("menuitem", { name: "Mock Wallet" }).click();

  // The truncated mock address should appear once connected.
  await expect(
    page.getByText(MOCK_ADDRESS.slice(0, 8), { exact: false }),
  ).toBeVisible();

  // Cast a Yes vote.
  await page.getByRole("button", { name: /^yes$/i }).click();
  await page.getByRole("button", { name: /review vote/i }).click();

  // Review step must show the real function name before any signing.
  await expect(
    page.getByText("0x1::aptos_governance::partial_vote"),
  ).toBeVisible();

  await page.getByRole("button", { name: /confirm and sign/i }).click();

  // After a successful vote, the mock wallet's signAndSubmitTransaction
  // should have been called with the exact expected payload.
  await page.waitForFunction(() => window.__mockWalletCalls?.length > 0);
  const calls = await page.evaluate(() => window.__mockWalletCalls);
  expect(calls).toHaveLength(1);
  expect(calls[0].data.function).toBe("0x1::aptos_governance::partial_vote");
  expect(calls[0].data.functionArguments[1]).toBe(mockServer.activeProposalId);
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

  await page.goto(`/proposal/${mockServer.activeProposalId}`);
  await page.getByRole("button", { name: /connect wallet/i }).click();
  await page.getByRole("menuitem", { name: "Mock Wallet" }).click();

  await expect(page.getByText(/rejected/i)).toBeVisible();
});
```

- [ ] **Step 5: Add the npm scripts and Playwright browser install**

Add to `package.json` scripts (already has `test:e2e`; add the browser-install helper):

```json
"test:e2e:install": "playwright install --with-deps chromium"
```

- [ ] **Step 6: Run the e2e suite**

Run: `pnpm test:e2e:install` (one-time, downloads the Chromium binary)
Run: `pnpm test:e2e`
Expected: both tests in `vote-flow.spec.ts` pass. If the first test fails at "Mock Proposal For E2E Testing" not appearing, check the metadata hash computation in `mock-fullnode-server.ts` — this is the same hex-of-ASCII-hex-digest encoding confirmed against real mainnet data in Task 4, and it's easy to accidentally compute the raw digest bytes instead.

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts tests/e2e/fixtures/mock-wallet.ts tests/e2e/fixtures/mock-fullnode-server.ts tests/e2e/vote-flow.spec.ts package.json
git commit -m "Add Playwright e2e test with a spec-compliant AIP-62 mock wallet"
```


---

### Task 19: Deployment configuration

**Files:**
- Create: `.env.example`
- Create: `netlify.toml`

**Interfaces:**
- Consumes: `APTOS_FULLNODE_URL`, `APTOS_INDEXER_URL` (env-var overrides added to Task 2/Task 6 above), `APTOS_BUILD_API_KEY` (already read in Task 2/Task 6).
- Produces: a documented `.env.example` and a working Netlify deploy config — per design spec §9 ("env vars for fullnode/indexer endpoints with sane mainnet defaults... documented in `.env.example`, mirroring the pattern already used by `aptos-labs/governance`") and §8 (Vercel or Netlify Node target).

- [ ] **Step 1: Create `.env.example`**

```bash
# Optional: override the default Aptos mainnet fullnode/indexer endpoints.
# Leave unset to use the SDK's built-in mainnet defaults.
# APTOS_FULLNODE_URL=https://fullnode.mainnet.aptoslabs.com/v1
# APTOS_INDEXER_URL=https://api.mainnet.aptoslabs.com/v1/graphql

# Optional: an Aptos Build (aptoslabs.com) API key for higher rate limits
# against both the fullnode and indexer endpoints above.
# APTOS_BUILD_API_KEY=
```

- [ ] **Step 2: Install and configure the official Netlify TanStack Start Vite plugin**

Confirmed against the live Netlify docs (docs.netlify.com/build/frameworks/framework-setup-guides/tanstack-start, fetched 2026-08-20) and the plugin's own README (github.com/netlify/framework-adapters): Netlify's TanStack Start support is a dedicated Vite plugin (`@netlify/vite-plugin-tanstack-start`, real published package, MIT-licensed), not a generic Nitro build target or a `[[plugins]]` block in `netlify.toml`.

```bash
pnpm add -D @netlify/vite-plugin-tanstack-start
```

Add it to `vite.config.ts` (from Task 1) — append the import and add `netlify()` to the plugins array, after `tanstackStart()`:

```ts
import netlify from "@netlify/vite-plugin-tanstack-start";
```

```ts
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src",
    }),
    viteReact(),
    nitro(),
    netlify(),
  ],
```

- [ ] **Step 3: Create `netlify.toml`**

Per the confirmed docs, this is the entire required config — no `[[plugins]]` block, no manual Nitro output path:

```toml
[build]
  command = "pnpm build"
  publish = "dist/client"
```

- [ ] **Step 4: Typecheck and full test suite as a final sanity check**

Run: `pnpm typecheck`
Expected: no errors.

Run: `pnpm test`
Expected: every unit test file from Tasks 3–17 passes.

Run: `pnpm build`
Expected: production build succeeds.

- [ ] **Step 5: Commit**

```bash
git add .env.example netlify.toml vite.config.ts package.json pnpm-lock.yaml
git commit -m "Add deployment configuration (Netlify TanStack Start plugin, .env.example)"
```
