# Aptos Governance

Frontend app for Aptos governance workflows.

## Tech Stack

- React 18 + TypeScript
- Vite 7
- pnpm
- MUI
- Apollo Client + react-query

## Requirements

- Node.js 20+
- pnpm 10+

## Quick Start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:5173`.

## Scripts

- `pnpm dev`: start local dev server
- `pnpm build`: production build to `dist/`
- `pnpm preview`: preview production build locally
- `pnpm test`: run unit tests once (Vitest)
- `pnpm test:watch`: run tests in watch mode
- `pnpm typecheck`: run TypeScript type checking
- `pnpm fmt`: format source files with Prettier
- `pnpm fmt:check`: verify formatting with Prettier
- `pnpm lint`: run ESLint

## Environment Variables

Use Vite-prefixed env variables:

- `VITE_GA_TRACKING_ID`
- `VITE_ADOBE_FONTS` (optional; when omitted, Adobe Typekit is not loaded)
- `VITE_BASE_PATH` (default `/`; for static hosting under a subpath use `/<repo>/`)
- `VITE_APTOS_API_KEY` (optional fallback key for custom/fullnode endpoints)
- `VITE_APTOS_API_KEY_MAINNET` (optional)
- `VITE_APTOS_API_KEY_TESTNET` (optional)
- `VITE_APTOS_API_KEY_DEVNET` (optional)
- `VITE_INDEXER_GRAPHQL_MAINNET`
- `VITE_INDEXER_GRAPHQL_TESTNET`
- `VITE_INDEXER_GRAPHQL_DEVNET`

Migration note:

- `REACT_APP_*` variables from CRA are now `VITE_*`.

Legacy -> Vite mapping:

- `REACT_APP_ADOBE_FONTS` -> `VITE_ADOBE_FONTS`
- `REACT_APP_INDEXER_GRAPHQL_MAINNET` -> `VITE_INDEXER_GRAPHQL_MAINNET`
- `REACT_APP_INDEXER_GRAPHQL_TESTNET` -> `VITE_INDEXER_GRAPHQL_TESTNET`
- `REACT_APP_INDEXER_GRAPHQL_DEVNET` -> `VITE_INDEXER_GRAPHQL_DEVNET`
- `GA_TRACKING_ID` -> `VITE_GA_TRACKING_ID`

## GitHub Pages

This repo includes `.github/workflows/deploy-pages.yml` for GitHub Pages deployment.

- Default base path is `/` (root).
- To deploy under a repo subpath, set repository variable `GH_PAGES_REPO_NAME` to your repository name.
  - Example: `aptos-governance` -> build base path becomes `/aptos-governance/`
- The workflow sets `VITE_BASE_PATH` at build time and also adds `dist/404.html` for SPA route refresh fallback.

## Quality Gates

Run before creating a PR:

```bash
pnpm lint
pnpm fmt:check
pnpm typecheck
pnpm test
pnpm build
```

## Project Structure

- `src/`: app code
- `public/`: static assets copied as-is
- `dist/`: production output (generated)
