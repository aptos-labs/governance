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

This app renders on the server, so its configuration is read with `process.env`
inside server functions and never reaches the browser. Prefer unprefixed names
so secrets are not inlined into the client bundle.

- `APTOS_BUILD_API_KEY` (optional, recommended in production): Geomi / Aptos
  Labs **server** API key (`aptoslabs_…`) sent as `Authorization: Bearer` on
  fullnode and indexer requests. Create one at https://geomi.dev. This is the
  key that avoids public-endpoint rate limits on Vercel SSR.
- `APTOS_API_ORIGIN` (optional): Origin header sent on SSR Aptos/Geomi
  requests. Set this only when you intentionally use a client key (`AG-…`)
  for SSR; it must match a URL allowlisted on that key. If unset, client
  keys are not sent from the server (the public endpoint is used instead).
- `APTOS_FULLNODE_URL` (optional): fullnode override; defaults to hosted mainnet
- `APTOS_INDEXER_URL` (optional): indexer override; defaults to
  `https://api.mainnet.aptoslabs.com/v1/graphql`

Geomi keys authenticate against those Aptos Labs hosts. Do not point the
endpoints at `api.geomi.dev`.

A client key (`AG-…`) is for browsers. Geomi 401s SSR with
`Unauthorized: Origin header is required` if it is sent without an Origin.
This app attaches Origin on the server only when `APTOS_API_ORIGIN` is set
and otherwise skips the client key so the public endpoint is used instead of
crashing the proposals page. Prefer a server key for this deployment.

If you already set a key on Vercel under a legacy name, it is still read, in
this order: `APTOS_BUILD_API_KEY`, `GEOMI_API_KEY`, `VITE_APTOS_BUILD_API_KEY`,
`VITE_GEOMI_API_KEY`, `VITE_APTOS_API_KEY_MAINNET`, `VITE_APTOS_API_KEY`,
`APTOS_API_KEY`. `VITE_*` names are also read from `import.meta.env` so a key
that was only present at build time still works.

**Is the Vercel key the right type?** After a deploy, open the serverless
function logs. You should see one of:

- `[aptos] Using server API key from APTOS_BUILD_API_KEY` — correct.
  Server keys start with `aptoslabs_`.
- `[aptos] Using client API key from … with Origin https://…` — a browser
  (`AG-…`) key is being used for SSR. It works only if that Origin is on the
  Geomi allowlist. Prefer a **server** key as `APTOS_BUILD_API_KEY`.
- `[aptos] Ignoring client API key … during SSR` — a client key was found but
  no Origin could be attached, so the public endpoint is used.
- `[aptos] No API key found` — the dashboard name does not match any of
  the names above (or the variable is empty). Add `APTOS_BUILD_API_KEY`.

Do not point `APTOS_FULLNODE_URL` / `APTOS_INDEXER_URL` at `api.geomi.dev`.
Geomi keys authenticate against the hosted Aptos Labs URLs.

List and proposal HTML is cached at the Vercel edge for 15 seconds
(`s-maxage=15`, `stale-while-revalidate=45`), matching the in-process TTL
cache used by the fullnode/indexer loaders.

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
