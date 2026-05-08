# AGENTS.md

## Purpose

Repository operating guide for AI coding agents working on Aptos Governance.

## Core Rules

- Keep behavior stable unless the user explicitly asks for feature changes.
- Prefer minimal diffs over broad refactors.
- Do not change on-chain/business logic during tooling migrations.
- Do not run destructive git/file commands.

## Dev Commands

- Install: `pnpm install`
- Dev server: `pnpm dev`
- Type check: `pnpm typecheck`
- Test: `pnpm test`
- Build: `pnpm build`

## Required Validation Before Handoff

Run all:

1. `pnpm typecheck`
2. `pnpm test`
3. `pnpm build`

If any fail, report exact failure and do not claim success.

## Environment

- Use `.env.local` for local config.
- Client-side vars must use `VITE_*`.
- Current supported vars are listed in `.env.example`.

## Code Editing Guidance

- Preserve existing coding style and naming conventions.
- Avoid introducing new dependencies unless required.
- Keep comments brief and only for non-obvious logic.
- Update docs when changing scripts/config/env behavior.

## Migration-Specific Notes

- Package manager: `pnpm` (not Yarn/NPM scripts in docs).
- Build tool: `Vite` (not `react-scripts` / CRA).
- SVG React components should use `?react` imports.

