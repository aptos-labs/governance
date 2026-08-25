# Governance App Enhancements — Design Spec

- **Status:** Approved for planning
- **Date:** 2026-08-24
- **Author:** Design session with project owner (Greg)
- **Scope:** 4 independent enhancements to the existing Aptos Governance app on the `aptos-gov-implementation` worktree

## 1. Dark Mode ACTIVE Status Badge Fix

### Problem
`StatusBadge.tsx` uses `var(--color-text-primary)` as the text color for the ACTIVE status badge. In dark mode, `--color-text-primary` resolves to `#F9F9F0` (white), rendered on a Baby Blue `#BADBEE` fill background. This produces a contrast ratio of ~1.3:1 — essentially invisible text.

The design tokens in `tokens.json` already specify the correct text-on-fill colors:
- Active: `textOnFillDark: "#171612"` (same as light — Baby Blue is light-toned, needs dark-ink text regardless of surrounding canvas)
- Passed: `textOnFillDark: "#171612"` (same pattern)
- Failed: `textOnFillDark: "#171612"` (same pattern)
- Executed: `textOnFillDark: "#F9F9F0"` (already implemented correctly as a separate variable)

### Fix
1. Add three new CSS custom properties to `src/styles/app.css` in both the `:root` block and the `:root[data-theme="dark"]` block:
   - `--color-status-active-text: #171612`
   - `--color-status-passed-text: #171612`
   - `--color-status-failed-text: #171612`
   (The `executed` state already has `--color-status-executed-text` and needs no change.)

2. Update `StatusBadge.tsx` to use these variables instead of `var(--color-text-primary)` for active, passed, and failed:
   ```
   active: "var(--color-status-active-text)"
   passed: "var(--color-status-passed-text)"
   failed: "var(--color-status-failed-text)"
   executed: "var(--color-status-executed-text)"  // unchanged
   ```

3. Verify contrast: `#171612` on `#BADBEE` → ~9.1:1 (passes AAA), `#171612` on `#DAF6D4` → ~13:1, `#171612` on `#FE805C` → ~5.3:1. All pass WCAG AA.

## 2. Pagination

### Current state
- `listProposals` server function already accepts `{ page: number }` and fetches the correct 20-proposal slice
- The route schema already includes `page` in search params
- The route's `loaderDeps` already passes `page` to the server function
- **Missing:** No UI to navigate to pages other than 0

### Design
Add page navigation to the bottom of the proposals list (`src/routes/index.tsx`):

**Components:**
- A `<nav>` element below the proposal cards containing:
  - "← Previous" button (disabled on page 0)
  - "Page X of Y" indicator (Y = Math.ceil(totalCount / PAGE_SIZE))
  - "→ Next" button (disabled on last page)
- Each button is a `<Link>` that updates the `?page=` search param while preserving the current `status` filter

**Behavior:**
- Clicking prev/next triggers a new SSR fetch via the loader (because `page` is in `loaderDeps`)
- The URL updates (`?page=1&status=all`) — shareable, bookmarkable
- The filter chips persist across pagination (the `status` param is preserved)

**Edge cases:**
- Empty page: show "No proposals found on this page" (already handled)
- Total count < page size: hide pagination entirely
- Rapid clicking: the loader handles this naturally — each navigation unmounts/remounts the page

## 3. "How I Voted" Indicators

### Design
When the wallet is connected and the user is viewing proposals, show per-proposal indicators of whether and how they voted.

**Two contexts:**
1. **Proposal list cards** (`/`): A small colored badge on each card: "You voted Yes" (green) or "You voted No" (red). Only visible when the wallet is connected and the user has voted on that proposal.
2. **Proposal detail** (`/proposal/$id`): A "My vote" section above the Voter Breakdown table, showing:
   - Which pool(s) you voted with
   - Direction (Yes/No)
   - Amount in APT
   - This section replaces the generic "No voting power" / voting panel when the user has already voted with all their pools (i.e., nothing actionable remains). When some pools still have remaining power, show both: the voted-pool recap AND the voting panel.

### Data layer
New server function: `src/lib/governance/fetch-my-votes.ts`

```
fetchMyVotes(voterAddress: string, proposalIds: string[])
  → Record<proposalId, {
      shouldPass: boolean,
      amountOctas: string,
      poolAddresses: string[]
    }>
```

This queries the Indexer's `proposal_votes` table. The indexer filters by `pool_address` (staking pool address), not by `voter_address` — so to find the connected account's votes across all visible proposals, the function must first resolve the connected address's eligible pool addresses (reusing the same indexer query from `fetch-eligible-pools.ts` / `fetch-my-pools.ts`), then query `proposal_votes` for each pool on each of the given `proposalIds`. The result is aggregated and keyed by proposalId.

