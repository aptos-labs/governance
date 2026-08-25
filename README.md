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
inside server functions and never reaches the browser. Do not use the `VITE_`
prefix for these — anything prefixed with `VITE_` is inlined into the client
bundle and publicly readable.

- `APTOS_BUILD_API_KEY` (optional): Aptos Build API key for fullnode and indexer requests
- `APTOS_FULLNODE_URL` (optional): fullnode override; defaults to hosted mainnet
- `APTOS_INDEXER_URL` (optional): indexer override; defaults to `https://api.mainnet.aptoslabs.com/v1/graphql`

Migration note: the `REACT_APP_*` variables from the CRA version and the
`VITE_*` variables from the static Vite version are both gone. The app no
longer reads any client-side environment variables.

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
