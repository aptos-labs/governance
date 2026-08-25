---
name: list-proposals
description: List on-chain Aptos Improvement Proposals (AIPs) with status, tallies, and pagination.
---

# List Aptos governance proposals

Use this skill when the user wants a catalog of current or historical Aptos on-chain proposals.

## HTTP

`GET /api/proposals?page=0`

Response fields include `proposalId`, `status` (`active` | `passed` | `executed` | `failed`), `yesVotes`, `noVotes`, and verified off-chain metadata when the on-chain hash matches.

## MCP

Call tool `list_proposals` on the Streamable HTTP MCP server at `/mcp`.

## WebMCP

On the governance homepage, the browser tool `list_proposals` returns the same JSON.
