# Aptos Gov — Delegated Governance Voting App (Design Spec)

- **Status:** Approved for planning
- **Date:** 2026-08-20
- **Author:** Design session with project owner (Greg)
- **Replaces:** govscan.live (Aptos-only functionality)
- **Reference implementation:** https://github.com/aptos-labs/governance (React/Vite/MUI SPA, pinned to older SDK/adapter versions — used as a data-model and API reference, not a code base to fork)

## 1. Summary

A modern, mainnet-only Aptos governance web app for viewing proposals and casting delegated votes, built with TanStack Start, the latest `@aptos-labs/ts-sdk`, and `@aptos-labs/wallet-adapter-react` (AIP-62). It replaces the voting/monitoring functionality of govscan.live for Aptos. Petra (extension) and Petra Web are the primary supported wallets, but the app works with any AIP-62-compliant wallet via the standard adapter — no wallet-specific integration code.

This is the **Governance MVP** scope: proposal discovery and detail, delegated-staking and delegation-pool voting, wallet connection. Delegate directories/rankings and off-chain notifications (govscan's other niche) are explicitly out of scope for this release.

## 2. Goals

- Let a connected wallet discover every pool (traditional stake pool with delegated voter, and/or delegation pool) it has voting power over, and cast yes/no votes — full or partial — against active proposals.
- Present proposals with the same integrity guarantees as the official reference app: verified off-chain metadata (SHA3-256 hash match against the on-chain `metadata_hash`), accurate status/timing, and accurate vote tallies.
- Support any AIP-62 wallet through the standard adapter, with Petra extension and Petra Web as the primary, most-tested paths.
- Ship with a real, verifiable Aptos brand identity (see §7) rather than an invented palette.
- Be fast and shareable: proposal list and detail pages are server-rendered from indexer/fullnode data; wallet/voting logic is client-only.

## 3. Non-goals (this release)

- Proposal creation (the reference app's create-proposal flow is explicitly test tooling and is not being carried forward).
- Stake lockup management / increase-lockup flows.
- Delegated-voter reassignment or delegation-pool configuration (changing `delegated_voter`, pool creation, etc.).
- Delegate directory, profiles, or rankings.
- Off-chain notifications (Discord/Telegram/Slack/email) — this is govscan's other current niche; may be a future release.
- Testnet/devnet UI in the public deployment. A separate deployment with a different env configuration may point at testnet/devnet later, but the shipped product for this spec is mainnet-only with no visible network switcher.

## 4. Architecture

**Pattern: Hybrid SSR + direct chain reads.**

- TanStack Start server-renders the proposal list and proposal detail pages by reading directly from Aptos mainnet (fullnode resources/views) and the hosted Indexer GraphQL API. This gives fast initial loads, shareable/crawlable URLs, and no custom database or ingestion worker to operate.
- All AIP-62 wallet discovery, connection, signing, and submission happen in a **client-only boundary** (dynamically imported / mounted only in the browser). The server never touches wallet APIs, private keys, or browser extension state.
- TanStack Query hydrates from the server loader's data on the client (no duplicate fetch on hydration) and owns subsequent polling, refetching, and cache invalidation (e.g., after a vote is submitted).
- No custom backend/database for this MVP. If a future release needs delegate rankings, notifications, or heavier analytics, an indexed backend can be introduced later without reworking this page/data-loader structure.

**Why this over the alternatives considered:**
- A fully client-side SPA (closer to the reference app) was rejected: slower first paint, weaker shareability, and no meaningful simplicity win given TanStack Start's loaders handle the SSR/hydration split cleanly.
- An indexed custom backend was rejected for this MVP: real operational cost (ingestion correctness, staleness, infra) with no MVP feature that requires it. Revisit if/when delegate rankings or notifications are scoped.

## 5. Data sources & model

### 5.1 On-chain modules (Aptos mainnet, via `@aptos-labs/ts-sdk`)

- `0x1::aptos_governance` — proposal creation (not used by this app), voting (`vote`, `partial_vote`, `batch_vote`, `batch_partial_vote`), and views: `get_voting_duration_secs`, `get_min_voting_threshold`, `get_required_proposer_stake`, `get_voting_power(pool)`, `get_remaining_voting_power(pool, proposal)`, `has_entirely_voted`.
- `0x1::voting` — generic proposal forum. Proposals are read from resource `0x1::voting::VotingForum<0x1::governance_proposal::GovernanceProposal>` (fields include `next_proposal_id` and the proposals table handle); each proposal is a table item of type `0x1::voting::Proposal<0x1::governance_proposal::GovernanceProposal>`.
- `0x1::stake` — `get_delegated_voter(pool)` for traditional stake-pool voter lookups; lockup-vs-expiration eligibility check.
- `0x1::delegation_pool` — `vote(pool, proposal_id, voting_power, should_pass)` for proportional delegation-pool voting; `delegate_voting_power(pool, delegated_voter)` (read-only relevance here — reassignment UI is a non-goal, but the app must read current delegated-voter state correctly).
- Vote-use tracking: `0x1::aptos_governance::VotingRecords`, keyed by `RecordKey { stake_pool, proposal_id }` — used to determine "already voted" / remaining power per pool per proposal.

### 5.2 Indexer GraphQL (hosted, `https://api.mainnet.aptoslabs.com/v1/graphql`)

- `proposal_votes` (by `proposal_id`, ordered by `num_votes desc`) for the paginated per-pool voter table on the proposal detail page.
- `current_staking_pool_voter` and `current_delegated_voter` for discovering which pools a connected address controls as delegated voter, across both traditional stake pools and delegation pools.
- `current_delegator_balances` / `current_delegated_staking_pool_balances` as needed for delegation-pool voting-power display.
- Treat `proposal_votes` and related delegated-staking tables as schema to introspect and regression-test against the live endpoint before relying on them in production — they are used by the official reference app but are not exhaustively covered in the public table-reference docs.

### 5.3 Off-chain proposal metadata

- Each proposal's on-chain record stores `metadata_location` (a URL) and `metadata_hash`.
- Server-side, fetch the URL with a bounded timeout and response-size limit, compute `sha3_256` of the raw response text, and compare against `metadata_hash`.
- If the hash doesn't match, the UI must show an explicit "metadata unverified" state instead of silently rendering unverified content. Parsed fields (title, description, source_code_url, discussion_url) are only trusted after a hash match.
- Description content is rendered as sanitized markdown/plain text — never raw HTML from metadata.

### 5.4 Numeric handling

- All on-chain integers (voting power, stake amounts, proposal IDs, timestamps) are represented as `string`/`bigint` end-to-end. Never coerce to JavaScript `number` where precision loss is possible.

## 6. Pages & UX

### 6.1 Information architecture

| Route | Purpose |
|---|---|
| `/` (Proposals) | Paginated proposal list: status (Active/Passed/Executed/Failed), time remaining, for/against votes, metadata title. Filter chips for status. |
| `/proposal/:id` | Full proposal detail: verified metadata, vote tally, threshold progress, paginated per-pool voter table, and the voting action panel. |
| `/delegation` | Wallet-connected view: every pool (stake-pool-with-delegated-voter and/or delegation-pool) the connected address controls, its voting power, and its vote history. |

### 6.2 Proposal dashboard (`/`)

- Status filter chips (All / Active / Passed / Executed / Failed).
- Each proposal card shows: status badge, proposal ID, title, key timing (e.g., "ends in 2d 14h" / "starts in 3d 8h" / "executed 1d ago"), a for/against mini-bar, and turnout or pass/fail percentage as applicable.
- Status badges and vote-direction bars use only the governance-specific extension tokens from the `aptos-design-system` skill (fills, never colored text — see §7).

### 6.3 Proposal detail (`/proposal/:id`)

- Header: proposal number, status badge, verified title.
- Body: full description (sanitized), source code link, discussion link, proposer address (linked to an explorer), creation/start/expiration timestamps (localized to the viewer), execution hash.
- Vote tally: for/against bar, total votes, minimum-threshold progress, early-resolution threshold if set.
- Voter table: paginated, sourced from Indexer GraphQL `proposal_votes`, each row showing pool address, direction, and voting power. If the indexer is lagging (e.g., immediately after a vote), the fullnode read is treated as authoritative for anything voting-eligibility-related; the table may show a "may be outdated" note rather than silently disagreeing with the rest of the page.
- Metadata verification badge as described in §5.3.

### 6.4 Voting panel (embedded in proposal detail, wallet-gated)

- If the connected address controls no eligible pool (neither a delegated-voter stake pool nor delegation-pool balance), show "No voting power found for this address" — not a disabled/ambiguous button.
- If eligible, list every controlled pool separately (an address may control more than one). Per pool: pool address (truncated + copy-to-clipboard), remaining eligible voting power, and whether it has already voted (`has_entirely_voted` / partial remainder).
- Each pool row has its own Yes/No toggle and an amount field. Per the approved default: **preselect all remaining eligible voting power, editable down for a partial vote.**
- Submit opens a review step showing the exact transaction parameters (entry function, pool address, proposal id, direction, amount) before requesting wallet approval. No blind-signing.
- Post-submission states (pending → confirming → success/failure) are tied to the real transaction hash with an explorer link. On success, invalidate and refetch: this proposal's tally, its voter table, and this pool's remaining voting power.
- Hard blockers are surfaced with specific copy: proposal not yet started, voting period ended, pool lockup doesn't extend past proposal expiration (ineligible), already fully voted on this proposal.

### 6.5 Error handling

- Wallet errors (user rejected, wrong network, wallet doesn't support an optional adapter feature) produce a specific inline message, never a generic toast.
- RPC/indexer failures degrade to clearly labeled stale/cached data rather than a blank state.
- Standard JSON transaction inputs are used for building transactions (not raw BCS payloads) to maximize cross-wallet compatibility, since BCS-specific signing support is not guaranteed across all AIP-62 wallets.

## 7. Design system

Full detail lives in the committed skill: **`.claude/skills/aptos-design-system/`** (`SKILL.md`, `references/tokens.json`, `scripts/check_contrast.py`). This spec references it rather than duplicating it so there is a single source of truth.

Key points relevant to this app:

- **Palette source of truth:** the real Aptos Brand Guidelines (Figma), cross-confirmed against the live `aptos-labs/explorer` app's theme source. This supersedes the earlier ad-hoc "teal `#00d0a1`" placeholder used only in early mockups.
- Brand accent colors (Mint, Baby Blue, Coral) are used **only as fills/badges/bars**, never as text color — this is both the guideline's own rule and a measured WCAG requirement (Tan in particular fails AA as text on light backgrounds at ~2.9:1).
- Light-mode interactive/status text uses the accessibility-adjusted derivatives (`#34648F` info, `#256B2E` success, `#B84722` error, `#9D5A16` warning) rather than raw brand hues, matching the tested approach in the official Explorer app.
- Governance-specific status/vote-direction colors (Active/Passed/Executed/Failed badges; for/against bars) are a documented **extension** on top of the verified brand tokens, not part of the brand guideline itself — see `tokens.json` → `governanceExtension`. The four-state model matches the real on-chain lifecycle confirmed against `aptos_framework::voting`/`aptos_governance` and a live mainnet proposal: there is no "not yet started" or "expired" state — voting opens immediately at proposal creation, and a proposal is **active** (voting open) → **passed** (voting closed, succeeded, `is_resolved == false`, awaiting execution) → **executed** (`is_resolved == true`), or **active** → **failed** (voting closed without meeting the threshold) as the terminal unhappy path.
- **Typography:** Season Serif Variable / Season Sans / Akkurat Mono are the licensed brand fonts; this app ships on the confirmed open fallback stack (**IBM Plex Serif / IBM Plex Sans / IBM Plex Mono**) per the approved decision to avoid font-licensing risk. The token/font layer is structured so licensed fonts can be dropped in later without other changes, should the project acquire the license files.
- **Theme:** system/light/dark, defaulting to the user's OS preference. Dark-mode tokens are derived from the same verified neutral ramp (Black/Ink/Coal as dark surfaces, White/Creme as dark-mode text) since the brand guideline pages available do not show a separate dark-mode spec.
- **Canvas choice:** the app uses the warm cream canvas (`#F9F9F0`) consistent with the mockups already approved in this session, rather than the Explorer app's alternate neutral-grey canvas choice — both are legitimate per the skill, but only one should be used per project.
- Any new color pairing introduced during implementation must be run through `scripts/check_contrast.py` before shipping; all currently-defined required pairings pass AA or better (several at AAA).

## 8. Tech stack

| Concern | Choice |
|---|---|
| Framework | TanStack Start (React 19, file-based routing, SSR/streaming, server functions) |
| Chain SDK | `@aptos-labs/ts-sdk`, latest, mainnet only |
| Wallet | `@aptos-labs/wallet-adapter-react`, latest, AIP-62 auto-discovery; Petra extension + Petra Web featured first in the connect UI, all registered wallets listed |
| Data fetching/cache | TanStack Query, hydrated from server loaders, owns polling + post-vote invalidation |
| Styling | Tailwind CSS, driven entirely by `aptos-design-system` tokens — no separate hand-maintained palette |
| Testing (unit) | Vitest — metadata hash verification, voting-power math, token/contrast helpers |
| Testing (e2e) | Playwright — connect wallet → view proposal → cast vote, against a mocked/test wallet |
| CI gate | `scripts/check_contrast.py` run in CI as a lint-style check |
| Package manager | pnpm |
| Hosting | Vercel or Netlify (Node target), matching the approved decision and the reference app's deployment pattern |

## 9. Deployment & configuration

- Env vars: fullnode/indexer endpoints (sane mainnet defaults baked in), optional Aptos Build API key for rate-limit headroom. Documented in `.env.example`, mirroring the pattern already used by `aptos-labs/governance`.
- No secrets required client-side. No private key ever touches this application, client or server — voting is wallet-signed only.
- No network switcher in the shipped UI (mainnet-only per approved scope). A separate deployment/environment configuration may target testnet if needed later, out of band from this spec.

## 10. Security considerations

- Metadata hash verification (§5.3) is mandatory, not optional — an unverified proposal must never render as if it were verified.
- All transaction parameters are shown to the user before wallet approval (§6.4) — no blind-signing.
- Large integers as `bigint`/`string` throughout (§5.4) to avoid silent precision loss in voting-power or stake amounts.
- Server-side metadata fetches are bounded (timeout + response size limit) to avoid the app being used as an SSRF/amplification vector against arbitrary attacker-controlled URLs.
- No raw private key entry anywhere in the app (explicitly rejecting the reference app's test-only create-proposal pattern of asking for a private key).

## 11. Open items / risks carried into implementation

- **Indexer schema stability:** `proposal_votes` and related delegated-staking tables are used successfully by the reference app but aren't exhaustively documented publicly. Implementation should include a smoke test against the live endpoint early, with a documented fallback (fullnode-only) if a field is missing or renamed.
- **Wallet adapter API drift:** current Aptos docs and Petra's own docs show slightly different provider-config shapes (`dappConfig` vs. `dappInfo`/`optInWallets`). Implementation must verify against the actually-installed adapter package's type declarations rather than copying either doc verbatim.
- **Dark-mode brand tokens** are a derived/best-effort extension (§7), not sourced from an explicit dark-mode page in the brand guidelines. If Aptos publishes an official dark-mode spec later, the token file should be updated and re-verified with the contrast script.
- **Petra mobile deep-linking** (`petra://api/v1/...` flows, and the `https://petra.app/explore?link=<dapp-url>` mobile-web pattern) is not a primary target for this MVP (Petra extension + Petra Web are primary) but should not be actively broken; verify the standard adapter's mobile behavior during implementation rather than special-casing it.

## Appendix: key references consulted

- Reference app: https://github.com/aptos-labs/governance (routes, proposal/vote data hooks, metadata verification pattern, AGENTS.md tooling conventions)
- Aptos governance framework source: `aptos-governance.move`, `stake.move`, `delegation_pool.move` (aptos-core)
- Aptos Indexer API docs: https://aptos.dev/build/indexer/indexer-api.md and indexer-reference.md
- AIP-62 wallet standard: aptos-foundation/AIPs `aip-062-wallet-standard.md`
- Wallet adapter integration guide: https://aptos.dev/build/sdks/wallet-adapter/dapp
- Petra docs: https://petra.app/docs/connect-to-petra, https://petra.app/web/developers/quick-start, https://petra.app/docs/mobile-deeplinks
- Aptos Brand Guidelines (Figma) — Color Overview p.25, Type Usage p.20, Fallbacks: Serif p.21 (screenshots provided directly)
- `aptos-labs/explorer` theme source (cross-check for brand tokens): `app/themes/colors/aptosBrandColors.ts`, `typography.ts`, `theme.ts`, `aptosBrandColors.a11y.test.ts`
- govscan.live (public homepage only — no API/schema/source was discoverable; treated as a product/UX reference, not a technical one)
