---
name: get-proposal
description: Fetch one Aptos governance proposal by numeric id, including description and vote breakdown.
---

# Get an Aptos governance proposal

Use this skill when the user names a proposal id or wants details for a single AIP.

## HTTP

`GET /api/proposals/{proposalId}`

Votes page: `GET /api/proposals/{proposalId}/votes?page=0`

Human page: `/proposal/{proposalId}`

## MCP

Call tool `get_proposal` with `{ "proposalId": "<id>" }`.
