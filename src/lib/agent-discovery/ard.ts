import {absoluteUrl} from "~/lib/agent-discovery/origin";

const HOST = "governance.aptosfoundation.org";

export function buildArdCatalog(origin: string) {
  return {
    specVersion: "1.0",
    host: {
      displayName: "Aptos Governance",
      identifier: `did:web:${HOST}`,
    },
    entries: [
      {
        identifier: `urn:air:${HOST}:server:mcp`,
        displayName: "Aptos Governance MCP server",
        type: "application/mcp-server-card+json",
        url: absoluteUrl(origin, "/.well-known/mcp/server-card.json"),
        representativeQueries: [
          "list open Aptos improvement proposals",
          "get the current yes and no votes for a proposal",
          "what is the status of Aptos governance proposal 80",
        ],
      },
      {
        identifier: `urn:air:${HOST}:api:proposals`,
        displayName: "Aptos Governance REST API",
        type: "application/vnd.oai.openapi+json",
        url: absoluteUrl(origin, "/openapi.json"),
        representativeQueries: [
          "fetch the latest on-chain Aptos proposals as JSON",
          "look up a governance proposal by numeric id",
          "check whether the governance API is healthy",
        ],
      },
      {
        identifier: `urn:air:${HOST}:skill:list-proposals`,
        displayName: "List Aptos governance proposals skill",
        type: "text/markdown",
        url: absoluteUrl(
          origin,
          "/.well-known/agent-skills/list-proposals/SKILL.md",
        ),
        representativeQueries: [
          "how do I list Aptos governance proposals as an agent",
          "what HTTP API returns current AIPs",
        ],
      },
      {
        identifier: `urn:air:${HOST}:docs:auth`,
        displayName: "Agent registration (auth.md)",
        type: "text/markdown",
        url: absoluteUrl(origin, "/auth.md"),
        representativeQueries: [
          "how do agents authenticate to Aptos Governance",
          "register an agent for the governance API",
        ],
      },
    ],
  };
}
