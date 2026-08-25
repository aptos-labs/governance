---
name: aptos-design-system
description: Use when choosing colors, fonts, or contrast values for an Aptos-branded UI (governance app, explorer, dapp, marketing page) — provides verified brand hex codes, typography stack, and WCAG-checked semantic tokens so colors aren't invented or guessed.
---

# Aptos Design System

## Overview

Verified Aptos brand tokens (color, typography, accessible semantic mappings) so you never have to guess or invent a hex code for an Aptos-branded UI. Two independent sources agree exactly on the 11 raw brand colors: the official Figma "Aptos Brand Guidelines" file and the live `aptos-labs/explorer` app's theme source. This skill packages both into ready-to-use tokens, plus a script that mechanically verifies contrast instead of eyeballing it.

**Why this exists:** tested two ways to get Aptos brand colors without this skill. (1) An agent with only local repo access echoed whatever colors happened to be lying around in scratch files — not reliable, since it depends entirely on what's already there. (2) An agent with real web-research tools eventually found the correct values by cross-referencing the `aptos-labs/explorer` source — but it took ~20 web fetches and several minutes to land on a source good enough to trust, and a less thorough agent doing the same task could easily stop early on a plausible-but-wrong guess instead. Either way, "figure it out fresh each time" is slow, expensive, and not guaranteed. Use the verified tokens below instead, or run the contrast script on any new pairing before shipping it.

## When to Use

- Styling any Aptos-branded surface: governance/voting UI, block explorer, dapp frontend, docs site, marketing page.
- Picking a color for text, a status badge, a chip, a button, or a chart.
- Choosing a font family or a heading/body/mono type stack.
- Reviewing someone else's color choice ("is `#00d0a1` on white okay for body text?").
- **Not** for: logo usage/clear-space/trademark rules (not covered here — ask for those pages specifically), motion/animation specs, non-Aptos brands.

## Quick Reference — Raw Brand Colors

| Name | Hex | Use as | Never use as |
|---|---|---|---|
| Mint | `#DAF6D4` | Fills, illustration, icons, dark-mode success text | Light-mode body/link text |
| Baby Blue | `#BADBEE` | Fills, illustration, dark-mode info/primary text | Light-mode body/link text |
| Coral | `#FE805C` | Fills, illustration, dark-mode error/warning text | Light-mode body/link text |
| Black | `#0F0E0B` | Dark-mode canvas background | — |
| Ink | `#171612` | Light-mode primary text; dark-mode paper bg | — |
| Coal | `#21201C` | Dark-mode elevated surface/border | — |
| Graphite | `#2F2D28` | Light-mode secondary text; dark-mode border | — |
| Tan | `#9D937C` | Decorative/large-scale only | **Any text on White/Creme — fails WCAG AA at 2.9:1** |
| Sand | `#CCC5A3` | Neutral surface tint; text only on dark neutrals | Text on light backgrounds |
| Creme | `#EFECCA` | Dark-mode secondary text; light alt surface | — |
| White | `#F9F9F0` | Dark-mode primary text; warm light surface | — |

**Rule from the brand guideline itself:** Mint, Baby Blue, and Coral are reserved for backgrounds/illustration/iconography and **should never be used for typography**. This isn't just a style preference — all three fail or barely pass WCAG AA as light-mode text color (verify with the script before making an exception).

## Quick Reference — Semantic Tokens (WCAG-AA verified)

Full machine-checked table: `references/tokens.json` → `semantic`. Every pairing is verified by `scripts/check_contrast.py` (see below) — do not hand-copy hex codes into new contexts without re-running it.

| Token | Light mode | Dark mode |
|---|---|---|
| Canvas background | `#F9F9F0` (warm) or `#ECEEF2` (neutral) — pick one, see note below | `#0F0E0B` |
| Paper/card background | `#FFFFFF` | `#171612` |
| Text primary | `#171612` | `#F9F9F0` |
| Text secondary | `#2F2D28` | `#EFECCA` |
| Info/link | `#34648F` | `#BADBEE` |
| Success | `#256B2E` | `#DAF6D4` |
| Error | `#B84722` | `#FE805C` |
| Warning | `#9D5A16` | `#FE805C` |

