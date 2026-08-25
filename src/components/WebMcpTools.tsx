import {useEffect} from "react";

type JsonSchema = {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
};

type ModelContext = {
  registerTool: (
    tool: WebMcpTool,
    options?: {signal?: AbortSignal},
  ) => Promise<unknown> | unknown;
  provideContext?: (input: {tools: WebMcpTool[]}) => Promise<unknown> | unknown;
};

function getModelContext(): ModelContext | undefined {
  const nav = navigator as Navigator & {modelContext?: ModelContext};
  const doc = document as Document & {modelContext?: ModelContext};
  return nav.modelContext ?? doc.modelContext;
}

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }
  return response.json();
}

const TOOLS: WebMcpTool[] = [
  {
    name: "list_proposals",
    description:
      "List on-chain Aptos Improvement Proposals, newest first. Optional 0-based page.",
    inputSchema: {
      type: "object",
      properties: {
        page: {type: "integer", minimum: 0, default: 0},
      },
      additionalProperties: false,
    },
    execute: async ({page}) => {
      const param = typeof page === "number" ? page : 0;
      return fetchJson(`/api/proposals?page=${param}`);
    },
  },
  {
    name: "get_proposal",
    description: "Fetch one Aptos governance proposal by numeric id.",
    inputSchema: {
      type: "object",
      properties: {
        proposalId: {type: "string", description: "Non-negative integer id"},
      },
      required: ["proposalId"],
      additionalProperties: false,
    },
    execute: async ({proposalId}) => {
      return fetchJson(`/api/proposals/${String(proposalId)}`);
    },
  },
  {
    name: "open_proposal",
    description:
      "Navigate this page to a proposal's human-readable detail view.",
    inputSchema: {
      type: "object",
      properties: {
        proposalId: {type: "string"},
      },
      required: ["proposalId"],
      additionalProperties: false,
    },
    execute: async ({proposalId}) => {
      const href = `/proposal/${String(proposalId)}`;
      window.location.assign(href);
      return {ok: true, href};
    },
  },
];

/**
 * Registers WebMCP tools on load. Detected by agent scanners that
 * execute the homepage in a browser (navigator.modelContext / document.modelContext).
 */
export function WebMcpTools() {
  useEffect(() => {
    const context = getModelContext();
    if (!context) return;
    const abort = new AbortController();

    void (async () => {
      try {
        if (typeof context.provideContext === "function") {
          await context.provideContext({tools: TOOLS});
        }
      } catch {
        // Older previews only implement registerTool.
      }
      for (const tool of TOOLS) {
        if (abort.signal.aborted) return;
        try {
          await context.registerTool(tool, {signal: abort.signal});
        } catch {
          // Browser has no WebMCP — ignore.
        }
      }
    })();

    return () => abort.abort();
  }, []);

  return null;
}
