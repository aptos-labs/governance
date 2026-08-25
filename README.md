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

The app posts alerts to Aptos Labs Slack **`#governance`** when a proposal
is created, when voting closes (pass or fail), when a proposal is executed,
and when voting is about to end (3d / 2d / 1d / 6h countdown reminders).
There is no public subscribe page.

1. Set `CRON_SECRET` and `NOTIFICATIONS_PUBLIC_APP_URL`.
2. On Vercel, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   so the poll snapshot survives across serverless invocations. Locally the
   store defaults to `.data/notifications.json`.
3. Point Slack at `#governance` using **one** of:
   - `NOTIFICATIONS_SLACK_WEBHOOK_URL` — Incoming Webhook created in
     Aptos Labs Slack `#governance`
   - `NOTIFICATIONS_SLACK_BOT_TOKEN` — bot invited to `#governance`; the
     app posts with `chat.postMessage` to that channel name
4. Vercel Cron hits `GET /api/cron/notifications` every 5 minutes
   (`vercel.json`). Hobby plans only allow one cron per day — use Pro, or
   an external scheduler with `Authorization: Bearer $CRON_SECRET`.

The first successful poll records the current on-chain state and does **not**
fan out historical proposals.

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