If the indexer is unavailable, the function returns an empty map (no crash — we just don't show indicators). The function is a `createServerFn` (no `.server.` extension).

### Components
- **`MyVoteBadge.tsx`** (new): Renders "You voted Yes" or "You voted No" as a small inline badge. Props: `shouldPass: boolean`. Uses the governance extension vote-direction tokens (green for Yes, red for No). Rendered as a small filled badge similar to `StatusBadge` but smaller (xs text).
- Updated **`ProposalCard.tsx`**: Accepts optional `myVote: { shouldPass: boolean }` prop. If present, renders `<MyVoteBadge shouldPass={...} />` next to the status badge.
- Updated **`src/routes/index.tsx`**: When wallet is connected, fires a client-side `useQuery` to `fetchMyVotes` for the currently visible proposal IDs. Passes the result down to each `ProposalCard`.
- Updated **`src/routes/proposal.$proposalId.tsx`**: When wallet is connected, fires a client-side `useQuery` to `fetchMyVotes` for the single proposal. Renders the "My vote" recap section if a vote is found.

### Server-function naming
Must NOT use `.server.` in the filename (TanStack Start import protection). Name: `src/lib/governance/fetch-my-votes.ts` — consistent with the existing `fetch-eligible-pools.ts`, `fetch-my-pools.ts` naming convention.

## 4. Geomi.dev API Integration

### What Geomi provides
Geomi.dev is an Aptos infrastructure platform offering API access (fullnode proxy), no-code indexing, and gas station. Their API key acts as a proxy layer between the client and Aptos nodes, avoiding public-endpoint rate limits.

### Design: Client-side API key via build-time env var
The user's Geomi API key is injected at build time as `VITE_GEOMI_API_KEY`. Optionally, custom endpoint URLs can be set via `VITE_GEOMI_FULLNODE_URL` and `VITE_GEOMI_INDEXER_URL` (falling back to Geomi defaults or Aptos public endpoints).

**Changes to `src/lib/aptos/client.ts`:**
- Read `VITE_GEOMI_API_KEY`, `VITE_GEOMI_FULLNODE_URL` from `import.meta.env`
- When `VITE_GEOMI_API_KEY` is set:
  - `fullnode` → `VITE_GEOMI_FULLNODE_URL || "https://api.geomi.dev/v1"`
  - `clientConfig.API_KEY` → `VITE_GEOMI_API_KEY`
- When `VITE_GEOMI_API_KEY` is NOT set: same behavior as today (uses public mainnet endpoint, optionally overridden by `APTOS_FULLNODE_URL`)
- Priority: `VITE_GEOMI_*` env vars take precedence over `APTOS_*` env vars (Geomi is the explicit choice)

**Changes to `src/lib/governance/indexer-client.ts`:**
- Read `VITE_GEOMI_INDEXER_URL` from `import.meta.env`
- When set, use it as the indexer GraphQL endpoint instead of the default
- The Geomi indexer URL likely appends `/graphql` (or we accept a full URL from the env var)

**`.env.example` additions:**
```
# Geomi API key (client-side proxy for fullnode + indexer requests)
VITE_GEOMI_API_KEY=

# Optional Geomi endpoint overrides (defaults shown)
# VITE_GEOMI_FULLNODE_URL=https://api.geomi.dev/v1
# VITE_GEOMI_INDEXER_URL=https://api.geomi.dev/v1/graphql
```

### Coexistence with Aptos Build API key
`VITE_APTOS_BUILD_API_KEY` (used by the wallet adapter's AptosConnect features) is independent. Both can be present simultaneously — Geomi handles fullnode/indexer requests, Build handles wallet-connect identity verification.

### Security note
`VITE_*` env vars are embedded in the client-side JavaScript bundle at build time. Geomi API keys are designed for client-side use (they proxy public RPC calls, not privileged operations). This is the standard pattern for Geomi's intended usage.

## 5. Files Summary

| File | Change | Feature |
|------|--------|---------|
| `src/styles/app.css` | Add `--color-status-{active,passed,failed}-text` vars in both themes | 1 |
| `src/components/StatusBadge.tsx` | Use theme-appropriate text-color vars | 1 |
| `src/routes/index.tsx` | Add page nav links + myVotes query | 2, 3 |
| `src/lib/governance/fetch-my-votes.ts` | NEW: server function for user vote lookups | 3 |
| `src/components/MyVoteBadge.tsx` | NEW: "You voted Yes/No" badge | 3 |
| `src/components/ProposalCard.tsx` | Accept optional myVote prop, render badge | 3 |
| `src/routes/proposal.$proposalId.tsx` | Add myVotes query + "My vote" recap | 3 |
| `src/lib/aptos/client.ts` | Add Geomi URL/key override logic | 4 |
| `src/lib/governance/indexer-client.ts` | Add Geomi indexer override | 4 |
| `.env.example` | Document VITE_GEOMI_* vars | 4 |
| `tests/unit/` | New tests for fetch-my-votes, StatusBadge dark mode, pagination | 1–3 |

## 6. Order of Implementation

1. **Dark mode fix** (simplest, blocks nothing)
2. **Pagination** (independent, needed for UX)
3. **How-I-voted** (depends on pagination only in the list route — can be parallel after step 2)
4. **Geomi keys** (independent of everything else)