**Two legitimate canvas choices exist** — a warm cream `#F9F9F0` (matches the brand guideline's own neutrals and aptosnetwork.com's warm editorial direction) vs. neutral grey `#ECEEF2` with white cards (the official Explorer app's deliberate "traditional app chrome" choice). Pick one per project; don't mix both on the same screen.

Notice `#34648F`, `#256B2E`, `#B84722`, `#9D5A16` are **not** in the raw brand palette — they're accessibility-driven derivatives (real brand hue, adjusted lightness/saturation until they clear 4.5:1 on light backgrounds) sourced from the official Explorer app's tested theme. Use them for light-mode interactive text/status color; use the raw brand hues directly for dark mode and for fills.

## Typography

| Role | Brand font (licensed) | Open fallback (use unless you have licensed webfont files) |
|---|---|---|
| Display / headings (h1–h3) | Season Serif Variable | **IBM Plex Serif** |
| Body / nav / UI / h4–h6 | Season Sans | **IBM Plex Sans** |
| Tertiary / labels / addresses / hashes | Akkurat Mono | **IBM Plex Mono** |

```css
--font-serif: "IBM Plex Serif", Georgia, "Times New Roman", Times, serif;
--font-sans: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
```

Google Fonts import (open fallback stack): see `references/tokens.json` → `typography.googleFontsHref`.

Season/Akkurat are commercial — only use them if you have licensed webfont files to self-host. Otherwise ship the IBM Plex stack; it's what Aptos's own Explorer app ships when the licensed fonts aren't available.

## Governance-Specific Extension

Proposal status badges and vote-direction colors aren't defined in the raw brand guideline — `references/tokens.json` → `governanceExtension` derives them from verified fills + verified a11y text colors. The status model itself is corrected to match the real on-chain lifecycle (there is no "not yet started" or "expired" state — voting opens immediately at proposal creation): **Active** (Baby Blue fill, voting open) → **Passed** (Mint fill, voting succeeded, awaiting execution) → **Executed** (Graphite fill, resolved on-chain, archived/historical), or **Failed** (Coral fill, terminal unhappy path) as the alternative to Passed. Vote-count numbers use the derived success/error text colors rather than the raw fill hue. Treat this section as this-project convention, not brand law — reasonable to override, but keep contrast verified if you do.

## Verifying Contrast (do this, don't eyeball it)

```bash
# Full report — checks every pairing this skill relies on
python3 .claude/skills/aptos-design-system/scripts/check_contrast.py

# Ad-hoc check of any two colors before using them together
python3 .claude/skills/aptos-design-system/scripts/check_contrast.py "#171612" "#F9F9F0"
```

Exits non-zero if a required pairing fails AA. No dependencies — stdlib only.

## Common Mistakes

| Mistake | Fix |
|---|---|
| Inventing a hex code because it "sounds right" for a brand | Use the tokens in `references/tokens.json`, or if you must use a new pairing, run `check_contrast.py` on it before shipping |
| Coral/Mint/Baby Blue text on a white or cream background | These are fill colors; use the derived a11y text colors instead (`#B84722`, `#256B2E`, `#34648F`) |
| Tan or Sand as body text on a light surface | Both fail AA on White/Creme — use Ink or Graphite for text; keep Tan/Sand as large decorative fills only |
| Assuming Season/Akkurat Mono are free to use | They're commercial brand fonts — ship IBM Plex unless you have licensed webfont files |
| Mixing the warm-cream canvas and the neutral-grey canvas on the same screen | Pick one canvas strategy per project and stay consistent |
| Treating this project's status-badge colors as official brand law | They're a documented extension for governance UIs, not from the brand guideline itself |

## Source Provenance

- Figma "Aptos Brand Guidelines": Color Overview (p.25), Type Usage (p.20), Fallbacks: Serif (p.21) — screenshots supplied directly by the project owner, 2026-08-20.
- Cross-checked against `aptos-labs/explorer` (MIT-licensed, live repo): `app/themes/colors/aptosBrandColors.ts`, `app/themes/typography.ts`, `app/themes/theme.ts`, `app/themes/colors/aptosBrandColors.a11y.test.ts` — independently confirms all 11 raw hex values and supplies the tested a11y-derived semantic colors.
- Full detail: `references/tokens.json`.
