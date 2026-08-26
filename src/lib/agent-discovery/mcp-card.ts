import {absoluteUrl} from "~/lib/agent-discovery/origin";

export const APP_VERSION = "1.0.0";

export function buildMcpServerCard(origin: string) {
  return {
    $schema:
      "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
    version: "1.0",
    protocolVersion: "2025-06-18",
    serverInfo: {
      name: "aptos-governance",
      title: "Aptos Governance",
      version: APP_VERSION,
      description:
        "Read on-chain Aptos Improvement Proposals, vote tallies, and voter breakdowns.",
      homepage: origin,
    },
    transport: {
      type: "streamable-http",
      endpoint: "/mcp",
    },
    capabilities: {
      tools: {listChanged: false},
      resources: {subscribe: false, listChanged: false},
      prompts: {listChanged: false},
    },
    authentication: {
      required: false,
      schemes: [],
    },
    instructions:
      "Use list_proposals to browse AIPs and get_proposal for a single proposal id. Voting is on-chain via an Aptos wallet, not this MCP server.",
    tools: "dynamic",
    resources: "dynamic",
    prompts: "dynamic",
  };
}

export function buildMcpJson(origin: string) {
  return {
    $schema:
      "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
    name: "aptos-governance",
    description:
      "Read on-chain Aptos Improvement Proposals, vote tallies, and voter breakdowns.",
    version: APP_VERSION,
    remotes: [
      {
        type: "streamable-http",
        url: absoluteUrl(origin, "/mcp"),
      },
    ],
  };
}
