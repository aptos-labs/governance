# Aptos Governance

Frontend app for Aptos governance workflows.

## Tech Stack

- React 19 + TypeScript
- TanStack Start (SSR) + TanStack Router + TanStack Query
- Vite 8 with Nitro as the server build
- Tailwind CSS 4
- Aptos TS SDK + wallet adapter
- pnpm

## Requirements

- Node.js 22+
- pnpm 10+

## Quick Start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

- `pnpm dev`: start local dev server
- `pnpm build`: production build to `.output/` (or `.vercel/output/` on Vercel)
- `pnpm preview`: preview production build locally
- `pnpm start`: run the built server
- `pnpm test`: run unit tests once (Vitest)
- `pnpm test:watch`: run tests in watch mode
- `pnpm test:e2e`: run Playwright end-to-end tests
- `pnpm typecheck`: run TypeScript type checking
- `pnpm lint`: run Biome
- `pnpm lint:fix`: apply Biome fixes

## Environment Variables

This app uses **two** Geomi / Aptos Labs API keys. Mixing them is what 401s
SSR: a browser client key (`AG-…`) sent from Node has no `Origin` header.

- `APTOS_BUILD_API_KEY` (backend, recommended in production): Geomi **server**
  key (`aptoslabs_…`). Read with `process.env` in server functions and never
  inlined into the client bundle. Create one at https://geomi.dev. This is the
  key that avoids public-endpoint rate limits on Vercel SSR.
  Also accepted: `GEOMI_API_KEY`, `APTOS_API_KEY`.
  `VITE_APTOS_BUILD_API_KEY` is **not** read — a `VITE_` name would inline the
  server secret. Copy that value to `APTOS_BUILD_API_KEY` and delete the
  `VITE_` variable.
- `VITE_APTOS_API_KEY` (frontend): Geomi **client** key (`AG-…`), inlined into
  the browser bundle. Allowlist this site's origin on the key. Used by the
  wallet adapter and client-side Aptos SDK calls (`waitForTransaction`).
  Also accepted: `VITE_APTOS_API_KEY_MAINNET`, `VITE_GEOMI_API_KEY`.
- `APTOS_FULLNODE_URL` (optional): fullnode override; defaults to hosted mainnet
- `APTOS_INDEXER_URL` (optional): indexer override; defaults to
  `https://api.mainnet.aptoslabs.com/v1/graphql`
- `SITE_ORIGIN` (optional): canonical origin used in `/sitemap.xml`,
  `/robots.txt`, and `/.well-known/*` discovery documents. Defaults to
  the request's forwarded host. Production:
  `https://governance.aptosfoundation.org`

Geomi keys authenticate against those Aptos Labs hosts. Do not point
`APTOS_FULLNODE_URL` / `APTOS_INDEXER_URL` at `api.geomi.dev`.

**Is the Vercel key the right type?** After a deploy, open the serverless
function logs. You should see one of:

- `[aptos] Using backend server API key from APTOS_BUILD_API_KEY` — correct.
- `[aptos] No backend API key found` — add `APTOS_BUILD_API_KEY` (server key).
- `[aptos] Ignoring client API key from APTOS_BUILD_API_KEY` — that value is an
  `AG-…` key. Put the client key in `VITE_APTOS_API_KEY` and a server key in
  `APTOS_BUILD_API_KEY`.

List and proposal HTML is cached at the Vercel edge for 15 seconds
(`s-maxage=15`, `stale-while-revalidate=45`), matching the in-process TTL
cache used by the fullnode/indexer loaders.

## Governance notifications

The poller posts alerts to Aptos Labs Slack **`#governance`** when a proposal
is created, when voting closes (pass or fail), when a proposal is executed,
and when voting is about to end (3d / 2d / 1d / 6h countdown reminders).
There is no public subscribe page.

Run it as a **persistent process** on any machine with disk (a VM, a home
server, systemd). The proposal snapshot is a local JSON file, so Upstash
is not required.

```bash
# long-running (polls every 5 minutes)
pnpm notifications:worker

# one shot (cron / systemd timer)
pnpm notifications:worker --once

# preview without posting or writing the snapshot
pnpm notifications:worker --once --dry-run
```

Copy `.env.example` to `.env.notifications` (or `.env.local`) on that
machine and set:

- `APTOS_BUILD_API_KEY` — Geomi server key
- `NOTIFICATIONS_PUBLIC_APP_URL` — origin used in Slack links
- `NOTIFICATIONS_SLACK_WEBHOOK_URL` or `NOTIFICATIONS_SLACK_BOT_TOKEN`
- `NOTIFICATIONS_STORE_PATH` — defaults to `.data/notifications.json`

A sample systemd unit is in `deploy/governance-notifications.service`.
Point `WorkingDirectory` and `--env-file` at that machine's checkout.

The first successful poll records the current on-chain state and does **not**
fan out historical proposals. Do not also hit `/api/cron/notifications` on
the same snapshot or you can double-post.

## Deployment

Production hosting is Vercel. The app is server-rendered and uses TanStack
Start server functions, so it cannot be deployed to a static host.

`pnpm build` runs Nitro, which detects the platform automatically:

- Locally it writes a standalone Node server to `.output/`, runnable with `pnpm start`.
- On Vercel (`VERCEL=1` is set during the build) it writes `.vercel/output/`,
  which follows Vercel's Build Output API. Static assets are served from the
  CDN and all other requests go to a single server function.

`vercel.json` pins the framework preset to `tanstack-start` and the pnpm
install/build commands so the settings do not depend on dashboard state. Set
the variables above in the Vercel project's environment variable settings.

Vercel Web Analytics and Speed Insights are wired in the document shell via
`@vercel/analytics` and `@vercel/speed-insights`. Enable **Web Analytics**
and **Speed Insights** on the project in the Vercel dashboard so
`/_vercel/insights/*` and `/_vercel/speed-insights/*` are served after the
next deploy.

## Agent discovery

The app publishes machine-readable discovery for AI agents:

- `/sitemap.xml` and `/robots.txt` (Content-Signal + Sitemap)
- `Link` headers on `/` (`api-catalog`, `service-desc`, `service-doc`)
- `/.well-known/api-catalog`, `/.well-known/ai-catalog.json`
- `/.well-known/mcp/server-card.json` and Streamable HTTP `/mcp`
- `/.well-known/agent-skills/index.json`
- `/auth.md`, `/.well-known/oauth-protected-resource`,
  `/.well-known/oauth-authorization-server`
- `Accept: text/markdown` on HTML pages
- WebMCP tools registered in the browser on page load

DNS-AID `SVCB` records cannot be served by the app. Operators must publish
the zone file in `dns/agents.zone` — see `docs/dns-aid.md`.

## Quality Gates

Run before creating a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Project Structure

- `src/routes/`: file-based routes, including the `__root.tsx` document shell
- `src/components/`: shared UI components
- `src/lib/`: Aptos client, governance data fetching, and wallet setup
- `public/`: static assets served as-is
- `tests/unit/`, `tests/e2e/`: Vitest and Playwright suites
- `.output/`: production build (generated)
