export type ApiKeyKind = "server" | "client" | "unknown" | "none";

export interface ResolvedApiKey {
  key?: string;
  source?: string;
  kind: ApiKeyKind;
}

export interface ResolvedApiConfig extends ResolvedApiKey {
  apiKey?: string;
  fullnodeUrl?: string;
  indexerUrl: string;
}

const DEFAULT_INDEXER_URL = "https://api.mainnet.aptoslabs.com/v1/graphql";

/** Unprefixed names — available to Vercel serverless at runtime, never
 *  inlined into the browser bundle. Use a Geomi *server* key
 *  (`aptoslabs_…`) here. */
const SERVER_KEY_ENV_NAMES = [
  "APTOS_BUILD_API_KEY",
  "GEOMI_API_KEY",
  "APTOS_API_KEY",
] as const;

/** Vite-prefixed names — inlined into the public client bundle. Use a
 *  Geomi *client* key (`AG-…`) here so the browser Origin check works. */
const CLIENT_KEY_ENV_NAMES = [
  "VITE_APTOS_API_KEY",
  "VITE_APTOS_API_KEY_MAINNET",
  "VITE_GEOMI_API_KEY",
] as const;

/**
 * Vite only inlines `import.meta.env.VITE_*` for *static* property
 * access. Dynamic `import.meta.env[name]` is undefined in the built
 * bundle.
 */
const VITE_ENV: Record<string, string | undefined> = {
  VITE_APTOS_API_KEY: import.meta.env.VITE_APTOS_API_KEY,
  VITE_APTOS_API_KEY_MAINNET: import.meta.env.VITE_APTOS_API_KEY_MAINNET,
  VITE_GEOMI_API_KEY: import.meta.env.VITE_GEOMI_API_KEY,
  VITE_GEOMI_FULLNODE_URL: import.meta.env.VITE_GEOMI_FULLNODE_URL,
  VITE_GEOMI_INDEXER_URL: import.meta.env.VITE_GEOMI_INDEXER_URL,
};

function trimEnv(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function readEnv(name: string): string | undefined {
  return trimEnv(process.env[name]) ?? trimEnv(VITE_ENV[name]);
}

export function classifyApiKey(key: string | undefined): ApiKeyKind {
  if (!key) return "none";
  if (key.startsWith("aptoslabs_")) return "server";
  if (key.startsWith("AG-")) return "client";
  return "unknown";
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function resolveApiKey(): ResolvedApiKey {
  const names = isBrowser() ? CLIENT_KEY_ENV_NAMES : SERVER_KEY_ENV_NAMES;
  const expectedKind: ApiKeyKind = isBrowser() ? "client" : "server";
  let firstWrongKind: ResolvedApiKey | undefined;
  for (const source of names) {
    const key = readEnv(source);
    if (!key) continue;
    const kind = classifyApiKey(key);
    if (kind === expectedKind) {
      return {key, source, kind};
    }
    firstWrongKind ??= {key, source, kind};
  }
  return firstWrongKind ?? {kind: "none"};
}

/**
 * Key attached to outgoing Aptos/Geomi requests. Backend keys stay on
 * the server; frontend keys stay in the browser. Mixing them is what
 * 401'd SSR (`Origin header is required` for `AG-…` keys) and would
 * leak an `aptoslabs_…` secret if inlined.
 */
export function outgoingApiKey(resolved: ResolvedApiKey): string | undefined {
  if (!resolved.key) return undefined;
  if (isBrowser()) {
    return resolved.kind === "client" ? resolved.key : undefined;
  }
  return resolved.kind === "server" ? resolved.key : undefined;
}

export function aptosRequestHeaders(
  config: ResolvedApiConfig,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  return headers;
}

let loggedApiKey = false;

export function logResolvedApiKey(resolved: ResolvedApiKey): void {
  if (loggedApiKey || process.env.VITEST) return;
  loggedApiKey = true;
  const side = isBrowser() ? "frontend" : "backend";
  if (resolved.kind === "none") {
    console.warn(
      isBrowser()
        ? "[aptos] No frontend API key found. Set VITE_APTOS_API_KEY to a Geomi client key (AG-…) for browser Aptos calls."
        : "[aptos] No backend API key found. Set APTOS_BUILD_API_KEY to a Geomi server key (aptoslabs_…) on Vercel to avoid public-endpoint rate limits.",
    );
    return;
  }
  const outgoing = outgoingApiKey(resolved);
  if (!outgoing) {
    console.warn(
      `[aptos] Ignoring ${resolved.kind} API key from ${resolved.source} on the ${side}. Use aptoslabs_… as APTOS_BUILD_API_KEY (server) and AG-… as VITE_APTOS_API_KEY (browser).`,
    );
    return;
  }
  console.info(
    `[aptos] Using ${side} ${resolved.kind} API key from ${resolved.source}`,
  );
}

export function resolveApiConfig(): ResolvedApiConfig {
  const resolved = resolveApiKey();
  return {
    ...resolved,
    apiKey: outgoingApiKey(resolved),
    fullnodeUrl:
      readEnv("APTOS_FULLNODE_URL") || readEnv("VITE_GEOMI_FULLNODE_URL"),
    indexerUrl:
      readEnv("APTOS_INDEXER_URL") ||
      readEnv("VITE_GEOMI_INDEXER_URL") ||
      DEFAULT_INDEXER_URL,
  };
}
