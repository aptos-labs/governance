import {jsonResponse} from "~/lib/agent-discovery/http";
import {APP_VERSION} from "~/lib/agent-discovery/mcp-card";
import {publicOrigin} from "~/lib/agent-discovery/origin";
import {loadProposalDetail} from "~/lib/governance/fetch-proposal";
import {loadProposalListPage} from "~/lib/governance/fetch-proposals";
import {proposalToJson} from "~/lib/governance/json";

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

const TOOLS = [
  {
    name: "list_proposals",
    description:
      "List on-chain Aptos Improvement Proposals, newest first. Optional page (0-based).",
    inputSchema: {
      type: "object",
      properties: {
        page: {type: "integer", minimum: 0, default: 0},
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_proposal",
    description: "Get one Aptos governance proposal by numeric id.",
    inputSchema: {
      type: "object",
      properties: {
        proposalId: {type: "string", description: "Non-negative integer id"},
      },
      required: ["proposalId"],
      additionalProperties: false,
    },
  },
];

function rpcResult(id: JsonRpcRequest["id"], result: unknown): Response {
  return jsonResponse({jsonrpc: "2.0", id: id ?? null, result});
}

function rpcError(
  id: JsonRpcRequest["id"],
  code: number,
  message: string,
): Response {
  return jsonResponse({
    jsonrpc: "2.0",
    id: id ?? null,
    error: {code, message},
  });
}

function textResult(id: JsonRpcRequest["id"], payload: unknown): Response {
  return rpcResult(id, {
    content: [{type: "text", text: JSON.stringify(payload, null, 2)}],
    structuredContent: payload,
  });
}

async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (name === "list_proposals") {
    const page = typeof args.page === "number" ? args.page : 0;
    const result = await loadProposalListPage(page);
    return {
      items: result.items.map(proposalToJson),
      totalCount: result.totalCount,
      page: result.page,
      pageSize: result.pageSize,
    };
  }
  if (name === "get_proposal") {
    const proposalId = String(args.proposalId ?? "");
    const result = await loadProposalDetail(proposalId, 0);
    return {proposal: proposalToJson(result.proposal)};
  }
  throw new Error(`Unknown tool: ${name}`);
}

export async function handleMcp(request: Request): Promise<Response> {
  const origin = publicOrigin(request);
  if (request.method === "GET" || request.method === "HEAD") {
    return jsonResponse({
      protocolVersion: "2025-06-18",
      serverInfo: {name: "aptos-governance", version: APP_VERSION},
      transport: "streamable-http",
      endpoint: `${origin}/mcp`,
    });
  }

  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  const method = body.method ?? "";
  const id = body.id ?? null;

  if (method === "initialize") {
    return rpcResult(id, {
      protocolVersion: "2025-06-18",
      capabilities: {tools: {}, resources: {}, prompts: {}},
      serverInfo: {
        name: "aptos-governance",
        version: APP_VERSION,
      },
      instructions:
        "Read-only Aptos governance tools. Use list_proposals and get_proposal.",
    });
  }

  if (method === "notifications/initialized" || method === "ping") {
    return rpcResult(id, {});
  }

  if (method === "tools/list") {
    return rpcResult(id, {tools: TOOLS});
  }

  if (method === "resources/list") {
    return rpcResult(id, {resources: []});
  }

  if (method === "prompts/list") {
    return rpcResult(id, {prompts: []});
  }

  if (method === "tools/call") {
    const params = (body.params ?? {}) as {
      name?: string;
      arguments?: Record<string, unknown>;
    };
    const name = params.name ?? "";
    try {
      const payload = await callTool(name, params.arguments ?? {});
      return textResult(id, payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tool failed";
      return rpcError(id, -32000, message);
    }
  }

  return rpcError(id, -32601, `Method not found: ${method}`);
}
