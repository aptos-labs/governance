import {absoluteUrl} from "~/lib/agent-discovery/origin";

export function buildOpenApiDocument(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Aptos Governance API",
      version: "1.0.0",
      description:
        "Public read API for on-chain Aptos Improvement Proposals. Voting remains wallet-signed on chain.",
    },
    servers: [{url: origin, description: "This deployment"}],
    paths: {
      "/api/health": {
        get: {
          operationId: "getHealth",
          summary: "Liveness and discovery pointers",
          responses: {
            "200": {
              description: "Service is up",
              content: {
                "application/json": {
                  schema: {type: "object", additionalProperties: true},
                },
              },
            },
          },
        },
      },
      "/api/proposals": {
        get: {
          operationId: "listProposals",
          summary: "List proposals, newest first",
          parameters: [
            {
              name: "page",
              in: "query",
              schema: {type: "integer", minimum: 0, default: 0},
            },
          ],
          responses: {
            "200": {
              description: "Paginated proposal list",
              content: {
                "application/json": {
                  schema: {type: "object", additionalProperties: true},
                },
              },
            },
          },
        },
      },
      "/api/proposals/{proposalId}": {
        get: {
          operationId: "getProposal",
          summary: "Get one proposal",
          parameters: [
            {
              name: "proposalId",
              in: "path",
              required: true,
              schema: {type: "string", pattern: "^[0-9]+$"},
            },
          ],
          responses: {
            "200": {description: "Proposal detail"},
            "404": {description: "Unknown proposal id"},
          },
        },
      },
      "/api/proposals/{proposalId}/votes": {
        get: {
          operationId: "listProposalVotes",
          summary: "Paginated per-pool votes for a proposal",
          parameters: [
            {
              name: "proposalId",
              in: "path",
              required: true,
              schema: {type: "string", pattern: "^[0-9]+$"},
            },
            {
              name: "page",
              in: "query",
              schema: {type: "integer", minimum: 0, default: 0},
            },
          ],
          responses: {
            "200": {description: "Vote page"},
          },
        },
      },
    },
  };
}

export function buildApiDocsMarkdown(origin: string): string {
  return `# Aptos Governance API

Public JSON API for on-chain Aptos Improvement Proposals (AIPs). HTML UI: ${origin}/

## Authentication

Read endpoints are public. Voting is **not** exposed here: users sign \`0x1::aptos_governance\` transactions in a wallet. Agent registration: ${origin}/auth.md

## Endpoints

- \`GET /api/health\` — liveness
- \`GET /api/proposals?page=0\` — newest-first list (20 per page)
- \`GET /api/proposals/{id}\` — one proposal plus first votes page
- \`GET /api/proposals/{id}/votes?page=0\` — voter breakdown

OpenAPI: ${origin}/openapi.json

## MCP

Streamable HTTP: \`POST ${origin}/mcp\`
Server card: ${origin}/.well-known/mcp/server-card.json

## Discovery

- API catalog: ${origin}/.well-known/api-catalog
- ARD catalog: ${origin}/.well-known/ai-catalog.json
- Skills: ${origin}/.well-known/agent-skills/index.json
`;
}

export function buildApiDocsHtml(origin: string): string {
  const md = buildApiDocsMarkdown(origin);
  const escaped = md
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>Aptos Governance API</title>
  <link rel="service-desc" href="/openapi.json" type="application/json"/>
  <link rel="api-catalog" href="/.well-known/api-catalog"/>
</head>
<body>
  <main>
    <pre>${escaped}</pre>
  </main>
</body>
</html>
`;
}
