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
- `APTOS_FULLNODE_URL` (optional): fullnode override; defaults to hosted mainnet
- `APTOS_INDEXER_URL` (optional): indexer override; defaults to
  `https://api.mainnet.aptoslabs.com/v1/graphql`

Geomi keys authenticate against those Aptos Labs hosts. Do not point the
endpoints at `api.geomi.dev`.

A client key (`AG-…`) will still be sent, but Geomi applies Origin / per-IP
limits meant for browsers. Prefer a server key for this deployment.

If you already set a key on Vercel under a legacy name, it is still read, in
this order: `APTOS_BUILD_API_KEY`, `GEOMI_API_KEY`, `VITE_APTOS_BUILD_API_KEY`,
`VITE_GEOMI_API_KEY`, `VITE_APTOS_API_KEY_MAINNET`, `VITE_APTOS_API_KEY`,
`APTOS_API_KEY`.

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
